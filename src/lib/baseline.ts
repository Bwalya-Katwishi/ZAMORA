export interface Point {
  year: number;
  value: number;
}

export interface BaselineResult {
  holdout: number;
  persistMae: number;
  trendMae: number;
  trainEnd: number;
  testYears: number[];
  lower: "persistence" | "linear trend" | "tie";
}

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

export function baselineHoldout(points: Point[], holdout = 3): BaselineResult | null {
  const ordered = [...points].sort((a, b) => a.year - b.year);
  if (ordered.length < 12 || holdout < 2 || ordered.length - holdout < 8) return null;
  const train = ordered.slice(0, -holdout);
  const test = ordered.slice(-holdout);
  const last = train[train.length - 1].value;
  const persistMae = meanAbsolute(test.map((point) => Math.abs(point.value - last)));
  const line = fit(train);
  const trendMae = meanAbsolute(
    test.map((point) => Math.abs(point.value - (line.intercept + line.slope * point.year))),
  );
  const lower = persistMae === trendMae ? "tie" : persistMae < trendMae ? "persistence" : "linear trend";
  return {
    holdout,
    persistMae: round(persistMae),
    trendMae: round(trendMae),
    trainEnd: train[train.length - 1].year,
    testYears: test.map((point) => point.year),
    lower,
  };
}
