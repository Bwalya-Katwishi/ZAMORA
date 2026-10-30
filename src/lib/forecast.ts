import type { Point } from "@/lib/baseline";

export const MODEL_VERSION = "zamora-baseline-v1";

export const unsupportedUseCases = [
  {
    id: "rainfall",
    name: "Seasonal rainfall and drought",
    reason: "No rainfall series is stored. A drought forecast is not issued.",
  },
  {
    id: "maize-price",
    name: "Maize-price pressure",
    reason: "No maize-price series is stored. A price forecast is not issued.",
  },
  {
    id: "water-service",
    name: "Water-service disruption",
    reason: "No water-service series is stored. A disruption forecast is not issued.",
  },
  {
    id: "disease",
    name: "Disease-outbreak reporting",
    reason: "No outbreak series is stored. The shelf does not score an individual.",
  },
  {
    id: "mining",
    name: "Mining and energy signal",
    reason: "No mining-activity series is stored. Electricity access is a national annual series and is not a mine forecast.",
  },
] as const;

export type UseCaseId = (typeof unsupportedUseCases)[number]["id"];

export interface ForecastEvaluation {
  status: "insufficient" | "withheld" | "candidate";
  modelVersion: typeof MODEL_VERSION;
  observations: number;
  trainEnd: number | null;
  testYears: number[];
  persistenceMae: number | null;
  longRunMeanMae: number | null;
  rollingMeanMae: number | null;
  seasonalMae: null;
  seasonalNote: string;
  linearMae: number | null;
  beatsPersistence: boolean;
  nextYear: number | null;
  scenario: number | null;
  holdoutSpread: { low: number; high: number } | null;
  label: "insufficient data" | "withheld" | "evidence-based scenario";
  assumptions: string[];
  limitations: string[];
  individual: false;
  published: boolean;
}

const SEASONAL =
  "The stored series are annual. No within-year season is on the shelf, so a seasonal average is not computed.";

const ASSUMPTIONS = [
  "The training window is every stored year except the last three.",
  "The evaluation window is those last three years.",
  "The candidate is a straight line fitted to the training years.",
  "Persistence is the last training value, held flat.",
  "The long-run mean is the average of the training years. It is not a seasonal cycle.",
  "The rolling mean is the average of the last three training years.",
  SEASONAL,
];

const LIMITATIONS = [
  "The comparison is an average miss on the holdout. It is not a chance of being right.",
  "No individual is scored.",
  "A national annual series is not a district forecast.",
  "External publication waits for a signed foresight brief.",
];

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function meanAbsolute(errors: number[]): number {
  return errors.reduce((sum, value) => sum + value, 0) / errors.length;
}

function fit(points: Point[]): { intercept: number; slope: number } {
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.year, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.value, 0) / n;
  let num = 0;
  let den = 0;
  for (const point of points) {
    num += (point.year - meanX) * (point.value - meanY);
    den += (point.year - meanX) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: meanY - slope * meanX };
}

function empty(observations: number, status: ForecastEvaluation["status"]): ForecastEvaluation {
  return {
    status,
    modelVersion: MODEL_VERSION,
    observations,
    trainEnd: null,
    testYears: [],
    persistenceMae: null,
    longRunMeanMae: null,
    rollingMeanMae: null,
    seasonalMae: null,
    seasonalNote: SEASONAL,
    linearMae: null,
    beatsPersistence: false,
    nextYear: null,
    scenario: null,
    holdoutSpread: null,
    label: status === "insufficient" ? "insufficient data" : "withheld",
    assumptions: ASSUMPTIONS,
    limitations: LIMITATIONS,
    individual: false,
    published: false,
  };
}

export function evaluateForecast(points: Point[], holdout = 3): ForecastEvaluation {
  const ordered = [...points].sort((a, b) => a.year - b.year);
  if (ordered.length < 12 || holdout < 2 || ordered.length - holdout < 8) return empty(ordered.length, "insufficient");
  const train = ordered.slice(0, -holdout);
  const test = ordered.slice(-holdout);
  const last = train[train.length - 1].value;
  const persistenceMae = meanAbsolute(test.map((point) => Math.abs(point.value - last)));
  const longRun = train.reduce((sum, point) => sum + point.value, 0) / train.length;
  const longRunMeanMae = meanAbsolute(test.map((point) => Math.abs(point.value - longRun)));
  const window = train.slice(-3);
  const rolling = window.reduce((sum, point) => sum + point.value, 0) / window.length;
  const rollingMeanMae = meanAbsolute(test.map((point) => Math.abs(point.value - rolling)));
  const line = fit(train);
  const predicted = (year: number) => line.intercept + line.slope * year;
  const linearMae = meanAbsolute(test.map((point) => Math.abs(point.value - predicted(point.year))));
  const beats = linearMae < persistenceMae;
  const base: ForecastEvaluation = {
    ...empty(ordered.length, beats ? "candidate" : "withheld"),
    trainEnd: train[train.length - 1].year,
    testYears: test.map((point) => point.year),
    persistenceMae: round(persistenceMae),
    longRunMeanMae: round(longRunMeanMae),
    rollingMeanMae: round(rollingMeanMae),
    linearMae: round(linearMae),
    beatsPersistence: beats,
    label: beats ? "evidence-based scenario" : "withheld",
  };
  if (!beats) return base;
  const residuals = test.map((point) => point.value - predicted(point.year));
  const mean = residuals.reduce((sum, value) => sum + value, 0) / residuals.length;
  const variance = residuals.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (residuals.length - 1);
  const spread = Math.sqrt(variance);
  const nextYear = ordered[ordered.length - 1].year + 1;
  const scenario = predicted(nextYear);
  return {
    ...base,
    nextYear,
    scenario: round(scenario),
    holdoutSpread: { low: round(scenario - spread), high: round(scenario + spread) },
  };
}

export function refuseUseCase(id: string): { id: string; name: string; status: "insufficient"; reason: string; individual: false } | null {
  const found = unsupportedUseCases.find((item) => item.id === id);
  if (!found) return null;
  return { id: found.id, name: found.name, status: "insufficient", reason: found.reason, individual: false };
}

export function publicationDecision(evaluation: ForecastEvaluation, signedBrief: boolean): { ok: boolean; reason: string } {
  if (evaluation.individual !== false) return { ok: false, reason: "An individual score is not published." };
  if (evaluation.status !== "candidate" || !evaluation.beatsPersistence) {
    return { ok: false, reason: "A withheld or insufficient result is not published." };
  }
  if (!signedBrief) return { ok: false, reason: "External publication waits for a signed foresight brief." };
  return { ok: true, reason: "The candidate beat persistence and a signed brief is attached." };
}

export function forReader(evaluation: ForecastEvaluation, approved: boolean): ForecastEvaluation {
  if (approved && evaluation.status === "candidate") return { ...evaluation, published: true };
  return { ...evaluation, scenario: null, holdoutSpread: null, nextYear: null, published: false };
}
