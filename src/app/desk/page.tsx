import Link from "next/link";
import { AskPanel } from "@/components/AskPanel";
import { getSessionUser } from "@/lib/auth";
import { askFailure, listAsks, loadAsk, runAsk } from "@/lib/ask-query";
import { groupSearchPlaces } from "@/lib/search";
import { runDeskQuery } from "@/lib/desk-query";
import { questionTypes } from "@/lib/evidence";
import { listCategories, listPeople, listSearchPlaces } from "@/lib/queries";
import type { AskResponse } from "@/lib/retrieve";

export const metadata = { title: "Evidence desk" };

function many(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function EvidenceDeskPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const place = one(raw.place);
  const sector = many(raw.sector).filter(Boolean);
  const question = one(raw.question) || "historical";
  const from = one(raw.from);
  const to = one(raw.to);
  const q = one(raw.q);
  const entity = one(raw.entity);
  const packRequested = Boolean(place || sector.length || q || from || to || entity);
  const askText = one(raw.ask).trim();
  const storedAsk = one(raw.asked).trim();
  const user = await getSessionUser();
  const [places, sectors, people] = await Promise.all([listSearchPlaces(), listCategories(), listPeople()]);
  const groups = groupSearchPlaces(places);
  const result = packRequested
    ? await runDeskQuery({ placeId: place, sectorIds: sector, from, to, questionType: question, keywords: q, entityId: entity })
    : null;
  const body = result && "records" in result.body ? result.body : null;
  const error = result && "error" in result.body ? result.body.error : null;
  let askAnswer: AskResponse | null = null;
  let askError: string | null = null;
  if (askText) {
    try {
      const asked = await runAsk({
        question: askText,
        placeId: one(raw.askPlace),
        sectorIds: many(raw.askSector),
        from: one(raw.askFrom),
        to: one(raw.askTo),
        sourceKind: one(raw.source),
      }, user ? { id: user.id, role: user.role } : null);
      if ("sentences" in asked.body) askAnswer = asked.body;
      else askError = asked.body.error;
    } catch (caught) {
      askError = askFailure(caught);
    }
  } else if (storedAsk) {
    try {
      askAnswer = await loadAsk(storedAsk, user?.id ?? null);
      if (!askAnswer) askError = "That question is not on your shelf.";
    } catch (caught) {
      askError = askFailure(caught);
    }
  }
  let history: { id: string; question: string; resultType: string; modelVersion: string; createdAt: string }[] = [];
  if (user) {
    try {
      history = await listAsks(user.id);
    } catch {
      history = [];
    }
  }

  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Evidence desk</p>
      <h1 className="display" style={{ fontSize: "clamp(3rem, 6vw, 4.8rem)" }}>What the shelf <em>can hold.</em></h1>
      <p className="muted" style={{ maxWidth: "40rem" }}>
        Choose a place and a sector. The desk returns a cited pack, or it says the evidence is not good enough. Ask the shelf quotes notes it is allowed to index. Catalog notes are not quotations. Investigation files stay separate.
      </p>
      <p><Link href="/desk/files">Investigation files</Link> · <Link href="/desk/briefs">Foresight briefs</Link></p>
      <form action="/desk" method="get" className="filters" style={{ marginTop: "1rem" }}>
        {askText ? <input type="hidden" name="ask" value={askText} /> : null}
        {one(raw.askPlace) ? <input type="hidden" name="askPlace" value={one(raw.askPlace)} /> : null}
        {one(raw.askSector) ? <input type="hidden" name="askSector" value={one(raw.askSector)} /> : null}
        {one(raw.source) ? <input type="hidden" name="source" value={one(raw.source)} /> : null}
        {one(raw.askFrom) ? <input type="hidden" name="askFrom" value={one(raw.askFrom)} /> : null}
        {one(raw.askTo) ? <input type="hidden" name="askTo" value={one(raw.askTo)} /> : null}
        <label>Place
          <select name="place" defaultValue={place}>
            <option value="">Choose a place</option>
            <optgroup label="Provinces">
              {groups.provinces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </optgroup>
            {groups.districts.map((group) => (
              <optgroup key={group.province} label={`${group.province} districts`}>
                {group.places.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </optgroup>
            ))}
            {groups.unassigned.length ? (
              <optgroup label="Districts without a province join">
                {groups.unassigned.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label>Sector
          <select name="sector" multiple defaultValue={sector} size={6}>
            {sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Question
          <select name="question" defaultValue={question}>
            {questionTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>From<input name="from" defaultValue={from} inputMode="numeric" /></label>
        <label>To<input name="to" defaultValue={to} inputMode="numeric" /></label>
        <label>Keywords<input name="q" defaultValue={q} /></label>
        <label>Entity
          <select name="entity" defaultValue={entity}>
            <option value="">Any</option>
            {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
        </label>
        <button className="solid" type="submit">Read the shelf</button>
      </form>
      <AskPanel
        groups={groups}
        sectors={sectors}
        values={{
          ask: askText,
          askPlace: one(raw.askPlace),
          askSector: one(raw.askSector),
          askFrom: one(raw.askFrom),
          askTo: one(raw.askTo),
          source: one(raw.source),
        }}
        evidence={{ place, sector, question, from, to, q, entity }}
        answer={askAnswer}
        error={askError}
        review={one(raw.review)}
        history={history}
        signedIn={Boolean(user)}
      />

      {error ? <p className="warning">{error}</p> : null}
      {body ? (
        <div className="desk" style={{ marginTop: "1.4rem" }}>
          <div>
            <p className="kicker">{body.result_type === "evidence_pack" ? "Evidence pack" : body.result_type === "refused" ? "Refused" : "Insufficient evidence"} · {body.confidence}</p>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2.2rem", margin: "0.2rem 0 0.6rem" }}>{body.scope}</h2>
            {body.result_type === "insufficient" ? (
              <p>The shelf does not currently hold enough documented material to answer this question.</p>
            ) : null}
            {body.result_type === "evidence_pack" ? (
              <p>{body.records.length} records matched. Each citation is a catalog record, not a quotation from the publisher.</p>
            ) : null}
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Records</h3>
            {body.records.length === 0 ? <p>No record is listed.</p> : null}
            <div className="rows">
              {body.records.map((record) => (
                <Link key={record.id} href={`/documents/${record.id}`}>
                  <span className="mono">{record.accession}</span>
                  <span className="mono">{record.year ?? "—"}</span>
                  <span className="mono">{record.metadataOnly ? "Metadata" : "Text held"}</span>
                  <span className="row-title">{record.title}</span>
                </Link>
              ))}
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Timeline</h3>
            {body.timeline.length === 0 ? <p>No dated item.</p> : null}
            <ul>
              {body.timeline.map((item, index) => (
                <li key={`${item.recordId}-${index}`}><span className="mono">{item.year ?? "Undated"}</span> {item.label}</li>
              ))}
            </ul>
            <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Citations</h3>
            <ul>
              {body.citations.map((item) => (
                <li key={item.accession}>
                  {item.citation} {item.url ? <a href={item.url}>Publisher</a> : null}
                </li>
              ))}
            </ul>
          </div>
          <aside>
            <div className="margin-note">
              <h2>Filters</h2>
              <p>{body.filters.placeName ?? "No place"} · {body.filters.sectorNames.join(", ") || "No sector"}</p>
              <p className="mono">{body.filters.from ?? "…"}–{body.filters.to ?? "…"} · {body.query}</p>
            </div>
            <div className="margin-note">
              <h2>Places, sectors, entities</h2>
              <p>{body.places.map((item) => item.name).join(", ") || "None"}</p>
              <p>{body.sectors.map((item) => item.name).join(", ") || "None"}</p>
              <p>{body.entities.map((item) => item.name).join(", ") || "None"}</p>
            </div>
            <div className="margin-note warning">
              <h2>Gaps</h2>
              {body.gaps.map((gap) => <p key={gap.code}>{gap.detail}</p>)}
            </div>
            <div className="margin-note">
              <h2>Method and limitations</h2>
              {body.limitations.map((line) => <p key={line}>{line}</p>)}
            </div>
          </aside>
        </div>
      ) : (
        <div className="margin-note" style={{ marginTop: "1.2rem" }}>
          <h2>Method</h2>
          <p>A pack needs a place, a sector, at least three matching records, and a date span the records actually cover. An uncertain district is left empty. A policy question is not answered from metadata alone. The pack search is lexical. Ask-the-shelf uses a local hash and quotes the note it retrieved. Overrides are applied. Nothing here is a forecast.</p>
        </div>
      )}
    </div>
  );
}
