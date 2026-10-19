// Playwright CLI run-code input, not a test runner or a replacement UI.
// Run after navigating to the existing current/models/en fixture.
// The CLI records the live browser continuously; pauses make states readable.
async (page) => {
  const results = {};
  const selector = page.getByTestId('image-ocr-model');
  const raw = page.getByTestId('raw-id');
  const saved = page.getByTestId('saved-payload');
  const pause = () => page.waitForTimeout(1100);

  await page.waitForFunction(() =>
    JSON.parse(document.querySelector('[data-testid=query-state]').textContent)
      .some((query) => query.status === 'success' && query.models === 3),
  );
  await pause();
  await selector.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await pause();
  await page.getByRole('dialog').getByText('PP-OCRv5', { exact: true }).click();
  if (await raw.textContent() !== JSON.stringify('synthetic-paddle-ocr')) {
    throw new Error('Real model selection failed');
  }
  await pause();
  await selector.click();
  await page.getByRole('dialog').waitFor({ state: 'visible' });
  await pause();
  await page.getByRole('dialog').getByText('DeepDoc', { exact: true }).click();
  await page.getByRole('button', { name: 'Save synthetic form', exact: true }).click();
  const deepdocPayload = JSON.parse(await saved.textContent());
  if (
    await raw.textContent() !== JSON.stringify('') ||
    deepdocPayload.setups[0].ocr_model_id !== '' ||
    JSON.stringify(deepdocPayload).includes('__image_ocr_deepdoc__') ||
    await selector.locator('.lucide-x').count() !== 0
  ) {
    throw new Error('DeepDoc mapping/save regression');
  }
  results.deepDoc = { rawId: '', saved: deepdocPayload, clearIcons: 0 };
  await page.waitForTimeout(1700);

  // Same previously captured held-request -> HTTP 503 missing-ID scenario.
  await page.goto('http://127.0.0.1:4173/?version=current&scenario=loading-error&lang=en');
  await selector.waitFor({ state: 'visible' });
  await page.waitForFunction(() =>
    JSON.parse(document.querySelector('[data-testid=query-state]').textContent)
      .some((query) => query.fetchStatus === 'fetching' && !query.fetched),
  );
  await pause();
  await page.getByRole('button', { name: 'Release loading → HTTP error', exact: true }).click();
  await page.locator('.actual-feature [role=alert]').waitFor({ state: 'visible' });
  await page.waitForFunction(() =>
    document.querySelector('[data-testid=image-ocr-model]').textContent === 'synthetic-deleted-model-id',
  );
  await page.getByRole('button', { name: 'Save synthetic form', exact: true }).click();
  const missingPayload = JSON.parse(await saved.textContent());
  const alertClass = await page.locator('.actual-feature [role=alert]').getAttribute('class');
  if (
    await raw.textContent() !== JSON.stringify('synthetic-deleted-model-id') ||
    missingPayload.setups[0].ocr_model_id !== 'synthetic-deleted-model-id' ||
    !alertClass?.includes('text-state-error')
  ) {
    throw new Error('Missing ID or final red alert regression');
  }
  results.missingError = {
    rawId: 'synthetic-deleted-model-id',
    saved: missingPayload,
    alertClass,
  };
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1700);
  results.layout = await page.evaluate(() => ({
    width: innerWidth,
    height: innerHeight,
    documentWidth: document.documentElement.scrollWidth,
  }));
  if (results.layout.documentWidth !== results.layout.width) {
    throw new Error('Horizontal overflow during recording');
  }
  console.log(JSON.stringify(results));
}
