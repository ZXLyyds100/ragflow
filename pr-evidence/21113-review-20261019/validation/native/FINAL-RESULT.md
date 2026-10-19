# RAGFlow #21113 backend validation

Finalized 2026-10-19T09:21:28.498Z. Requested TEST-only validation passed.

Mode: TEST-only official shared ORT + PDF_oxide; office/PDFium/tokenizer/PCRE remain static. Unmodified build.sh --test is used throughout.

| Phase | Exit | Top-level runs | Test/subtest runs | Passed | Failed | Skipped |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| adapter-old-head-smoke | 0 | 1 | 3 | 3 | 0 | 0 |
| adapter-old-head-new-tests-red | 1 | 4 | 24 | 0 | 24 | 0 |
| adapter-current-focused-green | 0 | 25 | 85 | 85 | 0 | 0 |
| adapter-current-focused-race | 0 | 89 | 171 | 171 | 0 | 0 |
| adapter-current-full-related | 0 | 4584 | 6878 | 6873 | 0 | 5 |

Full related range: 32 packages; 30 passing package results; 2 no-test package results; 0 failing package results. The complete requested/observed lists are in summary.json.

Race: -race -count=1 -run 'ImageOCR|ResolveModelConfig|Upload', 14 package targets. A race diagnostic was not reported.

- TestResolveModelConfigChainedDBStatementIsolationFixedOnly: ran=true, passed=true
- TestResolveModelConfigInaccessibleIDs: ran=true, passed=true
- TestPaddleOCRUploadFilename: ran=true, passed=true
- TestImageOCRCloudDefaultEndpointWarning: ran=true, passed=true

Backend source/build/module hashes unchanged at the end: true.

## Evidence and prior failures

- all-results.json combines the final five phases. results.json retains focused smoke/red/green; related-results.json retains the first missing-fixture full result plus race; related-results-after-fixture.json retains the corrected-environment full rerun.
- execution-manifest.json freezes the latest production/test sources, including Darwin's logger-fixture repair. Red and green compile the exact same new test snapshots; red replaces only the four original production owners plus the PCRE path overlay.
- ../attempt1/ retains byte-identical first-attempt files and its original logger panic; ARCHIVE-MANIFEST.json proves the copies.
- The original static and ORT-only adapter link failures, including their zero-test results, remain in the parent evidence directories. They are not behavior red.
- adapter-current-full-related.log preserves the six missing-Doc1.pdf failures. The fixture was sparse-excluded original tracked content, not absent from Git. materialize-tracked-pdf-fixture.mjs restored exactly the local baseline blob, without network, substituted data, or test/source logic edits.
- Restored fixture blob 2bc4232fb31c578a8e0c25cb18d32d3139b63577, 2654 bytes, SHA256 e9642829132ab617b158271fd841abe83d2d4a948ee01d97f3a2fc14b836570f; final unchanged=true. Preserve it as original source, not disposable dependency data.
- The successful-environment full rerun, if successful above, is adapter-current-full-related-after-fixture.log. No failed log/result was overwritten.
- Compiler adapter source, effective/original flags, real-library hashes, API probes, official source metadata, and PDF install-name relocation details remain preserved.

## Publication handoff

- Use this attempt's execution-manifest.json and all-results.json, not the older parent manifest/results.
- Phase names are adapter-current-full-related and adapter-current-focused-race. Successful no-test packages are separate packagesSkipped results, never fabricated packagesPassed entries.
- Private absolute paths remain in the original protected local evidence, including the upstream PDF asset's author-CI install-name. Public copies must be sanitized separately; this helper performs no external publication.

## Limits

- Unmodified build.sh --test with a transparent TEST-only real ORT 1.29.0/PDF_oxide 0.3.73 shared-library compiler/link adapter.
- office_oxide 0.1.12/PDFium/tokenizer/PCRE2 remain real static archives. No fake archives/stubs, duplicate-symbol suppression or undefined-symbol lookup.
- The PDF shared asset is hash-pinned to the author's exact release. An isolated copy's author-CI install-name was changed and ad-hoc re-signed; original and relocated hashes are preserved.
- Original static baseline and ORT-only adapter link failures executed zero tests. Their complete evidence and the first true green-attempt logger panic remain preserved.
- No fetch_testdata: appended native TestMain returns without m.Run. No native runtime/model inference, custom ORT initializer slots, integration/e2e/manual tier or production/static/server build success is claimed.
- Counts are test and subtest events; top-level counts are provided separately. No-test packages are not mislabeled as executed tests.
- No repository source/test edit, commit, push, GitHub write, model download or global install/configuration was performed by this validation.
