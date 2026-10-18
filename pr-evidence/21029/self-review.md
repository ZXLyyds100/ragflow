# Two-pass review — RAGFlow #21029

## Pass 1: end-to-end ownership and input/output correctness

Traced actual title/manual form → Zod → both operator bridges and canvas save
transform → schema-derived CleanComponentParams whitelist → builtin params →
Title dispatcher/standalone group/hierarchy/manual → source records → grouping →
media materialization → cap exemption → crop → decorator ID/upload.

Changes stay on the owning Go/frontend paths. No second context algorithm,
Python changes, migrations, dependency/lock/workflow edits or shared UI changes.

Found and fixed before publication:

- Float/negative/NaN/overflow/bool/null budgets must not be truncated or ignored.
  Update now returns an error to all four constructors. 72 invalid constructor
  cases cover both fields and nine invalid representations.
- Root-heading materialization can change the body after context token counting.
  Context-bearing media counts are refreshed after the existing root prefix.
- Form load previously discarded both values. Both schema and load/save paths
  now retain the independent windows; Manual's cap/heading behavior is unchanged.
- A second-pass adversarial case exposed two different captionless images
  sharing identical context and colliding on a body-only ID (same object key
  uploaded twice). Added actual failing regressions first, then kept original
  payload/reference identity plus final contextual body and document in their
  keys. The common crop-ID helper now honors stamped IDs as the decorator does.
  Zero-window output remains unchanged. Repeated related full/race suites.

## Pass 2: boundaries, defaults, policy and delivery

- Zero/omitted runtime output is deep-equal across five entry points. All existing
  chunker tests pass, including captionless image identity and table wire tests.
- Manual context collects only after physical sort. Group and hierarchy collect
  from source records before generated heading copies/cap-split text can enter it.
- Uses General's existing complete-sentence collector, spreadsheet boundary
  guard and tokenization. No context state lives on the reusable component;
  invocation and sheet boundary regressions pass.
- Media bytes/references/positions remain untouched. Context is final before
  crop and decorator hashing; upload-ID regression passes. Media stays atomic
  even when a complete context sentence exceeds the title cap.
- Actual book/paper/manual template cleaning, serialized config, construction and
  mixed text/table/image output are covered for five budget pairs each.
- Frontend form/bridge/default tests and production build pass. Full frontend
  suite and type-check baseline limitations are compared, not concealed.
- Browser fixture invokes the real compiled Go components after saving the real
  source form; source parser records and local storage API are clearly labeled
  fixtures. No claims about live OCR, production DB or hosted Linux CI.
- Prior PR's macOS library setup is reused only as a disclosed link environment.
  Overlay maps point to this independent checkout; no Go logic is overlaid.
- Existing maintainer-controlled CI label/CLA/workflow gates are not bypassed.

Final remote competition, body/media loading and review/CI audit remain delivery
steps and must be recorded after publication. These are self-reviews, not
independent human maintainer approvals.
