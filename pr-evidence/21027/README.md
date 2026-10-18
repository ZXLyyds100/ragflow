# Tenant-selected PDF parser evidence for RAGFlow #21027

Source: `691a50a5ddfac05e9c5fd66ca422a09d9c3092c9`.
Original: `543e16738b4883fcb7e70520e0b5849e7e18c9b7`.
This evidence lives only on the contributor fork, outside the nine-file code PR.

## What actually ran

The identical `capture_test.go` was compiled separately against original and
fixed source. It invokes the exported production Parser, real builtin-template
parameter cleaning, JSON save/reload, real SQLite tenant/provider/instance/model
DAOs, PDF dispatch, and the existing SoMark or OpenDataLoader parser. No internal
renderer, model resolver, dispatcher, or parser function is replaced.

Each case uses the same valid one-page PDF and two local protocol servers.
Instance A is a decoy; the saved selector names instance B. The four original
cases fail before making an OCR request. The four fixed cases call only B,
match B's fixture credential, return structured text, and leave the saved
configuration unchanged. Both database-ID and composite selectors are captured
for both providers. Permanent tests additionally cover both selector fields,
invalid ownership/status/type, exact instance selection, options, secret
isolation, credential rotation, errors, and the SSRF boundary.

These are local protocol fixtures and in-memory tenant records, **not real OCR
inference, a live tenant deployment, or a production database**. Fixture secrets
are intentionally named `fixture-key-*`. SoMark responds `SUCCESS` immediately;
existing asynchronous polling/cancellation is unchanged. Adjacent PR #21076
owns that behavior.

## Before and after

The eight JSON files are the actual runtime captures. `runtime-comparison.json`
records the executable assertions. The eight PNGs are real browser screenshots
of `evidence.html`, which reads those JSON captures. The page prominently says
**TEST EVIDENCE PAGE — NOT RAGFLOW PRODUCT UI**.

`tenant-parser-verified.webm` is an 18-second browser recording of this viewer
switching among the captures. It does not rerun Go on each click. All 216 VP8
frames were independently decoded with PyAV; frames at 3 and 15 seconds were
visually reviewed. Dimensions are 1440 × 1040 at 12 fps. Browser metadata was
also checked, but browser-seek frames were not used for video acceptance.

## Validation and boundaries

`validation.json` records the original red run, final focused run, complete
related Go suites, and race scenarios. The related suites passed 30 packages:
`./internal/ingestion/... ./internal/parser/... ./internal/dao/...`
`./internal/common/... ./internal/utility/...`. This is not a full-repository,
integration-tier, or E2E claim. No frontend source changed.

The ordinary source commit hooks passed and did not alter the validated tree.
The final commit therefore contains the same source tested before the commit.

The unchanged `build.sh` ran in an isolated macOS environment with a PCRE2
path-only overlay, real ONNX Runtime 1.29.0 and PDF 0.3.73 shared libraries, and
the genuine tokenizer archive. No Go behavior was overlaid. The repository's
unmodified macOS static-link configuration was not validated successfully;
hosted Linux CI, actual OCR/LLM, production DB/MinIO and full ingestion E2E
remain unverified. Do not interpret native-build status text in the raw log as
proof that the original static archives were used.

## Replaying the runtime capture

Prepare the native dependencies required by the checked-out source, then copy
`capture_test.go` into `.cache/tenant-parser-evidence/` in each source checkout.
Compile in each checkout:

```sh
bash build.sh --test -c -o /tmp/tenant-parser.test ./.cache/tenant-parser-evidence
TENANT_PARSER_CASE='{"provider":"SoMark","reference":"id"}' \
  /tmp/tenant-parser.test -test.run='^TestCaptureTenantParser$'
```

Run from the source root so the real builtin template can be read. Repeat for
`OpenDataLoader` and `composite`; use separately compiled original/fixed binaries.
The `EVIDENCE_JSON:` line contains the complete capture. Original failures are
expected runtime output, not a successful parser result.

The static viewer needs only Node:

```sh
TENANT_PARSER_CAPTURES=/absolute/path/to/this/evidence \
  node serve-evidence.mjs
```

Open the printed loopback address. The server binds only to `127.0.0.1`.

Implementation, self-review, tests, and evidence preparation were AI-assisted
with OpenAI Codex. No human maintainer approval or hosted-CI success is claimed.
