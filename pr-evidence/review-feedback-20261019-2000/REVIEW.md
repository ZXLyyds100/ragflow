# October 19 second review follow-up

This is incremental work after fresh paginated account snapshot
`state/snapshot-20261019-195559.json`, not a new issue claim.

## MinerU #21109

- Maintainer comment 6265948542 asks to resolve conflicts. Merge upstream
  `f9138d2c3916e6f44f8924e5fca668972faac803` without rewriting published history.
  Three frontend conflicts retain both the newly merged image-OCR selection and
  this PR's PDF MinerU settings. Four added same-node save/reload combinations
  test selected/empty OCR IDs, OCR on/off, field isolation and repeat saves.
- Verified inline comment 4313127616: non-PDF targets previously type-checked
  obsolete controls before retirement. Four direct cases and the real SQLite
  multi-table migration fail on unchanged production code (six failed parent/
  subtest events, not six separate bugs). Retire unsupported controls first;
  PDF controls still require booleans and retain existing scoped precedence.
- The real batch test includes every current builtin non-PDF target, verifies
  both stored tables, an unowned field, per-row warnings, the unchanged version
  target and second-run idempotence. Existing malformed-PDF tests still check
  batch rollback. Transactions remain per batch, not a new global transaction.
- Add accurate owner/test documentation without altering coverage thresholds.
  CodeRabbit's next coverage verdict remains external.
- Whole effective PR diff relative to the chosen upstream is 19 files; upstream
  workflow/provider changes must not appear as new PR scope.

## Tenant PDF parser #21112

- Verified human inline comment 4313040585 against original head
  `b1b16e08d57f323162f9d9992fb87c395ae96ad0`.
- A syntactically valid but absent selected model ID returned `handled=false`.
  The actual Parser Invoke then entered generic VLM rendering/resolution/chat.
  Eight regression cases and two parent tests fail before the fix.
- Delete only the three-line record-not-found special case. The existing
  wrapped lookup-error owner now returns `handled=true` with an error preserving
  `errors.Is(err, gorm.ErrRecordNotFound)`. Existing models and bare engine
  selectors retain their dispatch paths.
- Tests cover both selector fields, both provider fixtures, actual reloaded
  SQLite canvas parameters and Parser Invoke, no generic/VLM/environment/HTTP
  fallback, and unchanged persisted and in-memory setup.
- The exact new tests use synthetic records/PDF bytes and local HTTP fixtures.
  VLM/native factories are test-only sentinels restored by cleanup, not real
  OCR/model inference.

## Reviews

An automated Codex reviewer independently inspected the #21112 two-file diff
and end-to-end owner path with no findings. A second agent reviewed #21109's
whole effective diff, shared resolver and migration/version/rollback boundaries
with no findings; its three conflict-resolution files were self-review because
it authored them. The main agent also reviewed those final diffs. These are
automated reviews, not maintainer approval or hosted-CI success.

## Validation boundaries and retained failures

- The #21109 frontend relevant selection has 11 suites / 135 passing tests,
  no skips. Production Vite build passes with existing size/eval warnings.
- Standard current TypeScript CLI is not green. Same-dependency compiler
  comparison against exact upstream source has 206 vs 206 identical diagnostic
  multisets, including multiplicity, and no new diagnostics.
- Full source oxlint and changed-file format/lint ran; warnings are retained,
  not described as a warning-free result.
- The first complete Go run after merging had six missing-Doc1.pdf errors
  because sparse checkout removed that excluded fixture. Restore only its exact
  tracked blob `2bc4232fb31c578a8e0c25cb18d32d3139b63577`, SHA256
  `e9642829132ab617b158271fd841abe83d2d4a948ee01d97f3a2fc14b836570f`.
  Do not change assertions or hide the first log.
- Initial #21112 environment setup attempts stopped before tests due to an
  incorrect helper filename/path assumption and then a missing overlay. The
  setup helper was corrected and recorded compatibility/hash checks. Those
  setup failures are not behavior-red; only the assertion-red retry counts.
- Build invocations are serial and use unchanged build.sh, path-only PCRE
  overlay and the disclosed genuine same-version ORT 1.29.0/PDF_oxide 0.3.73
  shared TEST adapter. Office/PDFium/tokenizer/PCRE remain genuine static
  inputs. No production static/server build, real OCR, production DB/services
  or deployed UI is claimed. Appended native TestMain does not call m.Run
  without model testdata; plain native `ok` is not inference/unit coverage.
- No new visual interface is introduced by these follow-ups. Existing captures
  keep their original commit/fixture provenance; no fresh screen recording or
  screenshot is claimed. Backend before/after assertion logs are the relevant
  evidence for this follow-up.

Final exact commands, counts, skips, tree hashes, normal hooks, remote head/file
verification and response receipts are recorded separately after completion.
