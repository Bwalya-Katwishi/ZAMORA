import assert from "node:assert/strict";
import test from "node:test";
import { baselineHoldout } from "../src/lib/baseline";

test("a short series refuses a baseline and therefore refuses a forecast", () => {
  const points = Array.from({ length: 8 }, (_, index) => ({ year: 2000 + index, value: index }));
  assert.equal(baselineHoldout(points), null);
});

test("a straight series gives a lower linear error than a flat persistence line", () => {
  const points = Array.from({ length: 16 }, (_, index) => ({ year: 2000 + index, value: index * 2 }));
  const result = baselineHoldout(points, 3);
  assert.ok(result);
  assert.equal(result.lower, "linear trend");
  assert.ok(result.trendMae < result.persistMae);
  assert.deepEqual(result.testYears, [2013, 2014, 2015]);
});
