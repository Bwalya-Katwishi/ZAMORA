import { baselineHoldout } from "@/lib/baseline";
import { formatValue } from "@/lib/format";
import type { IndicatorSeries } from "@/lib/types";

export function SeriesChart({ series }: { series: IndicatorSeries }) {
  const points = series.observations;
  if (points.length < 2) {
    return <p>This series does not have enough published observations to draw.</p>;
  }
  const width = 640;
  const height = 220;
  const pad = { l: 44, r: 12, t: 16, b: 28 };
  const years = points.map((point) => point.year);
  const values = points.map((point) => point.value);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const span = maxY - minY || 1;
  const x = (year: number) => pad.l + ((year - years[0]) / (years[years.length - 1] - years[0])) * (width - pad.l - pad.r);
  const y = (value: number) => pad.t + (1 - (value - minY) / span) * (height - pad.t - pad.b);
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"}${x(point.year).toFixed(1)} ${y(point.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const baseline = baselineHoldout(points, 3);
  return (
    <figure>
      <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${series.name}. Latest published value ${formatValue(last.value, series.unit)} in ${last.year}.`}>
        <line x1={pad.l} y1={height - pad.b} x2={width - pad.r} y2={height - pad.b} stroke="#141c24" strokeWidth="1" />
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={height - pad.b} stroke="#141c24" strokeWidth="1" />
        <path d={path} fill="none" stroke="#1a5c56" strokeWidth="1.6" />
        <text x={pad.l} y={12}>{formatValue(maxY, series.unit)}</text>
        <text x={pad.l} y={height - 8}>{years[0]}</text>
        <text x={width - 48} y={height - 8}>{years[years.length - 1]}</text>
      </svg>
      <figcaption className="mono">
        {series.name}. Unit: {series.unit}. Latest published observation: {last.year}, {formatValue(last.value, series.unit)}. Source: {series.sourceName}, retrieved {series.retrievedOn.slice(0, 10)}.
        {series.sourceUrl ? <> <a href={series.sourceUrl}>Source page</a>.</> : null}
      </figcaption>
      <p>{series.caveat}</p>
      {baseline ? (
        <p>
          Baseline check, not a forecast. Holding out {baseline.testYears[0]}–{baseline.testYears[baseline.testYears.length - 1]}, a flat line at the {baseline.trainEnd} value missed by {baseline.persistMae} on average, and a straight line fitted to the earlier years missed by {baseline.trendMae}. The lower error was the {baseline.lower}. That is arithmetic on this series. It is not a prediction and not a cause.
        </p>
      ) : (
        <p>Too few observations for a baseline comparison. No forecast is issued.</p>
      )}
    </figure>
  );
}
