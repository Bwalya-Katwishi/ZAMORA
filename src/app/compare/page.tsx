import Link from "next/link";
import { CatalogList } from "@/components/CatalogList";
import { yearSpan } from "@/lib/format";
import { getEvent, listEvents } from "@/lib/queries";

export const metadata = { title: "Compare" };

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const events = await listEvents();
  const leftId = one(params.left) ?? "capital-lusaka-1935";
  const rightId = one(params.right) ?? "independence-1964";
  const [left, right] = await Promise.all([getEvent(leftId), getEvent(rightId)]);

  return (
    <div className="frame" style={{ padding: "1.3rem 0 2rem" }}>
      <p className="kicker">Comparison</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.6rem)" }}>Two moments, <em>side by side.</em></h1>
      <p>Juxtaposition is not a claim that the moments are the same kind of event.</p>
      <form action="/compare" method="get" className="filters">
        <label>Left
          <select name="left" defaultValue={leftId}>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
        </label>
        <label>Right
          <select name="right" defaultValue={rightId}>
            {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
          </select>
        </label>
        <button className="solid" type="submit">Set them together</button>
      </form>
      <div className="compare" style={{ marginTop: "1rem" }}>
        {[left, right].map((event) => (
          <article key={event?.id ?? "missing"} className="fact">
            {event ? (
              <>
                <p className="kicker">{yearSpan(event.startYear, event.endYear)}</p>
                <h2><Link href={`/events/${event.id}`}>{event.title}</Link></h2>
                <p>{event.summary}</p>
                <p className="mono">{event.dateNote}</p>
                <CatalogList items={event.documents} />
              </>
            ) : <p>That event is not on the shelf.</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
