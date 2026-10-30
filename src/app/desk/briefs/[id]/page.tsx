import Link from "next/link";
import { notFound } from "next/navigation";
import { allows, getSessionUser } from "@/lib/auth";
import { formatClaimLines, formatScenarioLines } from "@/lib/foresight";
import { loadBrief } from "@/lib/foresight-store";

export const metadata = { title: "Foresight brief" };

function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function BriefPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const raw = await searchParams;
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) {
    return (
      <div className="frame" style={{ padding: "1.6rem 0 2.5rem" }}>
        <p className="kicker">Foresight brief</p>
        <p><a href="/login">Sign in to open a brief</a></p>
      </div>
    );
  }
  const brief = await loadBrief(id, user);
  if (!brief) notFound();
  const body = brief.body;
  const error = one(raw.error);
  return (
    <div className="frame" style={{ padding: "1.3rem 0 2.5rem" }}>
      <p className="kicker">Foresight brief · {brief.status === "signed" ? "Signed" : brief.status === "in_review" ? "In review" : "Draft"} · v{brief.version}</p>
      <h1 className="display" style={{ fontSize: "clamp(2.6rem, 5vw, 4.2rem)" }}>{body.title}</h1>
      <p><Link href="/desk/briefs">All briefs</Link> · <Link href="/desk">Evidence desk</Link></p>
      {one(raw.saved) ? <p className="mono">Draft stored.</p> : null}
      {one(raw.reviewed) ? <p className="mono">Review stored. The brief is still unsigned.</p> : null}
      {one(raw.signed) ? <p className="mono">Signed. Export is open only if the citation check is clear and a source is on the brief.</p> : null}
      {one(raw.export) === "blocked" ? <p className="warning">Export stayed on the desk.</p> : null}
      {error ? <p className="warning">{error}</p> : null}
      <p className="muted" style={{ maxWidth: "40rem" }}>{body.placeName ?? "No place"} · {body.sectorNames.join(", ") || "No sector"} · {body.from ?? "…"}–{body.to ?? "…"} · {body.confidence}</p>
      <p style={{ maxWidth: "40rem" }}>{body.question}</p>
      <div className="desk" style={{ marginTop: "1rem" }}>
        <div>
          {brief.permissions.edit ? (
            <form action={`/api/briefs/${brief.id}`} method="post" className="ruled">
              <label>Title<input name="title" defaultValue={body.title} /></label>
              <label>Key patterns
                <textarea name="patterns" defaultValue={formatClaimLines(body.patterns, body.sources)} placeholder="One claim a line, with an accession already on this brief." />
              </label>
              <label>Current signals
                <textarea name="signals" defaultValue={formatClaimLines(body.signals, body.sources)} />
              </label>
              <label>Historical parallels
                <textarea name="parallels" defaultValue={formatClaimLines(body.parallels, body.sources)} />
              </label>
              <label>Possible scenarios
                <textarea name="scenarios" defaultValue={formatScenarioLines(body.scenarios)} placeholder="One scenario a line. A scenario is not a prediction." />
              </label>
              <label>Recommended questions
                <textarea name="questions" defaultValue={body.questions.join("\n")} />
              </label>
              <button className="solid" type="submit">Store this version</button>
            </form>
          ) : (
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Key patterns</h2>
              {body.patterns.length === 0 ? <p>No pattern has been written.</p> : null}
              {body.patterns.map((claim) => <p key={claim.id}>{claim.text}</p>)}
              <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Possible scenarios</h2>
              {body.scenarios.length === 0 ? <p>No scenario has been written.</p> : null}
              {body.scenarios.map((scenario) => <p key={scenario.id}>Scenario: {scenario.text}</p>)}
            </div>
          )}
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, marginTop: "1.2rem" }}>Evidence reviewed</h2>
          {body.evidence.length === 0 ? <p>No shelf record was placed on this brief.</p> : null}
          {body.evidence.map((claim) => <p key={claim.id}>{claim.text}</p>)}
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Historical timeline</h2>
          {body.timeline.length === 0 ? <p>No dated item.</p> : null}
          <ul>
            {body.timeline.map((item, index) => <li key={`${item.sourceId}-${index}`}><span className="mono">{item.year ?? "Undated"}</span> {item.label}</li>)}
          </ul>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500 }}>Scope and method</h2>
          <p>{body.scope}</p>
          <p>{body.method}</p>
        </div>
        <aside>
          <div className="margin-note warning">
            <h2>Citation checker</h2>
            {brief.warnings.length === 0 ? <p>No citation warning. Export still waits for a signature if the brief is unsigned.</p> : null}
            {brief.warnings.map((warning) => <p key={`${warning.code}-${warning.detail}`}>{warning.detail}</p>)}
          </div>
          <div className="margin-note">
            <h2>Evidence</h2>
            {body.sources.length === 0 ? <p>No source.</p> : null}
            {body.sources.map((source) => (
              <p key={source.id}><span className="mono">{source.accession}</span> {source.title}{source.url ? <> <a href={source.url}>Publisher</a></> : null}</p>
            ))}
          </div>
          <div className="margin-note">
            <h2>Gaps</h2>
            {body.gaps.length === 0 ? <p>No gap sentence was stored.</p> : null}
            {body.notShown.map((line) => <p key={line}>{line}</p>)}
            <p>{body.uncertainty}</p>
          </div>
          <div className="margin-note">
            <h2>Scenarios</h2>
            <p>A scenario is a scenario. It is not a prediction, and it is not a finding.</p>
            {body.scenarios.length === 0 ? <p>None written.</p> : null}
            {body.scenarios.map((scenario) => <p key={scenario.id}>{scenario.label}: {scenario.text}</p>)}
          </div>
          <div className="margin-note">
            <h2>Review and sign-off</h2>
            {brief.reviewNote ? <p>{brief.reviewerName}, {brief.reviewerRole}, {brief.reviewedAt?.slice(0, 10)}: {brief.reviewNote}</p> : <p>No review yet.</p>}
            {brief.signature ? <p>{brief.signerName}, {brief.signerRole}, {brief.signedAt?.slice(0, 10)}. Signature: {brief.signature}.</p> : <p>No signature. This brief is not published.</p>}
            {brief.permissions.review ? (
              <form action={`/api/briefs/${brief.id}/review`} method="post" className="ruled">
                <label>Review note<textarea name="note" required minLength={12} placeholder="What you checked, in a sentence." /></label>
                <button className="text-button" type="submit">Store the review</button>
              </form>
            ) : null}
            {brief.permissions.sign ? (
              <form action={`/api/briefs/${brief.id}/sign`} method="post" className="ruled">
                <label>Signature<input name="signature" placeholder={user.name} /></label>
                <button className="solid" type="submit">Sign</button>
              </form>
            ) : null}
          </div>
          <div className="margin-note">
            <h2>Export</h2>
            <p>Markdown, PDF, DOCX, and a CSV of the sources. Closed without a source, without a clear citation check, or without a signature.</p>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {(["markdown", "pdf", "docx", "csv"] as const).map((format) => (
                <form key={format} action={`/api/briefs/${brief.id}/export`} method="post">
                  <input type="hidden" name="format" value={format} />
                  <button className="text-button" type="submit">{format}</button>
                </form>
              ))}
            </div>
          </div>
          <div className="margin-note">
            <h2>Version history</h2>
            <ul>
              {brief.versions.map((version) => (
                <li key={version.version}><span className="mono">v{version.version}</span> {version.createdAt.slice(0, 10)} {version.editor}: {version.note}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
