import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { evaluateForecast, forReader, publicationDecision, refuseUseCase } from "../src/lib/forecast";

function line(start: number, count: number, value: (year: number) => number) {
  return Array.from({ length: count }, (_, index) => ({ year: start + index, value: value(start + index) }));
}

test("a short series is insufficient and scores nobody", () => {
  const result = evaluateForecast(line(2010, 8, (year) => year));
  assert.equal(result.status, "insufficient");
  assert.equal(result.scenario, null);
  assert.equal(result.individual, false);
  assert.equal(JSON.stringify(result).includes("riskScore"), false);
  assert.equal(publicationDecision(result, true).ok, false);
});

test("a flat series does not beat persistence", () => {
  const result = evaluateForecast(line(2000, 16, () => 5));
  assert.equal(result.status, "withheld");
  assert.equal(result.beatsPersistence, false);
  assert.equal(result.scenario, null);
  assert.equal(result.seasonalMae, null);
  assert.match(result.seasonalNote, /annual/);
  assert.ok(result.persistenceMae != null && result.longRunMeanMae != null && result.rollingMeanMae != null);
});

test("a straight line beats last-value persistence and stays unpublished", () => {
  const result = evaluateForecast(line(2000, 16, (year) => year));
  assert.equal(result.status, "candidate");
  assert.equal(result.beatsPersistence, true);
  assert.equal(result.label, "evidence-based scenario");
  assert.equal(result.modelVersion, "zamora-baseline-v1");
  assert.ok(result.scenario != null && result.holdoutSpread);
  assert.ok(result.holdoutSpread.low <= result.scenario && result.scenario <= result.holdoutSpread.high);
  assert.equal(result.published, false);
  assert.equal(publicationDecision(result, false).ok, false);
  const published = forReader(result, false);
  assert.equal(published.scenario, null);
  assert.equal(publicationDecision(result, true).ok, true);
});

test("rainfall and disease stay refused", () => {
  const rainfall = refuseUseCase("rainfall");
  const disease = refuseUseCase("disease");
  assert.equal(rainfall?.status, "insufficient");
  assert.match(disease?.reason ?? "", /does not score an individual/);
  assert.equal(disease?.individual, false);
  assert.equal(refuseUseCase("not-a-series"), null);
});

test("stored World Bank series never score an individual", () => {
  const file = JSON.parse(readFileSync(new URL("../data/indicators/worldbank-zmb.json", import.meta.url), "utf8")) as {
    series: { code: string; observations: { year: number; value: number }[] }[];
  };
  assert.equal(file.series.length, 4);
  for (const series of file.series) {
    const result = evaluateForecast(series.observations);
    assert.equal(result.individual, false);
    assert.ok(["insufficient", "withheld", "candidate"].includes(result.status));
    assert.equal(forReader(result, false).published, false);
    if (result.status === "candidate") assert.equal(publicationDecision(result, false).ok, false);
  }
});
