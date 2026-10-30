import { definitionOfDone, PLAN_NOTE, weeks } from "@/data/plan";

export const metadata = { title: "90-day plan" };

export default function PlanPage() {
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Ninety days</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>What is built, <em>and what is not.</em></h1>
      <p className="deck">{PLAN_NOTE}</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Definition of done</h2>
      <ul>
        {definitionOfDone.map((item) => (
          <li key={item.id}>
            {item.done ? "Done." : "Open."} {item.label} {item.note}
          </li>
        ))}
      </ul>
      {weeks.map((week) => (
        <article key={week.week} style={{ borderTop: "1px solid var(--rule)", padding: "1rem 0" }}>
          <p className="kicker">Week {week.week} · {week.starts} · {week.status}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0.2rem 0 0.6rem" }}>{week.title}</h2>
          <p><strong>Goals.</strong> {week.goals}</p>
          <p><strong>Features.</strong> {week.features}</p>
          <p><strong>Data.</strong> {week.data}</p>
          <p><strong>Engineering.</strong> {week.engineering}</p>
          <p><strong>Tests.</strong> {week.tests}</p>
          <p><strong>Deliverables.</strong> {week.deliverables}</p>
          <p><strong>Demo.</strong> {week.demo}</p>
          <p><strong>Risks.</strong> {week.risks}</p>
          <p><strong>Success.</strong> {week.success}</p>
        </article>
      ))}
    </div>
  );
}
