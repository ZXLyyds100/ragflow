# Review feedback: MinerU migration and missing tenant PDF model

Final source heads: #21109 `9dc68a1b14cf3adca9bca00afd0195b2325fb444`; #21112 `72ec8472e8eb5edbee130522aaa48b93b1ac1ce5`.
AI-assisted with OpenAI Codex; normal repository hooks and non-force pushes.

## Before / after

- #21109: four non-PDF malformed-control cases plus a real multi-table SQLite
  upgrade fail with the old production owner (six failed parent/subtest events).
  Unsupported controls now retire with one warning per field/row; valid PDF
  false values, invalid-PDF rejection, scoped priority and version/batch
  boundaries remain covered.
- #21112: four helper cases and four actual Parser Invoke cases fail before
  the three-line fix (ten failed parent/subtest events). Actual Invoke previously
  reached VLM rendering/resolution/chat; current code returns the wrapped
  record-not-found error without fallback and preserves saved/runtime setup.
- #21109 upstream merge retains the already merged #21113 image-OCR selection
  and MinerU PDF controls together. Four same-node form/schema/save/JSON/reload
  regression combinations supplement the earlier capture provenance.

## Fresh final validation

| Check | Executed scope | Top-level tests | Passing test/subtest events | Explicit skips |
| --- | --- | --- | --- | --- |
| #21109 full | 31 test-executing packages | 3723 | 5830 | 5 |
| #21109 race | 3 test-executing packages | 41 | 399 | 0 |
| #21112 focused | 3 test-executing packages | 12 | 88 | 0 |
| #21112 full | 30 test-executing packages | 3664 | 5562 | 5 |
| #21112 race | 3 test-executing packages | 12 | 88 | 0 |

Full related #21109 has one additional no-test package; #21112 has two.
No pass count includes skipped tests or no-test packages.
Both race ranges have zero skips/failures/data-race reports.

Frontend: 11 suites / 135 tests pass; production Vite build passes with retained
warnings; source oxlint and changed-file oxfmt/oxlint ran. Type checking is NOT
green: current and exact upstream same-dependency source produce identical
206-diagnostic multisets, including multiplicity, with zero new diagnostics.

## Evidence limits

See REVIEW.md and validation/summary.json for exact commands, initial failures,
native adapter restrictions and mock/fixture details. Native TestMain exits
without m.Run absent model testdata, so plain native ok is not native unit or
inference coverage. Local tests use unchanged build.sh with a PCRE path-only
overlay and genuine same-version ORT1.29/PDF0.3.73 shared TEST adapter. The
production macOS static input does not link. No real OCR/model inference,
production data/services, deployed UI or new visual capture is claimed.
Existing media retains its original capture commit and fixture boundaries.
Hosted CI is separate and must be read on each exact new head.
