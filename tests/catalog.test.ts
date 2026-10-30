import assert from "node:assert/strict";
import test from "node:test";
import { documents } from "../src/data/documents";
import { scenarios } from "../src/data/scenarios";
import { validateCatalog } from "../src/lib/integrity";

test("the catalog is Zambian, sourced, and free of placeholder text", () => {
  const issues = validateCatalog();
  assert.deepEqual(issues, []);
  assert.ok(documents.length >= 30);
  assert.equal(documents.filter((document) => document.comparative).length, 1);
  assert.equal(documents.find((document) => document.comparative)?.comparativeLabel?.includes("Katanga"), true);
});

test("scenarios do not claim a forecast", () => {
  for (const scenario of scenarios) {
    assert.notEqual(scenario.status, "forecast");
    assert.match(scenario.notClaimed, /No /);
    assert.ok(scenario.documents.length > 0);
  }
});
