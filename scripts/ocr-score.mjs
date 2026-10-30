import fs from "node:fs";
import path from "node:path";
import { createWorker } from "tesseract.js";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, "..");
const raw = path.join(root, "data", "raw");
const manifest = JSON.parse(fs.readFileSync(path.join(raw, "ocr-manifest.json"), "utf8"));
const pkg = require("tesseract.js/package.json");

function tokens(value) {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function alnum(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function levenshtein(left, right) {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current.push(Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost));
    }
    previous = current;
  }
  return previous[previous.length - 1];
}

function orderCer(truth, guess) {
  const a = alnum(truth);
  const b = alnum(guess);
  if (!a && !b) return 0;
  return levenshtein(a, b) / Math.max(a.length, b.length, 1);
}

function tokenCer(truth, guess) {
  const count = (list) => {
    const map = new Map();
    for (const token of list) map.set(token, (map.get(token) ?? 0) + 1);
    return map;
  };
  const a = tokens(truth);
  const b = tokens(guess);
  const left = count(a);
  const right = count(b);
  let diff = 0;
  for (const key of new Set([...left.keys(), ...right.keys()])) {
    diff += Math.abs((left.get(key) ?? 0) - (right.get(key) ?? 0));
  }
  return diff / Math.max(a.length, b.length, 1);
}

const worker = await createWorker("eng", 1, { cachePath: path.join(raw, "tesseract-cache") });
await worker.setParameters({ tessedit_pageseg_mode: "6" });
const pages = [];
for (const entry of manifest.pages) {
  const image = path.join(raw, "ocr-pages", `page-${String(entry.page).padStart(3, "0")}.png`);
  const truth = fs.readFileSync(path.join(raw, "ocr-truth", `page-${String(entry.page).padStart(3, "0")}.txt`), "utf8");
  const result = await worker.recognize(image);
  const guessDir = path.join(raw, "ocr-guess");
  fs.mkdirSync(guessDir, { recursive: true });
  fs.writeFileSync(path.join(guessDir, `page-${String(entry.page).padStart(3, "0")}.txt`), result.data.text);
  const score = Number(tokenCer(truth, result.data.text).toFixed(4));
  const order = Number(orderCer(truth, result.data.text).toFixed(4));
  pages.push({ page: entry.page, textLayer: entry.textLayer, cer: score, orderCer: order });
  console.log(`page ${entry.page} ${entry.textLayer} token ${score} order ${order}`);
}
await worker.terminate();
const report = {
  ...manifest,
  engine: `tesseract.js ${pkg.version}`,
  normalization: "Judged error ignores order: token counts of letters and digits. orderCer keeps character distance, which the PDF text layer inflates when its reading order is not the page.",
  pages,
};
fs.writeFileSync(path.join(root, "src", "data", "ocr-trial.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log("wrote src/data/ocr-trial.json");
