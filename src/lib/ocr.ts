/** Limits fixed before the sample was scored. A later run does not move them. */
export const OCR_PAGES_REQUIRED = 50;
export const OCR_MEAN_CER_LIMIT = 0.02;
export const OCR_PAGE_CER_LIMIT = 0.08;

export interface OcrPageScore {
  page: number;
  textLayer: "present" | "missing";
  cer: number | null;
}

export interface OcrJudgment {
  decision: "stop" | "measured";
  reason: string;
  meanCer: number | null;
  maxCer: number | null;
  pagesScored: number;
  pagesMissingText: number;
}

export function judgeOcrSample(pages: OcrPageScore[]): OcrJudgment {
  const scored = pages.filter((page) => page.cer !== null);
  const cers = scored.map((page) => page.cer as number);
  const meanCer = cers.length ? cers.reduce((sum, value) => sum + value, 0) / cers.length : null;
  const maxCer = cers.length ? Math.max(...cers) : null;
  const pagesMissingText = pages.filter((page) => page.textLayer === "missing").length;
  const base = { meanCer, maxCer, pagesScored: cers.length, pagesMissingText };

  if (pages.length < OCR_PAGES_REQUIRED) {
    return {
      ...base,
      decision: "stop",
      reason: `Only ${pages.length} pages were in the sample. The check asks for ${OCR_PAGES_REQUIRED} before any batch.`,
    };
  }
  const overMean = meanCer === null || meanCer > OCR_MEAN_CER_LIMIT;
  const overPage = maxCer === null || maxCer > OCR_PAGE_CER_LIMIT;
  if (overMean || overPage) {
    return {
      ...base,
      decision: "stop",
      reason: "The error on the sample is above the line set before the run. Batch OCR stays off.",
    };
  }
  if (pagesMissingText === 0) {
    return {
      ...base,
      decision: "measured",
      reason: "The engine stayed under the error line on clean page images. Every scored page already had a text layer, so this was not a scan. Batch OCR of pages without a text layer stays off until that kind of page is reviewed.",
    };
  }
  const missingUnscored = pages.some((page) => page.textLayer === "missing" && page.cer === null);
  if (missingUnscored) {
    return {
      ...base,
      decision: "stop",
      reason: "A page with no text layer has no measured error. Batch OCR stays off.",
    };
  }
  return {
    ...base,
    decision: "measured",
    reason: "The sample includes pages that had no text layer, and the error stayed under the line. The transcript is still not copied into the catalog.",
  };
}
