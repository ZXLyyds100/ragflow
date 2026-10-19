# RAGFlow #21113 — final isolated UI review

2026-10-19. **No remaining actionable finding in the reviewed UI change.**
Repo source was not edited, staged or committed by this reviewer. Nothing was
uploaded or posted externally.

## Evidence boundary

These are real component renders, **not full-app/backend E2E evidence**. All
models, owners and HTTP responses are synthetic. ImageFormFields, TreeSelect,
RAGFlowFormItem, MissingModelLabel, buildModelTree, FormSchema and shared UI
primitives come from the actual checkout. Owner, model query/HTTP and save are
explicit fixtures; details are in README.md.

Baseline component is byte-identical to commit
`f66e8362850fd47764d45d8cebfdb3c21ea6fcd2`. Current imports live source; it has no
fixed-source copy. SHA values and retained-frame provenance are recorded in
source-provenance.json. Final current frames 05/07/08/11 were recaptured after
the feature error span gained `text-state-error`. Other frames were retained
as requested because that presentation-only change does not affect them.

## Verified behavior

- Baseline **already supports clearing with its small X** to return to local
  OCR. The change adds an explicit peer DeepDoc option and removes the
  misleading “default” label; it does not invent the first possible way back.
- Actual PaddleOCR selection → explicit DeepDoc → save produced raw form
  `ocr_model_id: ""` and the same synthetic saved value. No sentinel leaked.
  DeepDoc has a chevron, not a meaningless clear X.
- Cached-data HTTP 503 preserves the selected PP-OCRv5 and all three synthetic
  query records. The final UI adds a separate red alert; it does not replace
  cached options with an empty success state.
- Pending request → HTTP 503 with a persisted missing ID retains the ID in the
  real form and local save. Final UI shows the actual warning-label component
  plus error alert. Its additional untyped model query was observed alongside
  the OCR query; both use the same synthetic owner tenant.
- Default DeepDoc survives an initial request failure, with empty persisted ID,
  no clear X and an error alert.
- Chinese empty-success description is a separate `role="status"`; error is
  `role="alert"` and uses the project error-color token.
- OCR off hides the select but retains its model ID and saves
  `ocr_enabled: false`. On restores the field. With global vision off, the
  actual existing guard refuses to turn OCR off. `field.ref` successfully
  focuses the real select button.

## Same-condition screenshot pairs

Both versions use identical fixture containers, synthetic data, owner, retry
policy, language and viewport. Desktop is **1440 × 1040**; narrow is
**390 × 1040**, DPR 1. Narrow is a width check, not touch-device emulation.

| # | Condition | Before | After |
|---|---|---|---|
| 01 | Default selection | [baseline](media/baseline-01-default-desktop.png) | [current](media/current-01-default-desktop.png) |
| 02 | Expanded model menu | [baseline](media/baseline-02-dropdown-desktop.png) | [current](media/current-02-dropdown-desktop.png) |
| 03 | PaddleOCR selected | [baseline](media/baseline-03-paddle-selected-desktop.png) | [current](media/current-03-paddle-selected-desktop.png) |
| 04 | Return to local OCR + save: baseline X / current DeepDoc option | [baseline](media/baseline-04-deepdoc-save-desktop.png) | [current](media/current-04-deepdoc-save-desktop.png) |
| 05 | Cached selected model + HTTP 503 | [baseline](media/baseline-05-cached-http-error-desktop.png) | [current](media/current-05-cached-http-error-desktop.png) |
| 06 | Held request, persisted missing ID | [baseline](media/baseline-06-loading-missing-desktop.png) | [current](media/current-06-loading-missing-desktop.png) |
| 07 | Missing ID + HTTP 503 + save | [baseline](media/baseline-07-error-missing-saved-desktop.png) | [current](media/current-07-error-missing-saved-desktop.png) |
| 08 | Default selection + initial HTTP 503 + save | [baseline](media/baseline-08-default-request-error-desktop.png) | [current](media/current-08-default-request-error-desktop.png) |
| 09 | Chinese empty success | [baseline](media/baseline-09-empty-zh-desktop.png) | [current](media/current-09-empty-zh-desktop.png) |
| 10 | Narrow expanded menu | [baseline](media/baseline-10-dropdown-narrow.png) | [current](media/current-10-dropdown-narrow.png) |
| 11 | Narrow Chinese missing ID + HTTP 503 + save | [baseline](media/baseline-11-missing-error-zh-narrow.png) | [current](media/current-11-missing-error-zh-narrow.png) |
| 12 | Narrow Chinese empty success | [baseline](media/baseline-12-empty-zh-narrow.png) | [current](media/current-12-empty-zh-narrow.png) |

All 24 PNG dimensions were checked. At width 390, document width is 390 and
both dropdowns have horizontal bounds x=33–357: no horizontal overflow.
Final error-page checks also confirmed document width 1440 at viewport
1440 × 1040 and document width 390 at viewport 390 × 1040. The final page's
resource timing list contained no non-local resource origins.
Final red-token frames were visually inspected. Ordinary vertical page
scrolling and the diagnostic panel extending below the viewport are expected.

## Final live interaction video

[Original WebM recording](media/final-ui-interaction.webm) — **10.867 seconds,
1440 × 1040, 15 fps, VP8, 657,231 bytes**. One continuous actual browser
recording, not a still-image sequence or an edited composite. It shows the
existing current UI only, with the same synthetic-data/fixture boundary:

1. Select PaddleOCR PP-OCRv5.
2. Select the explicit DeepDoc peer option and save; raw and saved model ID
   become `""`, with no sentinel or clear X.
3. Navigate to the existing held-request/missing-ID scenario, release HTTP 503,
   then save the retained missing ID alongside the final red error alert.

Recorded through Playwright CLI 0.1.22 with its own
`playwright-core@1.64.0-alpha-1790635538000`. After explicit authorization, only
the matching official ffmpeg revision 1011 was installed into the registered
`PLAYWRIGHT_BROWSERS_PATH`; no global install, repo dependency change or browser
bundle download. An earlier failed attempt left an empty CLI recording flag;
it was reset before this successful recording. No earlier video file existed.

The final recording used image-source SHA
`97abf6aaf3b93ac8d2616208eb10639f5d65273595361cca660cf34ba8f1ace4`.
The existing 24 screenshot originals were not changed.

QA passed:

- Full decode with `-xerror -err_detect explode` completed successfully:
  **163 decoded frames**, exit 0. Only software colorspace-conversion notices
  appeared, not corrupt-frame errors.
- Real input seek to 2, 4, 6 and 9 seconds decoded successfully. All four frames
  and the last fully decoded frame were visually inspected; the menu, selected
  PaddleOCR, empty-ID DeepDoc save and red missing-ID error/save are readable.
- Final live state remained 1440 × 1040 with document width 1440, no horizontal
  overflow, only the expected two HTTP 503 resource errors, no React warning,
  and no non-local resource origins.

[Machine-readable video QA](video-qa.json) records installation/version,
decode/seek evidence and hashes. The CLI input is `src/record-flow.js`.
The five `media/video-qa-*.png` files are frames decoded **from the WebM** for QA,
not frames used to construct it. Media manifest now contains 24 original
screenshots, one video and five video-derived QA frames.

## Console and existing HTTP boundary

Final missing-ID capture has only the expected two HTTP 503 resource errors
(OCR and untyped label lookup), with no React warning. Initial setup logs
include a Vite alias/config error and a harness-only query-debug subscription
warning; both were fixed in evidence files, not repo source. Earlier logs are
retained and are not product findings. Personal absolute paths in that early
stack trace were redacted to `<RAGFLOW_REPO>`.

HTTP 200 with a nonzero business `code` is **not** evidence of this UI's
`isError` behavior. The existing request layer emits a global notification
but returns the response; the real hook uses `data?.data ?? []` and does not
reject. The fixture preserves that envelope interpretation and deliberately
does not claim to test the real global toast. No hook/global repair or extra
business-error recording was added.

## Gaps and handoff

- All requested component-level screenshot/interaction scenarios above were
  verified. Full canvas layout/permissions, backend save/reload, real OCR and
  real tenant model data are outside this fixture.
- Save proves the real field value and real schema acceptance, not the app's
  transform or backend persistence. The unchanged transform was source-read;
  its suites, build and type-parity checks remain the main agent's evidence.
  This reviewer did not rerun Jest/build/type-check or claim their results.
- Video is complete and decode/seek QA passed as documented above. No extra
  business-error or full-app/backend scenario was added.
- Browser session `ragflow21113-ui` has idle timeout disabled; local server
  `127.0.0.1:4173` and original evidence remain available. Resume with
  `bash browser.sh snapshot`. Do not delete media/session until the main agent
  completes upload verification.
- Verify the complete media list from this folder using
  `shasum -a 256 -c SHA256SUMS.media`. Source and media manifests are path-safe.
  Final verification includes 24 original screenshots, the video and five
  decoded QA frames, all 12 repo source hashes and the byte-identical baseline
  copy; uploadable text has no personal absolute-path matches.
  Upload only chosen report/source/media files, not `.vite-cache`,
  `.pw-sockets`, or browser-profile/cache state.
