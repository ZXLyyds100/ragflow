# RAGFlow migration environment, run 20261019-1807

This is a fresh disposable environment for the #21109 MinerU migration regression. It also provides the same caches and native libraries to the #21113 doc-comment follow-up. No repository source or test files are modified by the environment helpers.

Wrapper:

```sh
bash <CONTRIBUTION_WORKSPACE>/state/with-ragflow-migration-env.sh go version
bash <CONTRIBUTION_WORKSPACE>/state/with-ragflow-migration-env.sh lefthook version
```

The wrapper isolates HOME, Go module/build/toolchain caches, temporary files and tool paths in `work/20261019-1807`. It does not install hooks or edit Git configuration. `LEFTHOOK_CHECK_ONLY=1` is the wrapper default; environment preparation never fixes or stages repository files. The standalone lefthook binary and isolated PyYAML are sufficient for the Go-only normal pre-commit checks; web dependencies are not installed.

After the native adapter is ready, package-scoped tests use the unchanged build script:

```sh
bash <CONTRIBUTION_WORKSPACE>/state/with-ragflow-migration-env.sh --shared-test bash <CONTRIBUTION_WORKSPACE>/repos/ragflow-21109/build.sh --test -json -run '^TestMigrate(ParserChunkerTokenizerConfig|IngestionParserConfigs)' ./internal/dao
bash <CONTRIBUTION_WORKSPACE>/state/with-ragflow-migration-env.sh --shared-test bash <CONTRIBUTION_WORKSPACE>/repos/ragflow-21109/build.sh --test -json ./internal/dao
```

The main agent owns the new behavior-red, production fix and full DAO run. This environment task first runs only the unchanged existing `TestShouldSkipMigration` as its smoke.

## Verified handoff

- Environment smoke finished at 2026-10-19 18:41:57 +08. The unchanged `build.sh --test` exited 0 through the disclosed adapter: `TestShouldSkipMigration` and its 7 subtests produced 8 passing events, 0 failed events. The source manifest remained stable throughout.
- The separate fresh standard-static smoke failed native linkage with 0 test execution events. Its complete log is retained; it is not a behavior-red result.
- Real ORT API 29/version 1.29.0 and PDF_oxide 0.3.73 open/page-count/free probes passed without model inference.
- Go 1.27.0, CMake 4.4.4, PCRE2 10.46, SIMDe 0.8.2, standalone lefthook 2.2.2 and isolated PyYAML 6.0.3 are ready. No web dependency installation or hook/config installation was performed.
- Both PDFium remaining ranges returned HTTP 206 with matching ETag, exact Content-Range/length, and the assembled original asset size/SHA256; the complete tar was extracted successfully. Response headers and original transfer timeouts are protected.
- All environment-owned Go/build/download processes have finished. No further build or test is started by this helper. Cleanup is explicitly deferred.

See `environment-summary.json`, `smoke-results.json`, `smoke-source-manifest.json`, `native-probes.json` and the adjacent complete logs. The fixed `smoke-compiler-invocations.jsonl` contains only this smoke's 228 compiler invocations; the separate ongoing `compiler-invocations.jsonl` is also used by the main agent's subsequent tests and must not be treated as a frozen smoke-only log.

The same wrapper accepts #21113's absolute `build.sh` path and test/package arguments. Its PCRE path-only Go overlay covers both repositories. The genuine tokenizer static archive is shared only after checking identical Git C++ trees and identical current CGO bindings; both generated checkout paths are already registered for cleanup. All downloaded bytes stay in the run; the registered checkout BPE paths are symlinks.

Run `build.sh` strictly **sequentially** across both repositories. Its shared HOME native setup updates the same versioned symlinks and can race. The main agent observed and preserved a setup-only `ln` failure in a parallel #21113 attempt (zero tests executed), then retried sequentially. The main agent now owns all red/green/full/race scheduling; this environment helper starts no further builds and does not clean any resources.

## Native validation boundary

The macOS standard static path previously failed with the exact pinned ORT archive (missing `ReleaseExternal*` and RE2 symbols); using real shared ORT alone exposed duplicate office/Rust symbols with static PDF_oxide. These are environment failures, never behavior-red. A fresh standard-static smoke is retained separately for this run.

The explicitly opted-in TEST-only compiler adapter removes only the exact ORT `-force_load` archive argument and exact PDF_oxide static archive argument. It links genuine ORT 1.29.0 and genuine PDF_oxide 0.3.73 shared libraries with `-needed_library`/isolated rpaths. Office 0.1.12, PDFium 7809, tokenizer and PCRE2 remain genuine static archives. Original/effective compiler arguments are recorded in `compiler-invocations.jsonl`. No fake archives/symbols, duplicate-symbol suppression or `undefined dynamic_lookup` is used.

The original PDF shared release's upstream CI absolute install-name is changed only in an isolated test copy, which is ad-hoc signed; original and relocated hashes/commands are preserved. ORT is extracted from a hash/RECORD-verified wheel without installing a Python inference runtime.

This does **not** validate a production static/server build, model inference, or the fork's three custom `SessionGetInitializer*` API slots. There are no model/testdata downloads. Without `fetch_testdata`, the appended native package's `TestMain` skips `m.Run()`; its normal `ok` output is not evidence that native unit tests or inference ran.

The unchanged C++ build reports no `objcopy`/`llvm-objcopy`, so tokenizer RE2 symbol renaming is not performed. This warning is retained, not patched around.

Complete results, manifests, actual logs and dependency URL/SHA records are adjacent to this report. Raw dependencies and caches are disposable; these reports, scripts and logs are protected evidence.
