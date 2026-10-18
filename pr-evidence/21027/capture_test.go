package evidence

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"ragflow/internal/common"
	"ragflow/internal/entity"
	"ragflow/internal/ingestion/component"
	"ragflow/internal/ingestion/pipeline"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// TestCaptureTenantParser uses the actual exported Parser component, existing
// template cleaning, a real in-memory SQL database and local protocol stubs.
// No renderer, dispatcher, model resolver or parser implementation is replaced.
func TestCaptureTenantParser(t *testing.T) {
	var input struct {
		Provider  string `json:"provider"`
		Reference string `json:"reference"`
	}
	if err := json.Unmarshal([]byte(os.Getenv("TENANT_PARSER_CASE")), &input); err != nil {
		t.Fatal(err)
	}
	if input.Provider != "SoMark" && input.Provider != "OpenDataLoader" {
		t.Fatal("unknown fixture provider")
	}
	previous := common.AllowAnyHostForTest
	common.AllowAnyHostForTest = true
	t.Cleanup(func() { common.AllowAnyHostForTest = previous })
	var mu sync.Mutex
	requests := []map[string]any{}
	newServer := func(instance string) *httptest.Server {
		return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if strings.Contains(r.Header.Get("Content-Type"), "multipart") {
				if err := r.ParseMultipartForm(1 << 20); err != nil {
					http.Error(w, "fixture form error", 400)
					return
				}
				defer r.MultipartForm.RemoveAll()
			} else {
				_ = r.ParseForm()
			}
			keyMatches := r.FormValue("api_key") == "fixture-key-"+instance
			if input.Provider == "OpenDataLoader" {
				keyMatches = r.Header.Get("Authorization") == "Bearer fixture-key-"+instance
			}
			mu.Lock()
			requests = append(requests, map[string]any{
				"instance": instance, "method": r.Method, "path": r.URL.Path,
				"fixture_credential_matched": keyMatches,
			})
			mu.Unlock()
			w.Header().Set("Content-Type", "application/json")
			switch r.URL.Path {
			case "/parse/async":
				_, _ = w.Write([]byte(`{"code":0,"data":{"task_id":"fixture-task"}}`))
			case "/parse/async_check":
				_, _ = w.Write([]byte(`{"code":0,"data":{"status":"SUCCESS","result":{"outputs":{"json":{"pages":[{"blocks":[{"type":"text","content":"Parsed by selected SoMark instance B."}]}]}}}}}`))
			case "/file_parse":
				_, _ = w.Write([]byte(`{"json_doc":{"type":"text","content":"Parsed by selected OpenDataLoader instance B."}}`))
			default:
				http.Error(w, "unexpected fixture route", 404)
			}
		}))
	}
	a, b := newServer("A"), newServer("B")
	defer a.Close()
	defer b.Close()
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
	if err := db.Create(&entity.TenantModelProvider{ID: "fixture-provider", ProviderName: input.Provider, TenantID: "fixture-tenant"}).Error; err != nil {
		t.Fatal(err)
	}
	for _, instance := range []struct{ id, url string }{{"A", a.URL}, {"B", b.URL}} {
		key := "fixture-key-" + instance.id
		extra := fmt.Sprintf(`{"base_url":%q}`, instance.url)
		if input.Provider == "OpenDataLoader" {
			key = fmt.Sprintf(`{"opendataloader_apiserver":%q,"opendataloader_api_key":%q}`, instance.url, key)
			extra = "{}"
		}
		for _, row := range []any{
			&entity.TenantModelInstance{ID: "fixture-instance-" + instance.id, ProviderID: "fixture-provider",
				InstanceName: instance.id, APIKey: key, Extra: extra, Status: "active"},
			&entity.TenantModel{ID: "fixture-model-" + instance.id, ProviderID: "fixture-provider", InstanceID: "fixture-instance-" + instance.id,
				ModelName: input.Provider + "-model", ModelType: int(entity.ModelTypeOCR), Status: "active", Extra: "{}"},
		} {
			if err := db.Create(row).Error; err != nil {
				t.Fatal(err)
			}
		}
	}
	ref := "fixture-model-B"
	if input.Reference == "composite" {
		ref = input.Provider + "-model@B@" + input.Provider
	}
	template, err := os.ReadFile("internal/ingestion/pipeline/template/ingestion_pipeline_general.json")
	if err != nil {
		t.Fatal(err)
	}
	var tpl struct {
		DSL struct {
			Components map[string]struct {
				Obj struct {
					ComponentName string `json:"component_name"`
				} `json:"obj"`
			} `json:"components"`
		} `json:"dsl"`
	}
	if err := json.Unmarshal(template, &tpl); err != nil {
		t.Fatal(err)
	}
	parserID := ""
	for id, node := range tpl.DSL.Components {
		if node.Obj.ComponentName == "Parser" {
			parserID = id
			break
		}
	}
	if parserID == "" {
		t.Fatal("no Parser in actual builtin template")
	}
	var rawTemplate struct {
		DSL json.RawMessage `json:"dsl"`
	}
	if err := json.Unmarshal(template, &rawTemplate); err != nil {
		t.Fatal(err)
	}
	cleaned := pipeline.CleanComponentParams(rawTemplate.DSL, map[string]any{
		parserID: map[string]any{"pdf": map[string]any{"parse_method": ref, "output_format": "json"}},
	})
	if cleaned[parserID] == nil {
		t.Fatal("actual template cleaning dropped Parser config")
	}
	saved, _ := json.Marshal(cleaned[parserID])
	var params map[string]any
	if err := json.Unmarshal(saved, &params); err != nil {
		t.Fatal(err)
	}
	c, err := component.NewParserComponent(params)
	if err != nil {
		t.Fatal(err)
	}
	ctx, cancel := context.WithTimeout(t.Context(), 10*time.Second)
	defer cancel()
	output, runErr := c.Invoke(ctx, db, map[string]any{
		"name": "reference-fixture.pdf", "binary": fixturePDF(), "file_type": "pdf", "tenant_id": "fixture-tenant",
	})
	current, _ := json.Marshal(params)
	mu.Lock()
	captured := append([]map[string]any{}, requests...)
	mu.Unlock()
	errText := ""
	if runErr != nil {
		errText = runErr.Error()
	}
	result := map[string]any{
		"provider": input.Provider, "referenceForm": input.Reference,
		"savedParams": params, "savedConfigurationUnchanged": bytes.Equal(saved, current),
		"requests": captured, "error": errText, "output": output,
		"scope": "Actual Go Parser/template cleaning/SQL lookup; local in-memory DB and OCR protocol fixtures. No production OCR/LLM.",
	}
	raw, err := json.Marshal(result)
	if err != nil {
		t.Fatal(err)
	}
	fmt.Println("EVIDENCE_JSON:" + string(raw))
}

// fixturePDF follows the repository's minimal PDF fixture construction. It is
// valid input to the original generic vision renderer, not an invalid-file stub.
func fixturePDF() []byte {
	content := "BT /F1 24 Tf 72 700 Td (Tenant parser reference fixture) Tj ET"
	objects := []string{
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [4 0 R] /Count 1 >>",
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents 5 0 R >>",
		fmt.Sprintf("<< /Length %d >>\nstream\n%s\nendstream", len(content), content),
	}
	var buf bytes.Buffer
	buf.WriteString("%PDF-1.4\n")
	offsets := make([]int, len(objects))
	for i, obj := range objects {
		offsets[i] = buf.Len()
		fmt.Fprintf(&buf, "%d 0 obj\n%s\nendobj\n", i+1, obj)
	}
	xref := buf.Len()
	fmt.Fprintf(&buf, "xref\n0 %d\n0000000000 65535 f \n", len(objects)+1)
	for _, off := range offsets {
		fmt.Fprintf(&buf, "%010d 00000 n \n", off)
	}
	fmt.Fprintf(&buf, "trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n", len(objects)+1, xref)
	return buf.Bytes()
}
