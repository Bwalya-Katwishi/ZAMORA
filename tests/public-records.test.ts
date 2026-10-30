import assert from "node:assert/strict";
import test from "node:test";
import { documents } from "../src/data/documents";
import { publicRecords } from "../src/data/public-records";
import { validateCatalog } from "../src/lib/integrity";

test("the public-record sample is linked metadata, not copied text", () => {
  assert.equal(validateCatalog().length, 0);
  assert.equal(publicRecords.length, 14);
  const hansard = publicRecords.filter((record) => record.id.startsWith("hansard-"));
  const judgments = publicRecords.filter((record) => record.url?.includes("/judgment/"));
  assert.equal(hansard.length, 6);
  assert.equal(judgments.length, 5);
  for (const record of publicRecords) {
    assert.match(record.url ?? "", /^https:\/\//);
    assert.match(record.rights, /not (copied|stored)/i);
    assert.equal(documents.some((item) => item.id === record.id), true);
  }
  assert.match(publicRecords.find((record) => record.id === "hansard-2026-04-16")?.title ?? "", /16thApril/);
});
