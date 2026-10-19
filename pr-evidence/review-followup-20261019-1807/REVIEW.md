# Independent review notes — 2026-10-19 18:07 round

Scope: existing RAGFlow PR #21109 maintainer comment 6264529338 and #21113
bot comment 6247519093 (updated 10:00:35 UTC). No new issue or competing PR.
Reviews were performed with OpenAI Codex agents, not human maintainers.

## #21109

Verified the new human feedback against exact source head
`e22e09d6a42d43c728e046c95ef3280e62771741`. Both boolean keys were in the
retired inventory and had no migration reader, despite the PR's new runtime
reader. The smallest owning implementation moves those keys to the Parser
inventory and uses the existing strict boolean / family / buffered-write path.

Reviewed:

- Existing scoped values, including `false`, win over flat siblings.
- Missing/null controls are not materialized as default values.
- A PDF override retains the template's carried book/laws/paper defaults.
- Known non-PDF pipelines retire and log the values; custom canvases and
  unknown parsers are not newly interpreted.
- Malformed non-null values reject their migration batch without source
  rewrites or advancing the migration version.
- Both dataset and document tables are checked across 257 rows each.
- The HTTP test uses real SQLite migration and persisted readback, the actual
  template cleaner and Parser invocation; only the external MinerU endpoint
  and its OCR result are synthetic.
- No migration version bump. This protects not-yet-migrated rows; it cannot
  recover data removed by a previously completed migration.

The independent reviewer found one test reliability issue: an inherited
`MINERU_BACKEND=standard` broke the pipeline fixture. It was reproduced
(all four combinations failed), fixed with scoped `t.Setenv(..., "pipeline")`,
and all four combinations passed under the same hostile inherited value.
No production environment or workflow was changed for this correction.

The final old-source reproduction uses the exact original production
migration blob as a Go overlay and the current regression tests. Its failures
include the actual outgoing request becoming `[true true]` instead of the
saved false combinations. This is assertion-red, not a failed link/compile.

## #21113

Only four Go files' comments are changed. Standard Go parsing and lexical
token comparison confirms every non-comment token, including inserted
semicolons, matches `db01fba1f8bb2597b3c13ae7b46cd47bb2942030`.

An independent reviewer found two overly broad draft descriptions:

- The tenant-default helper requires the older default reference to be nonempty
  before trying an enrolled ID. The comment now states this prerequisite.
- The lookup assertion counts top-level GORM queries; its model SQL includes a
  provider subquery. The comment now explicitly distinguishes those counts
  from individual table accesses.

Both were corrected and re-reviewed with no remaining findings. The estimate
of 44/52 documented functions is not an online CodeRabbit result. Keep the
actual bot refresh/coverage outcome separate.

## Validation boundaries

Commands and final counts are recorded in
`ragflow-followup-checks-20261019-1807-final.json`.

The first related full run had six failures due solely to the sparse checkout
omitting the original `test/benchmark/test_docs/Doc1.pdf`. The exact existing
Git blob `2bc4232fb31c578a8e0c25cb18d32d3139b63577` was restored;
SHA256 `e9642829132ab617b158271fd841abe83d2d4a948ee01d97f3a2fc14b836570f`.
No test assertion was changed to hide the failure. Both attempts are retained.

The first concurrent #21113 command failed before tests because unchanged
`build.sh` raced to create the shared native archive symlink. It is preserved;
all subsequent builds run sequentially. The repeated test pass is separate
from this environmental command failure.

The unmodified macOS static native path does not link. The test-only adapter
uses genuine pinned ORT 1.29.0 and PDF_oxide 0.3.73 shared libraries; other
native inputs remain genuine static archives. The appended native package
`TestMain` does not call `m.Run` without downloaded model testdata. Its plain
`ok` is not native unit/inference coverage. No production build, real OCR
inference, production database, real external service or deployed UI is claimed.

No UI behavior is changed by these follow-ups; earlier screenshots/videos
remain at their original source/provenance boundaries, without relabeling.
