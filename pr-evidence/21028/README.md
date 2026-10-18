# MinerU extraction controls: verification evidence

Issue: infiniflow/ragflow#21028.

- Baseline: `543e16738b4883fcb7e70520e0b5849e7e18c9b7`
- Fixed source: `bcfa94f6e227342a0fe8cd2af1cbe1ec564bc904`

These files live on a fork-only evidence branch and are not part of the code PR.

## Before and after

The browser renders the repository's actual `PdfFormFields`, schema and save/load
transforms. Only the tenant-model list and persistence API are local fixtures.
The wrapper is an integration harness, not a production RAGFlow deployment.
The model UUID, tenant and credentials are fictitious. No live OCR inference
or external database validation is claimed.

- `before-settings.png`: a UUID-selected MinerU has no MinerU option controls.
- `before-save-drops-controls.png` / `before-saved-config.json`: saving loses
  formula/table choices and the dedicated parse-method/language fields.
- `after-save-reload.png` / `after-saved-config.json`: explicit false/false
  survives schema validation, save and reload.
- `after-independent-switches.png` / `after-independent-config.json`: true/false
  survives independently.
- `mineru-save-reload.webm`: real browser actions for both-off and independent
  choices; the two reload states are asserted during recording.

Request-level proof comes from the Go regressions, not inferred screenshot
contents. `go-regression-before.txt` records the actual old multipart bug
(`true true` despite false). `go-race.txt` and `go-related-suites.txt` record
passing final tests.

## Validation

The committed tests cover 63 backend/formula/table combinations, 10 malformed
option types, five V1 rejection combinations, four V1 default/enabled
combinations and 18 serialized configuration normalization cases. V1 tests
assert no upload/job submission when a control cannot be honored.

- All ingestion, model and parser unit packages passed, plus the native unit
  tier invoked by `build.sh`.
- Final focused Go tests passed with `-race`.
- Nine related frontend suites passed: 108 tests.
- Frontend production build, scoped formatter/linter and repository hooks
  passed.
- Full frontend suite is **not green**: original and fixed source fail in the
  same six unrelated suites and then abort on `Request is not defined`.
- Type checking is **not green**: 206 original diagnostics remain identical
  after normalizing line/column shifts, with no added diagnostics.

See `validation.json` and the original command logs for exact boundaries.

### macOS native dependency limitation

The repository's unmodified macOS static-link configuration fails before
tests: its PCRE2 path assumes a global Homebrew installation, its ORT static
archive has unresolved symbols, and bundled PDF/office static libraries
conflict. No repository build script or production dependency was changed.

Local Go validation still used `bash build.sh --test`, with a Go overlay
changing only the absolute PCRE2 link path and a local compiler adapter
linking genuine same-version libraries: Microsoft ORT 1.29.0 and a shared
PDF 0.3.73 library built from the real archive with only its C API exported.
All Go logic, package selection and tests remained unchanged. This is
**not a claim that the original static-link setup passes**; Linux/static
validation remains subject to upstream CI.

## Replay the browser fixture

Use Node and the frontend dependencies required by the checked-out repository:

```sh
cd web
npm ci
cd ..
node pr-evidence/21028/start-harness.mjs
```

Open `http://127.0.0.1:51829/`. Reset, save and reload; then enable only the
formula switch, save and reload again. The right panel is the fixture's actual
saved request body. The server binds only to loopback.

To compare another checkout without changing this branch:

```sh
RAGFLOW_WEB_DIR=/absolute/path/to/other-checkout/web \
  node pr-evidence/21028/start-harness.mjs
```

The fixture is intentionally omitted from the code PR; its API does not
implement authentication or model inference.

## Replay repository tests

On a repository-supported native build environment with its required
dependencies provisioned:

```sh
bash build.sh --test ./internal/ingestion/... ./internal/entity/models/... ./internal/parser/...
bash build.sh --test -race -run 'TestMinerU(Extraction|V1)|TestBuildParserConfigPreservesMinerU' ./internal/ingestion/component ./internal/ingestion/pipeline
cd web
npx jest --runInBand --coverage=false src/pages/agent/form/parser-form src/pages/agent/utils.test.ts src/utils/__tests__/pipeline-operator.test.ts src/hooks/__tests__/parser-config-utils.test.ts src/components/layout-recognize-form-field.test.tsx
npm run build
```
