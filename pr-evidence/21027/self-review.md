# Two-pass self-review

## 1. End-to-end execution

Traced persisted Parser setup → builtin config cleaning / JSON reload →
NewParserComponent / Invoke → PDF dispatch → actual tenant/provider/instance/
model DAO lookup → existing PDFParser → SoMark async submit/check or
OpenDataLoader file_parse → central structured output.

Do not use resolveModelConfig stubs to conceal missing Go drivers: main has
neither SoMark nor OpenDataLoader in conf/models. Reused real DAOs and the
already-owned parsers; no parallel OCR protocol implementation or dummy driver.
Captures compile an identical standalone test against main/final sources, with
valid PDF and no internal function replacements. Actual original failures are
wrong image2text model type / provider driver missing; no fixture request.
Final returns selected-instance-only real HTTP fixture calls and parsed text.

Verified explicit selectors never use provider's first instance. Reuses existing
PDF selector precedence. Cross-tenant access, mixed provider/instance IDs,
disabled instances/models, wrong type, malformed settings, endpoint missing
and optional anonymous key are tested with real stored rows.

Found and fixed during self-review:

- Selectors must share resolvePDFVisionModelID precedence; layout-first selection
  could otherwise hide the explicitly selected parse_method model.
- An empty selected key must not borrow global environment credentials. Added
  runtime-only PDFParser policy and tested named-engine behavior unchanged.
- SoMark explicit false options must not be overwritten by global env flags.
- Instance Extra can contain unrelated non-string values; decode only base_url
  instead of rejecting the whole Extra object. Credentials reject invalid types.
- Per-model SoMark format/feature options apply only to SoMark, not the other
  provider; explicit non-secret pipeline options win. Endpoint/key always come
  from the selected instance. Persisted setup is never mutated.

## 2. Boundaries, regression and publication

No frontend/UI primitives, Python, dependency/lock, database schema, migration,
workflow or existing template changes. Schema/config cleaning already accepts
the references; regression tests pin retention. No global credentials or driver
catalog expansion. Existing SSRF guard still rejects private-address targets;
httptest bypass is scoped to tests and restored.

SoMark polling/cancellation belongs to adjacent PR #21076 and is unchanged.
Local stubs respond SUCCESS immediately; no claim of real async OCR reliability.
Existing OpenDataLoader parser cancellation/timeouts also not expanded here.
No real OCR/LLM, production DB/MinIO, unmodified macOS static-link or Linux
hosted CI claim. Native link-only adaptations are documented in every run.

Focused, full ingestion/parser/DAO/common/utility suites and new race scenarios
have passed. Final full/race runs repeated after final test additions before
commit. Commit hooks must run; final tree must match the validated source.

Evidence page is explicitly a test viewer, not RAGFlow UI. Its requests/text are
read from actual exported-component captures, no hand-written expected success.
Final steps: review screenshot/video, competition audit, PR-first issue reply,
remote exact head/files/evidence, hosted review/check inspection and specific
responses. External maintainer approval remains pending, not an acceptance claim.
