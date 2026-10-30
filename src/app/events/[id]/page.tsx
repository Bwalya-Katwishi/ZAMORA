import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogList } from "@/components/CatalogList";
import { yearSpan } from "@/lib/format";
import { getEvent } from "@/lib/queries";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  return { title: event?.title ?? "Event" };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEvent(id);
  if (!event) notFound();
  return (
    <div className="frame" style={{ padding: "1.4rem 0 2.5rem", maxWidth: "46rem" }}>
      <p className="kicker">Event · {yearSpan(event.startYear, event.endYear)}</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>{event.title}</h1>
      {event.startOn ? <p className="mono">{event.startOn}</p> : null}
      <p>{event.summary}</p>
      <p className="warning">{event.dateNote}</p>
      {event.placeId ? <p><Link href={`/atlas?place=${event.placeId}`}>{event.placeName ?? "Place"}</Link></p> : null}
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Sources linked to this event</h2>
      {event.documents.length === 0 ? (
        <p>No study of this event is on the shelf yet. The absence is part of the record.</p>
      ) : (
        <CatalogList items={event.documents} />
      )}
    </div>
  );
}
