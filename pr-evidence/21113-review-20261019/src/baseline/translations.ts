// Exact feature-key excerpts read with git show from baseline f66e8362850f.
// Other strings use the real current locale files (outside the reviewed keys).
export const BaselineFeatureTranslations = {
  en: {
    imageOcr: 'OCR',
    imageOcrTip:
      'Extract text from uploaded images with local OCR or the selected PaddleOCR model. Vision enhancement adds descriptions independently of this switch.',
    imageOcrModel: 'OCR model',
    imageOcrLocal: 'Local OCR (default)',
    imageOcrModelTip:
      'Choose an added PaddleOCR or PaddleOCR.local model. Clear the selection to use local DeepDoc OCR. Turning OCR off keeps this choice but skips OCR; SVG text is read directly.',
    imageTextSourceRequired:
      'Images need a text source: keep OCR or vision enhancement on.',
  },
  zh: {
    imageOcr: 'OCR',
    imageOcrTip:
      '使用本地 OCR 或所选 PaddleOCR 模型提取图片文字。视觉增强独立于该开关，为图片补充描述。',
    imageOcrModel: 'OCR 模型',
    imageOcrLocal: '本地 OCR（默认）',
    imageOcrModelTip:
      '选择已添加的 PaddleOCR 或 PaddleOCR.local 模型；清空选择则使用本地 DeepDoc OCR。关闭 OCR 会保留选择但不执行 OCR；SVG 直接读取文字。',
    imageTextSourceRequired: '图片需要文本来源，请保留 OCR 或视觉增强。',
  },
};
