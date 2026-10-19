# RAGFlow #21113 local UI evidence

This is an isolated browser harness, **not the full app and not a real backend**.
All model IDs, tenant IDs and HTTP data are synthetic. No uploads are performed.
Final results and screenshot pairs: [REVIEW.md](REVIEW.md).
Image checksums: [SHA256SUMS.media](SHA256SUMS.media).
Source provenance: [source-provenance.json](source-provenance.json).
Final continuous video: [WebM](media/final-ui-interaction.webm) and
[decode/seek QA](video-qa.json).

## Start

Set `RAGFLOW_REPO` to the existing checkout, then run `bash serve.sh`. It reuses
that checkout's exact installed frontend dependencies; it does not install any.
The server binds only to `127.0.0.1:4173`. The Vite cache stays in this folder.

`bash browser.sh` wraps the registered isolated review environment and
Playwright CLI with session `ragflow21113-ui`, using this folder as the working
directory. On first open pass `--config playwright-cli.json --browser chrome
--idle-timeout 0`. `RAGFLOW_REVIEW_ENV` and `PLAYWRIGHT_CLI_SCRIPT` can override
the local wrapper paths. The relative `.pw-sockets` path avoids the macOS socket
length limit without creating UI resources elsewhere.
Screenshots, snapshots and videos belong under `media/`.
Keep the session and original recordings until the main agent verifies upload.

The final 10.867-second video was recorded using CLI `video-start`,
`run-code --filename src/record-flow.js`, then `video-stop`. Only the CLI's
matching official ffmpeg revision 1011 was separately installed into the
registered isolated `PLAYWRIGHT_BROWSERS_PATH`, with explicit authorization.
No browser bundle, global package or repo dependency was installed for it.
The five `video-qa-*.png` images were decoded from the video for visual QA;
the video is not a still-image sequence.

## Provenance and boundaries

- Baseline: `f66e8362850fd47764d45d8cebfdb3c21ea6fcd2`.
- `src/baseline/image-form-fields.tsx` is byte-identical to that commit's feature
  source, read with `git show`. Its type-only imports are erased by Vite.
- `src/baseline/translations.ts` contains verbatim en/zh feature-key excerpts
  from the same commit. Other keys come from real current locales.
- Current feature source, `TreeSelect`, `RAGFlowFormItem`, `MissingModelLabel`,
  `buildModelTree`, primitives, icons, tooltips, styling and `FormSchema` come
  directly from the existing checkout. Shared UI files are not changed.
- Owner context is a labeled fixture. The field-path helper is a verbatim
  two-line excerpt to avoid importing the entire canvas application.
- Model hook is an explicitly labeled fixture using real React Query and axios,
  matching the real query keys, `initialData: []`, `gcTime: 0`, return states and
  `data?.data ?? []` envelope interpretation. Only HTTP/auth/notification
  surroundings are isolated. Retries and focus-refetch are disabled for capture.
- The local middleware serves both OCR-only and untyped `MissingModelLabel`
  model queries at `/api/v1/models`, retaining the owner-tenant query parameter.
- Save/reload is a synthetic local fixture with real schema validation, **not**
  the app's serializer, canvas save handler, authentication or persistence.
  Serializer correctness is a separate source/unit-test assertion.
- i18n initialization is local using real en/zh values, without auth storage
  or language detection. No remote fonts or services are required.
- This harness has its own container: it verifies these real component layouts
  at equal widths, not every parent constraint in the full canvas drawer.

## Paired conditions

Use the same URL parameters for each version:

```text
/?version=baseline&scenario=models&lang=en
/?version=current&scenario=models&lang=en
/?version=baseline&scenario=loading-error&lang=en
/?version=current&scenario=loading-error&lang=en
/?version=current&scenario=default-loading-error&lang=en
/?version=baseline&scenario=empty&lang=zh
/?version=current&scenario=empty&lang=zh
```

Desktop viewport: 1440 × 1040, DPR 1. Narrow viewport: 390 × 1040, DPR 1;
this is a responsive-width check, not a touch-device emulation.

For loading-error, the middleware holds the request until the explicit release
button is clicked. For cached-data errors, first load `models`, select the same
synthetic PaddleOCR leaf, then click the same refetch-error control. Test both
HTTP failures and the Go-style HTTP 200 / nonzero-code response.

Report screenshots/video with their synthetic-data boundary. Do not present
fixture controls, saved payloads or query-cache panels as RAGFlow application UI.
