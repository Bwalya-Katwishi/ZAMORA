"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DocCard, InvestigationDetail } from "@/lib/types";

export function DeskEditor({ detail, catalog }: { detail: InvestigationDetail; catalog: DocCard[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [statement, setStatement] = useState("");
  const [note, setNote] = useState("");
  const [claimId, setClaimId] = useState(detail.claims[0]?.id ?? "");
  const [documentId, setDocumentId] = useState(detail.sources[0]?.id ?? "");
  const [stance, setStance] = useState("supports");
  const [evidenceNote, setEvidenceNote] = useState("");

  async function send(url: string, body: unknown) {
    setError("");
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error ?? "The desk could not save that.");
      return;
    }
    router.refresh();
  }

  const matches = catalog
    .filter((item) => `${item.title} ${item.accession}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="desk">
      <div>
        <p className="kicker">Evidence ledger</p>
        <table className="ledger">
          <thead>
            <tr>
              <th>Claim</th>
              <th>Status</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {detail.claims.length === 0 ? (
              <tr>
                <td colSpan={3}>No claim filed. A claim is a sentence you are willing to hang a source on.</td>
              </tr>
            ) : (
              detail.claims.map((claim) => (
                <tr key={claim.id}>
                  <td>{claim.statement}</td>
                  <td className="mono">{claim.status}</td>
                  <td>
                    {claim.evidence.length === 0 ? "None attached." : null}
                    {claim.evidence.map((item) => (
                      <div key={item.id} className={`stance-${item.stance}`}>
                        {item.stance}
                        {item.documentTitle ? ` · ${item.documentTitle}` : ""}
                        {item.note ? ` — ${item.note}` : ""}
                      </div>
                    ))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <form
          className="ruled"
          style={{ marginTop: "1rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            void send(`/api/investigations/${detail.id}/claims`, { statement }).then(() => setStatement(""));
          }}
        >
          <label htmlFor="claim">File a claim</label>
          <textarea id="claim" value={statement} onChange={(event) => setStatement(event.target.value)} required minLength={8} />
          <button className="solid" type="submit" style={{ marginTop: "0.6rem" }}>Add to the ledger</button>
        </form>
        {detail.claims.length > 0 ? (
          <form
            className="ruled"
            style={{ marginTop: "1rem" }}
            onSubmit={(event) => {
              event.preventDefault();
              void send(`/api/investigations/${detail.id}/evidence`, {
                claimId,
                stance,
                note: evidenceNote,
                documentId: documentId || null,
              }).then(() => setEvidenceNote(""));
            }}
          >
            <label htmlFor="stance">Attach evidence</label>
            <select id="claim-select" value={claimId} onChange={(event) => setClaimId(event.target.value)} aria-label="Claim">
              {detail.claims.map((claim) => (
                <option key={claim.id} value={claim.id}>{claim.statement.slice(0, 80)}</option>
              ))}
            </select>
            <select value={stance} onChange={(event) => setStance(event.target.value)} aria-label="Stance">
              <option value="supports">Supports</option>
              <option value="contradicts">Contradicts</option>
              <option value="context">Context</option>
            </select>
            <select value={documentId} onChange={(event) => setDocumentId(event.target.value)} aria-label="Source on the desk">
              <option value="">No document</option>
              {detail.sources.map((source) => (
                <option key={source.id} value={source.id}>{source.title}</option>
              ))}
            </select>
            <input value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} placeholder="What this source does for the claim" aria-label="Evidence note" />
            <button className="solid" type="submit">Attach</button>
          </form>
        ) : null}
      </div>
      <aside>
        <p className="kicker">Sources on the desk</p>
        <ul>
          {detail.sources.map((source) => (
            <li key={source.id}><a href={`/documents/${source.id}`}>{source.title}</a></li>
          ))}
          {detail.sources.length === 0 ? <li>None yet.</li> : null}
        </ul>
        <form
          className="ruled"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label htmlFor="find-source">Place a catalogued source</label>
          <input id="find-source" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title or accession" />
        </form>
        {matches.map((item) => (
          <button
            key={item.id}
            type="button"
            className="text-button"
            style={{ display: "block", marginTop: "0.45rem" }}
            onClick={() => void send(`/api/investigations/${detail.id}/sources`, { documentId: item.id })}
          >
            Place {item.accession}
          </button>
        ))}
        <form
          className="ruled"
          style={{ marginTop: "1.2rem" }}
          onSubmit={(event) => {
            event.preventDefault();
            void send(`/api/investigations/${detail.id}/notes`, { body: note }).then(() => setNote(""));
          }}
        >
          <label htmlFor="note">Private note</label>
          <textarea id="note" value={note} onChange={(event) => setNote(event.target.value)} required minLength={2} />
          <button className="solid" type="submit" style={{ marginTop: "0.5rem" }}>Save note</button>
        </form>
        <ul>
          {detail.notes.map((item) => (
            <li key={item.id}><span className="mono">{item.author}</span> — {item.body}</li>
          ))}
        </ul>
        <p><a href={`/api/investigations/${detail.id}/brief?style=chicago`}>Export a Chicago brief</a></p>
        {error ? <p className="warning">{error}</p> : null}
      </aside>
    </div>
  );
}
