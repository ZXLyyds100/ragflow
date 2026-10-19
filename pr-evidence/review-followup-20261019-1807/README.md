# RAGFlow review follow-up — October 19, 2026

Source heads: #21109 `6627310a8f747af99ec9c6d19d74d58fa76085bf`; #21113 `1a231b670f07fb001b19933c02b0fb283e49d773`.

## MinerU migration (#21109)

Addresses maintainer comment 6264529338. Existing version-gated migration now
moves strict booleans into the PDF setup instead of deleting them. Existing
scoped values win; omitted/null fields stay omitted. Known non-PDF pipelines
still log retirement; custom canvases/unknown parsers remain untouched.
No version bump or claim that previously discarded values can be recovered.

| Saved formula/table | Original outgoing request | Fixed outgoing request |
| --- | --- | --- |
| false / false | true / true | false / false |
| false / true | true / true | false / true |
| true / false | true / true | true / false |
| true / true | true / true | true / true |

This is a real SQLite migration → persisted readback → actual template cleaner
→ Parser invocation → local HTTP multipart assertion, not a UI screenshot or
live OCR service. The response, credentials, model and tenant are synthetic.

The original production source is the exact previous Git blob, overlaid into
the same current regression suite. [Red summary](validation/original-regression-summary.json)
and compressed raw logs preserve assertion failures. There are 59 failure
events including parent/subtests, not 59 independent failures.

## OCR comment contracts (#21113)

Four Go files have doc-comment-only changes; no runtime tokens, assertions,
thresholds or workflows changed. [Go parser/scanner equivalence](validation/comment-token-equivalence.json)
and the [verification source](validation/comment-token-verifier.go) are included.
The hosted CodeRabbit coverage result must be read independently; no estimate
is represented as a bot pass.

## Validation and review

[Exact four final commands, counts, skips and frozen-source hashes](validation/summary.json).
Both PRs received their own complete related package run. #21109's migration,
wire contract and persistence regressions also ran with the race detector.
Normal commit hooks passed; source commits match the validated diffs.

[Independent automated review and corrected findings](REVIEW.md).
Original missing tracked PDF / inherited backend-variable fixture failures and
an initial parallel native-symlink setup failure are retained. They were not
hidden, labeled as behavior-red, or counted as test successes.

## Native / scope boundary

[Test environment and limitations](environment/README.md), [real native probes](environment/native-probes.json),
[native input hashes](environment/native-inputs.json), and
[transparent TEST-only compiler adapter](environment/test-only-compiler-adapter.mjs).
Original macOS static input does not link. Tests use genuine same-version
ORT 1.29.0 / PDF_oxide 0.3.73 shared libraries; other native inputs remain
genuine static libraries. No unresolved-symbol or duplicate-symbol suppression.
Appended native packages do not call m.Run without model testdata, so their
plain ok is not native runtime/inference coverage.

No production/static/server build, real OCR inference, external-service
integration/E2E, production DB/object store, deployed UI or search retrieval
is claimed. Earlier UI evidence retains its original capture source; no fresh
screen recording is claimed for backend migration or comment-only changes.

All raw public logs are gzip-compressed after removing private local paths.
These assets live on a separate evidence branch, outside both source PRs.
AI-assisted implementation, verification and review with OpenAI Codex; not
human maintainer approval.
