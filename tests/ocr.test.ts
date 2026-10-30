import assert from "node:assert/strict";
import test from "node:test";
import trial from "../src/data/ocr-trial.json";
import { judgeOcrSample, type OcrPageScore } from "../src/lib/ocr";

function pages(count: number, cer: number, textLayer: OcrPageScore["textLayer"] = "present"): OcrPageScore[] {
  return Array.from({ length: count }, (_, index) => ({ page: index + 1, textLayer, cer }));
}

test("a short sample stops the batch", () => {
  const judgment = judgeOcrSample(pages(7, 0.001));
  assert.equal(judgment.decision, "stop");
  assert.match(judgment.reason, /50/);
});

test("error above the line stops the batch", () => {
  const judgment = judgeOcrSample(pages(50, 0.05));
  assert.equal(judgment.decision, "stop");
  assert.match(judgment.reason, /above the line/);
});

test("a clean render under the line is measured and is not treated as a scan", () => {
  const judgment = judgeOcrSample(pages(50, 0.004));
  assert.equal(judgment.decision, "measured");
  assert.equal(judgment.pagesMissingText, 0);
  assert.match(judgment.reason, /not a scan/);
});

test("the stored Penal Code trial stops a batch and keeps no transcript", () => {
  const judgment = judgeOcrSample(trial.pages as OcrPageScore[]);
  assert.equal(trial.pages.length, 50);
  assert.equal(trial.pagesInFile, 145);
  assert.equal(trial.pagesMissingTextInFile, 0);
  assert.equal(judgment.decision, "stop");
  assert.ok((judgment.maxCer ?? 0) > 0.08);
  for (const page of trial.pages) assert.equal("text" in page, false);
});

test("one unscored page with no text layer stops the batch", () => {
  const sample = pages(49, 0.004);
  sample.push({ page: 50, textLayer: "missing", cer: null });
  const judgment = judgeOcrSample(sample);
  assert.equal(judgment.decision, "stop");
});
