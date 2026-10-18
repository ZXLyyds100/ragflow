package evidence

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	"image/png"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"ragflow/internal/agent/runtime"
	deepdoctype "ragflow/internal/deepdoc/parser/type"
	"ragflow/internal/entity"
	"ragflow/internal/ingestion/component"
	"ragflow/internal/ingestion/component/chunker"
	"ragflow/internal/ingestion/pipeline"
	"ragflow/internal/parser/parser"
)

type localOCR struct {
	deepdoctype.DocAnalyzer
	calls *atomic.Int32
}

func (*localOCR) Health() bool { return true }
func (a *localOCR) OCRDetect(context.Context, image.Image) ([]deepdoctype.OCRBox, error) {
	a.calls.Add(1)
	return []deepdoctype.OCRBox{{X0: 1, Y0: 1, X1: 9, Y1: 1, X2: 9, Y2: 9, X3: 1, Y3: 9}}, nil
}
func (*localOCR) OCRRecognize(context.Context, image.Image) ([]deepdoctype.OCRText, error) {
	return []deepdoctype.OCRText{{Text: "LOCAL OCR fixture: selected model was ignored."}}, nil
}

type embedder struct{}

func (embedder) MaxTokens() int { return 2048 }
func (embedder) BatchSize() int { return 16 }
func (embedder) Encode(_ context.Context, texts []string) ([]component.EmbeddingResult, error) {
	results := make([]component.EmbeddingResult, len(texts))
	for i := range results {
		results[i] = component.EmbeddingResult{Vector: []float64{0.2, 0.8}, TokenCount: 8}
	}
	return results, nil
}

func TestCaptureImageOCR(t *testing.T) {
	var data bytes.Buffer
	if err := png.Encode(&data, image.NewRGBA(image.Rect(0, 0, 12, 12))); err != nil {
		t.Fatal(err)
	}
	var localCalls atomic.Int32
	oldFactory := deepdoctype.NativeDocAnalyzerFactory
	deepdoctype.NativeDocAnalyzerFactory = func() (deepdoctype.DocAnalyzer, bool) {
		return &localOCR{calls: &localCalls}, true
	}
	t.Cleanup(func() { deepdoctype.NativeDocAnalyzerFactory = oldFactory })
	requests := make(chan map[string]any, 4)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body map[string]any
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Error(err)
		}
		requests <- map[string]any{
			"path": r.URL.Path, "selectedInstance": "B",
			"credentialMatched": r.Header.Get("Authorization") == "Bearer fixture-key-B",
			"fileType":          body["fileType"], "algorithm": body["algorithm"],
			"imageBytesMatched": body["file"] == base64.StdEncoding.EncodeToString(data.Bytes()),
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = fmt.Fprint(w, `{"errorCode":0,"result":{"layoutParsingResults":[{"markdown":{"text":"PADDLE OCR fixture: invoice INV-21030 total 42."}}]}}`)
	}))
	defer server.Close()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	if err != nil {
		t.Fatal(err)
	}
	sqlDB, _ := db.DB()
	sqlDB.SetMaxOpenConns(1)
	defer sqlDB.Close()
	if err := db.AutoMigrate(&entity.TenantModelProvider{}, &entity.TenantModelInstance{}, &entity.TenantModel{}); err != nil {
		t.Fatal(err)
	}
	for _, row := range []any{
		&entity.TenantModelProvider{ID: "provider", TenantID: "fixture-tenant", ProviderName: "PaddleOCR.local"},
		&entity.TenantModelInstance{ID: "instance-B", ProviderID: "provider", InstanceName: "B",
			Status: "active", APIKey: "fixture-key-B", Extra: fmt.Sprintf(`{"base_url":%q}`, server.URL)},
		&entity.TenantModel{ID: "fixture-model-B", ProviderID: "provider", InstanceID: "instance-B",
			Status: "active", ModelName: "PP-OCRv6", ModelType: int(entity.ModelTypeOCR)},
	} {
		if err := db.Create(row).Error; err != nil {
			t.Fatal(err)
		}
	}
	registry, err := pipeline.DefaultRegistry()
	if err != nil {
		t.Fatal(err)
	}
	template, _ := registry.Get("picture")
	dsl, _ := json.Marshal(template.DSL)
	config := pipeline.BuildParserConfig(dsl, map[string]any{"Parser:ViewsCaptureLight": map[string]any{
		"image":                     map[string]any{"ocr_enabled": true, "ocr_model_id": "fixture-model-B", "output_format": "json"},
		"enable_vision_enhancement": false,
	}})
	saved, _ := json.Marshal(config)
	var reloaded entity.JSONMap
	if err := json.Unmarshal(saved, &reloaded); err != nil {
		t.Fatal(err)
	}
	params := reloaded["Parser:ViewsCaptureLight"].(map[string]any)
	c, err := component.NewParserComponent(params)
	if err != nil {
		t.Fatal(err)
	}
	inputs := map[string]any{"name": "invoice.png", "file_type": "image", "binary": data.Bytes(),
		"tenant_id": "fixture-tenant", "kb_id": "fixture-kb", "doc_id": "fixture-doc"}
	output, err := c.Invoke(t.Context(), db, inputs)
	if err != nil {
		t.Fatal(err)
	}
	items := parser.ItemsToMaps(output["json"].([]parser.DocItem))
	imagePreserved := items[0]["image"] == "data:image/png;base64,"+base64.StdEncoding.EncodeToString(data.Bytes())
	originalUploader := chunker.ChunkImageUploader
	uploaded := false
	chunker.ChunkImageUploader = func(_ context.Context, kbID, chunkID string, img []byte) (string, error) {
		uploaded = bytes.Equal(img, data.Bytes())
		return kbID + "-" + chunkID, nil
	}
	t.Cleanup(func() { chunker.ChunkImageUploader = originalUploader })
	factory, _, _, _ := runtime.DefaultRegistry.Lookup("OneChunker")
	one, err := factory("OneChunker", nil)
	if err != nil {
		t.Fatal(err)
	}
	for key, value := range output {
		inputs[key] = value
	}
	chunked, err := one.Invoke(t.Context(), db, inputs)
	if err != nil {
		t.Fatal(err)
	}
	tok, err := component.NewTokenizerComponentWithResolver(map[string]any{
		"search_method": []string{"embedding"}, "filename_embd_weight": 0,
	}, func(context.Context, string, string) (component.Embedder, string, error) {
		return embedder{}, "fixture-embedding", nil
	})
	if err != nil {
		t.Fatal(err)
	}
	for key, value := range chunked {
		inputs[key] = value
	}
	indexable, err := tok.Invoke(t.Context(), db, inputs)
	if err != nil {
		t.Fatal(err)
	}
	captured := []map[string]any{}
	for len(requests) > 0 {
		captured = append(captured, <-requests)
	}
	delete(items[0], "image")
	result := map[string]any{
		"scope":       "Same PNG, saved model ID B, tenant and switch settings. Real Parser/DAO/driver/OneChunker/Tokenizer. Inference, embedding and image storage are local fixtures, not live models.",
		"savedParams": params, "requests": captured, "localOCRCalls": localCalls.Load(),
		"parserItems": items, "warnings": output["warnings"], "imagePreserved": imagePreserved,
		"imageUploadedUnchanged": uploaded, "finalChunks": indexable["chunks"],
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("EVIDENCE_JSON:" + string(raw))
}
