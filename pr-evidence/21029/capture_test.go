package evidence

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"

	"ragflow/internal/agent/runtime"
	"ragflow/internal/ingestion/component/chunker"
	"ragflow/internal/ingestion/pipeline"
	"ragflow/internal/parser/tableutil"
)

// TestCaptureTitleContext runs real configuration cleaning and Go components.
// It needs no database, parser inference, object store or external service.
func TestCaptureTitleContext(t *testing.T) {
	var request struct {
		Template string         `json:"template"`
		Params   map[string]any `json:"params"`
	}
	if raw := os.Getenv("MEDIA_CONTEXT_JSON"); raw != "" {
		if err := json.Unmarshal([]byte(raw), &request); err != nil {
			t.Fatal(err)
		}
	} else {
		request.Template = "book"
		request.Params = map[string]any{"table_context_size": 32, "image_context_size": 64}
	}
	registry, err := pipeline.DefaultRegistry()
	if err != nil {
		t.Fatal(err)
	}
	tpl, ok := registry.Get(request.Template)
	if !ok {
		t.Fatal("unknown builtin template")
	}
	dsl, err := json.Marshal(tpl.DSL)
	if err != nil {
		t.Fatal(err)
	}
	specs, err := pipeline.ExtractAllComponentParams(dsl)
	if err != nil {
		t.Fatal(err)
	}
	table, err := tableutil.ParseTableHTML("<table><tr><th>Measure</th><th>Value</th></tr><tr><td>Recall</td><td>0.87</td></tr></table>")
	if err != nil {
		t.Fatal(err)
	}
	for _, spec := range specs {
		if spec.ComponentName != "TitleChunker" && spec.ComponentName != "ManualChunker" {
			continue
		}
		config := pipeline.BuildParserConfig(dsl, map[string]any{spec.CpnID: request.Params})
		params := config[spec.CpnID].(map[string]any)
		var comp runtime.Component
		if spec.ComponentName == "ManualChunker" {
			comp, err = chunker.NewManualChunker(params)
		} else {
			comp, err = chunker.NewTitleChunker(params)
		}
		if err != nil {
			t.Fatal(err)
		}
		items := []map[string]any{
			{"text": "# Measurements", "doc_type_kwd": "text"},
			{"text": "The experiment compares retrieval quality.", "doc_type_kwd": "text"},
			{"table": table, "doc_type_kwd": "table", "img_id": "fixture-table", "_pdf_positions": [][]float64{{1, 10, 300, 40, 80}}},
			{"text": "The table reports recall. The figure below explains the trend.", "doc_type_kwd": "text"},
			{"text": "Figure 1: Retrieval trend.", "doc_type_kwd": "image", "img_id": "fixture-figure", "_pdf_positions": [][]float64{{1, 10, 300, 120, 200}}},
			{"text": "Larger windows retain the surrounding explanation.", "doc_type_kwd": "text"},
		}
		out, err := comp.Invoke(t.Context(), nil, map[string]any{
			"name": request.Template + ".docx", "output_format": "json", "json": items,
		})
		if err != nil {
			t.Fatal(err)
		}
		if problem := out["_ERROR"]; problem != nil {
			t.Fatal(problem)
		}
		raw, err := json.Marshal(map[string]any{
			"template": request.Template, "component": spec.CpnID,
			"savedConfig": request.Params, "effectiveConfig": params, "source": items, "output": out,
			"scope": "Real Go template cleaning and title/manual invocation; source parser payload is a local fixture, no OCR/DB/storage/inference.",
		})
		if err != nil {
			t.Fatal(err)
		}
		fmt.Printf("EVIDENCE_JSON:%s\n", raw)
		return
	}
	t.Fatal("no title/manual component in template")
}
