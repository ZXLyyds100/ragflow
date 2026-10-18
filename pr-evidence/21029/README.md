# Title/manual media context — issue #21029

This fork-only branch holds evidence, not changes for the upstream code PR.

- Original source: `543e16738b4883fcb7e70520e0b5849e7e18c9b7`.
- Final implementation: `77d5b74e9dd5e293d07fe30e73333fc270ce6e1f`.
- Code: branch `ZXLyyds100/ragflow:fix/title-media-context`, based directly on
  upstream main, independent of the MinerU PR.

## What is real, and what is a fixture

The browser renders the repository's actual `TitleChunkerForm`, Zod schema and
operator save/load transforms. Saving sends those actual persisted parameters
through `BuildParserConfig` and the actual Go Title/Manual components, compiled
from the corresponding original or fixed checkout. The media panels display
their returned bodies, not a hand-written result or a mock implementation.

The source parser records, the sample table/figure and storage API are local
fixtures. The sample `0.87` value is illustrative input, not a benchmark result.
No production database, OCR/LLM inference, full ingestion deployment or object
storage service was used. Upload-key correctness is tested with a stub callback.

The original and fixed desktop images use the same 1440 × 1100 viewport and
source payload. The recording is 1440 × 1100, 12 fps, and covers book save/reload,
independent table-off/image-on settings, manual and paper save/reload. The narrow
390px component fixture was also checked for horizontal overflow.

## Runtime validation

- Original-source regressions fail because nonzero windows do nothing.
- Six complete original/fixed output comparisons (three templates × omitted/
  explicit zero) are equal. Three positive-budget comparisons add context and
  preserve media references and positions.
- Unit coverage includes five entry points, independent media types, sentence
  boundaries/overshoot, manual physical sorting, sheet and invocation isolation,
  root headings/token caps, 72 invalid constructor inputs, template retention,
  and matching final IDs/upload keys.
- A second self-review caught an issue in the **first local implementation**:
  two different captionless images with the same surrounding text collided on
  one upload key. The failing design regression is retained separately from
  the original-main regression. Final tests verify distinct source/payload/body
  identities and preservation of stamped IDs by the crop path.
- All related ingestion/parser Go packages and native unit tier pass; focused
  regressions pass with the race detector.
- Six related frontend suites, 140 tests, production build, scoped lint/format,
  actual web hooks and both commits' pre-commit hooks pass.
- Full frontend is **not green**: original and fixed runs fail in the same six
  suites and then abort on `Request is not defined`. Both have the same 206
  type diagnostics after normalizing line/column shifts. See `validation.json`.

### Local native-link limitation

The repository's original macOS static-link setup did not work on this host.
Tests use unchanged `build.sh` with a PCRE2 link-path-only Go overlay, genuine
same-version Microsoft ORT 1.29.0 and PDF 0.3.73 shared libraries, and the genuine
tokenizer archive built from unchanged sources. No Go logic was overlaid and no
repository build/dependency/workflow files were altered. This is not successful
unmodified macOS static-link or hosted Linux CI validation.

## Replay the component fixture

Prepare two source checkouts at the original and fixed revisions and install
their frontend dependencies. Follow the repository's native Go build setup;
this evidence does not replace that prerequisite.

In each source checkout, copy this directory's `capture_test.go` to
`.cache/title-context-evidence/capture_test.go`, then compile it with:

```sh
bash build.sh --test -c -o /absolute/path/to/before.test ./.cache/title-context-evidence
# In the fixed checkout, use /absolute/path/to/after.test instead.
```

The capture is a standalone Go test using real template cleaning and components.
It needs no live application services. For an individual runtime capture:

```sh
MEDIA_CONTEXT_JSON='{"template":"book","params":{"table_context_size":32,"image_context_size":64}}' \
  /absolute/path/to/after.test -test.run='^TestCaptureTitleContext$'
```

Run the browser fixture from this evidence directory, with explicit paths:

```sh
RAGFLOW_SOURCE_DIR=/absolute/path/to/fixed/source \
RAGFLOW_EVIDENCE_BIN=/absolute/path/to/after.test \
RAGFLOW_EVIDENCE_DIR=/absolute/path/to/local/captures \
  node start-harness.mjs after
```

The fixed fixture listens only on `127.0.0.1:51839`. For the original checkout,
use its `before.test`, source directory and argument `before` (port 51838).
`RAGFLOW_EVIDENCE_PORT` can override the local port. API storage is in-memory;
restarting restores the source template with fixture budgets 32/64.

The harness uses the existing source checkout's frontend dependencies. It
creates only an ignored local `harness/node_modules` link and `tmp/home`.
These scripts and all media remain outside the upstream code PR.
