import Link from "next/link";
import { CoverageChart } from "@/components/CoverageChart";
import { SeriesChart } from "@/components/SeriesChart";
import { yearSpan } from "@/lib/format";
import { coverageByDecade, getScenario, getScenarios, listIndicators } from "@/lib/queries";

export const metadata = { title: "Observatory" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ObservatoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const scenarios = await getScenarios();
  const requested = one(params.question) ?? scenarios[0]?.id;
  const scenario = requested ? await getScenario(requested) : null;
  const [indicators, coverage] = await Promise.all([
    listIndicators(scenario?.id),
    coverageByDecade(),
  ]);

  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Evidence observatory</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>What the figures <em>will not say.</em></h1>
      <p><Link href="/forecast">Forecasts</Link> compare a line with persistence. A losing line is withheld.</p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: "1rem", margin: "1rem 0 1.4rem" }}>
        {scenarios.map((item) => (
          <Link key={item.id} href={`/observatory?question=${item.id}`} aria-current={item.id === scenario?.id ? "page" : undefined}>
            {item.categoryName}
          </Link>
        ))}
      </nav>
      {scenario ? (
        <article className="obs">
          <header>
            <p className="mono">Status: {scenario.status.replaceAll("_", " ")}. No forecast is issued from this page.</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.2rem", letterSpacing: "-0.03em", margin: "0.3rem 0" }}>{scenario.question}</h2>
          </header>
          <div className="compare">
            <article className="fact">
              <p className="kicker">Assumptions</p>
              <p>{scenario.assumptions}</p>
            </article>
            <article className="gap">
              <p className="kicker">Not claimed</p>
              <p>{scenario.notClaimed}</p>
            </article>
          </div>
          <p>{scenario.methodNote}</p>
          <div className="timeline">
            {scenario.events.map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <time>{yearSpan(event.startYear, event.endYear)}</time>
                <strong>{event.title}</strong>
              </Link>
            ))}
          </div>
          {indicators.length === 0 ? <p>No numeric series is attached. The historical sources still stand, and no chart is drawn to fill the silence.</p> : null}
          {indicators.map((series) => <SeriesChart key={series.code} series={series} />)}
        </article>
      ) : null}
      <div className="section-head">
        <h2>Coverage of this shelf</h2>
      </div>
      <p className="muted">Works in the ZAMORA catalog, by decade of publication. This is not a count of events that happened.</p>
      <CoverageChart rows={coverage} />
    </div>
  );
}
