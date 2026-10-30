import Link from "next/link";
import { listSources } from "@/lib/ops";

export const metadata = { title: "Governance" };

export default async function GovernancePage() {
  let sources: Record<string, unknown>[] = [];
  let missing = false;
  try {
    sources = await listSources();
  } catch {
    missing = true;
  }
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Governance</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 5rem)" }}>A license, <em>or no ingest.</em></h1>
      <p className="deck">
        Nothing is crawled. A source needs a license state before it is ingested. Metadata-only rows keep the text with the publisher. Restricted material is not displayed. An expired review blocks the next ingest. A takedown sets the source to blocked.
      </p>
      <p>States: public domain, open, publisher metadata only, request-based, partnership required, restricted, expired or under review. <Link href="/method">Method</Link></p>
      {missing ? <p>The source register is not installed on this database yet.</p> : null}
      {sources.map((source) => (
        <article key={String(source.id)} style={{ borderTop: "1px solid var(--rule)", padding: "0.9rem 0" }}>
          <p className="kicker">{String(source.license_state).replaceAll("_", " ")}</p>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, margin: "0.2rem 0" }}>{String(source.name)}</h2>
          <p>Access: {String(source.access_method)}</p>
          <p>Permitted: {String(source.permitted)}</p>
          <p>Prohibited: {String(source.prohibited)}</p>
          <p className="muted">
            Refresh: {String(source.refresh_schedule)}. Steward: {String(source.steward)}.
            Last license check: {source.last_checked ? String(source.last_checked) : "not recorded"}.
            Review: {source.review_on ? String(source.review_on) : "not set"}.
            Ingestion: {String(source.ingestion)}. OCR: {String(source.ocr_status)}.
          </p>
          <p>{String(source.notes)}</p>
        </article>
      ))}
    </div>
  );
}
