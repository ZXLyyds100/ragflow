# Self-review — image PaddleOCR selection (#21030)

## Repository / contribution gates

- Account `ZXLyyds100`; feature branch isolated from the previous PDF/title work.
- Base `543e16738b4883fcb7e70520e0b5849e7e18c9b7`.
- Read root and web AGENTS, contributing guide, PR template, and the actual
  affected paths. No additional nested AGENTS. Root's web/CLAUDE reference does
  not exist; current web/AGENTS was followed.
- Compared merged #20683 and #20531, including their human feedback: preserve
  one VLM permission source, reuse current model resolution/drivers, keep
  provider-management semantics unchanged, disclose live versus fixture scope.
- Issue created and labeled by project MEMBER jay77721 with explicit acceptance
  criteria. Full comments/timeline empty except the feature-label event.
- Checked linked and semantic competition: all 163 PaddleOCR matches and all 204
  image/OCR matches (all pages), then publication-time recheck. Earlier closed
  image support predates the current OCR/VLM contract; main still lacks the
  feature. Other open parser PRs have distinct scopes. No claim comment posted.

## Pass 1: config and execution trace

Traced ImageFormFields -> Zod schema -> transformParserParams ->
transformApiConfigToForm -> builtin BuildParserConfig -> actual SQLite
Knowledgebase JSON persistence -> Parser -> selected tenant-model ID resolver ->
existing PaddleOCR local/cloud OCRFile -> image item -> decorated OneChunker ->
image upload -> Tokenizer and embedding input.

Findings fixed before publication:

- Merely adding a picker would lose ocr_model_id in transformParserParams.
  Added red/green regression and actual save/load transformation roundtrip.
- Cloud upload previously named every byte payload document.pdf.
  Image filename now follows bytes while keeping existing PDF behavior.
- Explicit selection must not fall back to catalog-only composites, a different
  instance, tenant default, global server URL, or DeepDoc. Uses enrolled ID and
  real model/type/status/ownership resolution; additionally checks active
  instance and matching provider relationship.
- Local selected algorithm is the selected model name, not an unrelated global
  algorithm environment value. Existing nested provider JSON and credential
  rotation remain usable.

## Pass 2: boundaries, failures and regression risk

- Re-read all production changes and new tests.
- OCR switch and VLM switch are independent. Selection does not reintroduce
  parse_method's former VLM meaning or grant VLM permission.
- Off/on keeps the selected ID. Empty/omitted selection stays local. SVG text
  remains direct; neither PaddleOCR nor VLM receives raw SVG.
- Wrong tenant, missing/disabled model, wrong model type, disabled/mismatched
  instance and unsupported driver are rejected before a request. Cloud SSRF
  policy is retained; self-hosted local driver keeps its existing transport.
- Failure retains original image and enters the real Parser progress warning
  channel; no silent fallback text. Cancellation still reaches the existing
  context checks and driver requests.
- Native raster decoding is not needed for the selected driver, but byte and
  dimension admission checks still run.
- Caught TIFF's absence from net/http MIME sniffing; added both TIFF byte-order
  signatures and regressions so it is not mislabeled PDF.
- No shared UI primitive, Python code, model-provider registry, workflow, Docker
  configuration, deployment, credential, or user service changed.
- Real-browser checks cover both source checkouts, save/reload, filtering,
  cloud selection, clear-to-local, OCR/VLM toggles, and 390px overflow.

## Verification boundaries

- Go commands run through unchanged build.sh, in the previously prepared
  isolated native environment. PCRE2 uses a path-only Go overlay; genuine ORT
  1.29.0 / PDF 0.3.73 shared libraries and the real prebuilt tokenizer archive
  are reused. Original macOS static linking is not verified.
- Default-unit fixtures use SQLite/httptest, not live OCR/embedding/object
  storage. Pipeline regression exercises real persistence and component
  implementations; this is not a production deployment/index retrieval test.
- Screenshot page contains real source ImageFormFields and vision fields, with
  clearly labeled local model-list/save API fixtures and separately captured
  actual Go runtime results. It is not the full deployed product.
- Full frontend Jest was attempted on both trees: same six failing suites,
  then the same Request-is-not-defined jsdom termination. It is not a passing
  full suite. Relevant suites pass.
- Full TypeScript check has 206 pre-existing diagnostics on both trees; compare
  diagnostic multiplicity after normalizing shifted line/column positions.
  No newly introduced diagnostic remains.
- Production frontend build and full-source oxlint pass. Only changed frontend
  files are formatted; no unrelated baseline cleanup.

No unresolved finding in this issue's implemented scope remains after the two
self-review passes. External CI and maintainer review must be reported separately.
