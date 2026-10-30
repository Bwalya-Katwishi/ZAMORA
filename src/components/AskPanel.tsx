import Link from "next/link";
import { askSourceFilters, feedbackVerdicts, type AskResponse } from "@/lib/retrieve";

const verdictLabel: Record<(typeof feedbackVerdicts)[number], string> = {
  helpful: "Helpful",
  incomplete: "Incomplete",
  wrong_source: "Wrong source",
  needs_review: "Needs review",
};

export function AskPanel({
  groups,
  sectors,
  values,
  evidence,
  answer,
  error,
  review,
  history,
  signedIn,
}: {
  groups: {
    provinces: { id: string; name: string }[];
    districts: { province: string; places: { id: string; name: string }[] }[];
    unassigned: { id: string; name: string }[];
  };
  sectors: { id: string; name: string }[];
  values: { ask: string; askPlace: string; askSector: string; askFrom: string; askTo: string; source: string };
  evidence: { place: string; sector: string[]; question: string; from: string; to: string; q: string; entity: string };
  answer: AskResponse | null;
  error: string | null;
  review: string | null;
  history: { id: string; question: string; resultType: string; modelVersion: string; createdAt: string }[];
  signedIn: boolean;
}) {
  return (
    <section style={{ marginTop: "1.6rem" }}>
      <p className="kicker">Ask the shelf</p>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "2rem", margin: "0.2rem 0 0.4rem" }}>A note, or a refusal.</h2>
      <p className="muted" style={{ maxWidth: "40rem" }}>
        The question is a filter. A numbered sentence is catalog text already stored, or a licensed passage with a page. A line marked synthesis is not a catalog fact and not a finding. Editor overrides change place and sector before anything is scored. Filters are what you chose. Evidence not found stays blank.
      </p>
      <form action="/desk" method="get" className="filters" style={{ marginTop: "0.8rem" }}>
        {evidence.place ? <input type="hidden" name="place" value={evidence.place} /> : null}
        {evidence.sector.map((id) => <input key={id} type="hidden" name="sector" value={id} />)}
        {evidence.question ? <input type="hidden" name="question" value={evidence.question} /> : null}
        {evidence.from ? <input type="hidden" name="from" value={evidence.from} /> : null}
        {evidence.to ? <input type="hidden" name="to" value={evidence.to} /> : null}
        {evidence.q ? <input type="hidden" name="q" value={evidence.q} /> : null}
        {evidence.entity ? <input type="hidden" name="entity" value={evidence.entity} /> : null}
        <label>Question
          <input name="ask" defaultValue={values.ask} />
        </label>
        <label>Place
          <select name="askPlace" defaultValue={values.askPlace}>
            <option value="">Any place</option>
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
          <select name="askSector" defaultValue={values.askSector}>
            <option value="">Any sector</option>
            {sectors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>Source
          <select name="source" defaultValue={values.source}>
            <option value="">Any source</option>
            {askSourceFilters.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
        <label>From<input name="askFrom" defaultValue={values.askFrom} inputMode="numeric" /></label>
        <label>To<input name="askTo" defaultValue={values.askTo} inputMode="numeric" /></label>
        <button className="solid" type="submit">Ask the shelf</button>
      </form>
      {error ? <p className="warning">{error}</p> : null}
      {review === "helpful" || review === "incomplete" || review === "wrong_source" || review === "needs_review" ? (
        <p className="mono">Review stored: {verdictLabel[review]}.</p>
      ) : null}
      {review === "missing" ? <p className="warning">That question is not on the audit log.</p> : null}
      {answer ? <AnswerView answer={answer} signedIn={signedIn} /> : null}
      {signedIn && history.length ? (
        <div className="margin-note" style={{ marginTop: "1rem" }}>
          <h2>Your questions</h2>
          <ul>
            {history.map((item) => (
              <li key={item.id}>
                <Link href={`/desk?asked=${item.id}`}>{item.question}</Link>
                <span className="mono"> {item.resultType} · {item.modelVersion}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function AnswerView({ answer, signedIn }: { answer: AskResponse; signedIn: boolean }) {
  return (
    <div className="desk" style={{ marginTop: "1rem" }}>
      <div>
        <p className="kicker">
          {answer.result_type === "answer" ? "Cited notes" : answer.result_type === "refused" ? "Refused" : "Insufficient evidence"}
          {" · "}{answer.confidence} · {answer.model_version}
        </p>
        {answer.result_type !== "answer" ? <p>{answer.limitations[0]}</p> : null}
        {answer.contradiction.flagged ? <p className="warning">{answer.contradiction.detail}</p> : null}
        {answer.sentences.map((sentence, index) =>
          sentence.kind === "synthesis" ? (
            <p key={`${sentence.kind}-${index}`} className="ask-extract"><span className="kicker">Synthesis</span> {sentence.text}</p>
          ) : (
            <p key={sentence.chunkId ?? index} className="ask-extract"><sup>{sentence.marker}</sup>{sentence.text}</p>
          ),
        )}
        {answer.citations.length ? (
          <details className="margin-note" open>
            <summary>Citations</summary>
            <ol>
              {answer.citations.map((citation) => (
                <li key={citation.chunkId}>
                  <span className="mono">{citation.marker} · {citation.accession}</span> {citation.title}
                  {citation.page != null ? ` p. ${citation.page}` : ""}{citation.section ? `, ${citation.section}` : ""}.{" "}
                  <span className="mono">{citation.passage ? "Licensed passage" : "Catalog note"}</span>
                  {citation.url ? <> <a href={citation.url}>Publisher</a></> : null}
                </li>
              ))}
            </ol>
          </details>
        ) : null}
        {answer.id && signedIn ? (
          <form action="/api/ask/feedback" method="post" style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "0.8rem" }}>
            <input type="hidden" name="askId" value={answer.id} />
            {feedbackVerdicts.map((verdict) => (
              <button key={verdict} className="text-button" type="submit" name="verdict" value={verdict}>{verdictLabel[verdict]}</button>
            ))}
          </form>
        ) : null}
        {answer.id && !signedIn ? <p className="muted">Sign in to record whether this was helpful, incomplete, the wrong source, or in need of review.</p> : null}
      </div>
      <aside>
        <div className="margin-note">
          <h2>Confidence and limitations</h2>
          {answer.limitations.slice(answer.result_type === "answer" ? 0 : 1).map((line) => <p key={line}>{line}</p>)}
        </div>
      </aside>
    </div>
  );
}
