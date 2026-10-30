import Link from "next/link";
import { SeriesChart } from "@/components/SeriesChart";
import { unsupportedUseCases, evaluateForecast, forReader } from "@/lib/forecast";
import { listIndicators } from "@/lib/queries";

export const metadata = { title: "Forecasts" };

export default async function ForecastPage() {
  const indicators = await listIndicators();
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Humble forecasts</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>A baseline, <em>or a refusal.</em></h1>
      <p className="deck">
        Year one compares a straight line with the last observed value, the training average, and a three-year rolling mean.
        The arithmetic is local. It is not a neural model, and an annual series has no season to average. A line is kept only when its holdout miss is lower than persistence. The forward figure stays off this page until an editor attaches a signed brief.
      </p>
      <p><Link href="/observatory">Observatory</Link> still shows the same series as history. This page decides whether a scenario may be drafted.</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.2rem" }}>Uses with no series</h2>
      {unsupportedUseCases.map((item) => (
        <article key={item.id} style={{ borderTop: "1px solid var(--rule)", padding: "0.9rem 0" }}>
          <p className="kicker">Insufficient data</p>
          <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0.2rem 0" }}>{item.name}</h3>
          <p style={{ margin: 0 }}>{item.reason}</p>
        </article>
      ))}
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.2rem", marginTop: "2rem" }}>Series on the shelf</h2>
      {indicators.length === 0 ? <p>No numeric series is stored.</p> : null}
      {indicators.map((series) => {
        const evaluation = forReader(evaluateForecast(series.observations), false);
        return (
          <article key={series.code} style={{ borderTop: "1px solid var(--rule)", padding: "1rem 0 1.4rem" }}>
            <p className="kicker">{evaluation.label}</p>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0.2rem 0 0.4rem" }}>{series.name}</h3>
            <SeriesChart series={series} />
            <p>
              Model {evaluation.modelVersion}. {evaluation.observations} observations.
              {evaluation.trainEnd ? ` Training ends ${evaluation.trainEnd}. Evaluation years ${evaluation.testYears.join(", ")}.` : " Too few years to hold any out."}
            </p>
            {evaluation.persistenceMae != null ? (
              <p>
                Holdout miss: last value {evaluation.persistenceMae}, training mean {evaluation.longRunMeanMae}, rolling three-year mean {evaluation.rollingMeanMae}, straight line {evaluation.linearMae}.
                {evaluation.beatsPersistence
                  ? " The straight line beat persistence. The forward figure is not published on this page."
                  : " The straight line did not beat the last observed value, so no scenario is issued."}
              </p>
            ) : (
              <p>Insufficient data. No scenario is issued.</p>
            )}
            <p className="muted">{evaluation.seasonalNote} {evaluation.limitations.join(" ")}</p>
          </article>
        );
      })}
    </div>
  );
}
