# RAGFlow #21030 — image PaddleOCR selection

These artifacts accompany a focused Go/frontend feature PR. They are **not a
production deployment or a comparison of OCR recognition accuracy**.

## What is real and what is a fixture

- UI: actual `ImageFormFields`, vision fields, Zod schema, and save/load transforms
  from isolated original/fixed source checkouts. The surrounding page is a local
  verification harness, not the full product. Model-list and save API are local
  fixtures.
- Runtime captures: identical Go capture source compiled against both trees.
  Actual builtin config cleaning, tenant SQL DAO resolution, PaddleOCR driver,
  Parser, decorated OneChunker, image upload plumbing and Tokenizer run. OCR
  inference, embedding inference and image storage use labeled local fixtures.
- The same saved tenant model ID B, image bytes, tenant and switches are supplied
  to both runtime versions. The original ignores the ID and calls the DeepDoc
  inference fixture; the fixed version calls selected PaddleOCR instance B.
- `before-runtime.json` and `after-runtime.json` are captured program output, not
  invented display data. The UI's runtime panel displays these separate captures.
- The regression test in the code PR additionally saves/loads the real
  `Knowledgebase.ParserConfig` JSON column in SQLite and checks the indexed text,
  embedding input/vector and unchanged uploaded image.

## Media

- `before.png` / `after.png`: same 1440×1040 viewport, same fixture setup and
  save/reload operation. Before drops the OCR model ID; after retains it.
- `model-options.png`: only enrolled PaddleOCR/PaddleOCR.local OCR models shown.
- `after-narrow.png`: real 390px-wide layout, no horizontal overflow.
- `image-ocr-verified.webm`: real browser recording of source comparison,
  cloud-model save/reload, clear-to-local, and independent OCR/VLM toggles.
- `media-validation.json`: actual dimensions, hashes, browser video decode and
  seek results. Screenshots and two sampled video frames were visually reviewed.

## Validation

See `validation.json`, focused/related logs and `self-review.md`.

- 32 related Go package results pass, through unchanged `build.sh`.
- 13 new top-level focused tests pass with race detection.
- 10 relevant frontend suites / 105 tests pass.
- Production frontend build, full-source oxlint and changed-file oxfmt pass.
- Full frontend Jest was attempted on both trees: identical six failed suites
  followed by the same `Request is not defined` jsdom termination. Not full green.
- Full TypeScript checking reports the same 206 existing diagnostics on both
  trees, including diagnostic multiplicity; no new diagnostic remains.

Native test environment: isolated prepared dependencies, PCRE2 path-only Go
overlay, genuine ORT 1.29.0 / PDF 0.3.73 shared libraries and real tokenizer archive.
The repository build script is unchanged. Original macOS static linking has not
been verified. No live PaddleOCR, LLM, production database, object store, search
index/retrieval or deployed application validation is claimed.

No private/user credentials are part of the fixtures. All fixture keys and model
IDs in the capture source are synthetic.
