import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import {
  allowComparative,
  auditPayload,
  buildChunks,
  composeAnswer,
  EMBEDDING_MODEL,
  feedbackAudit,
  parseAskResponse,
  parseSourceKind,
  parseVerdict,
  selectChunks,
  type AskFilters,
  type AskResponse,
  type DraftChunk,
  type FeedbackVerdict,
  type IndexSource,
} from "@/lib/retrieve";

export interface AskRequest {
  question?: string;
  placeId?: string;
  sectorIds?: string[];
  from?: string | number | null;
  to?: string | number | null;
  sourceKind?: string;
}

export interface AskActor {
  id: string;
  role: string;
}

function yearOrNull(value: string | number | null | undefined): { year: number | null; error: string | null } {
  if (value == null || value === "") return { year: null, error: null };
  const raw = String(value).trim();
  if (!/^\d{4}$/.test(raw)) return { year: null, error: "A year must be four digits." };
  const year = Number(raw);
  if (year < 1700 || year > 2100) return { year: null, error: "That year is outside the catalog range." };
  return { year, error: null };
}

function vectorLiteral(values: number[]): string {
  return `{${values.join(",")}}`;
}

async function scopeIds(table: "places" | "categories", ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const rows = await query<{ id: string }>(
    `with recursive tree as (
       select id from ${table} where id = any($1::text[])
       union all
       select child.id from ${table} child join tree on child.parent_id = tree.id
     )
     select id from tree`,
    [ids],
  );
  return rows.map((row) => row.id);
}

function groupNames(rows: { document_id: string; id: string; name: string }[]): Map<string, { id: string; name: string }[]> {
  const grouped = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const list = grouped.get(row.document_id) ?? [];
    if (!list.some((item) => item.id === row.id)) list.push({ id: row.id, name: row.name });
    grouped.set(row.document_id, list);
  }
  return grouped;
}

async function indexedChunks(client: PoolClient): Promise<DraftChunk[]> {
  const docs = await client.query<{
    id: string;
    title: string;
    document_type: string;
    published_year: number | null;
    accession: string;
    summary: string;
    rights_status: string;
    source_url: string | null;
    publisher: string | null;
    comparative: boolean;
  }>(
    `select id, title, document_type, published_year, accession, summary, rights_status, source_url, publisher, comparative
     from documents order by id`,
  );
  const [places, sectors] = await Promise.all([
    client.query<{ document_id: string; id: string; name: string }>(
      `select dp.document_id, p.id, p.name
       from document_places dp join places p on p.id = dp.place_id
       where not exists (
         select 1 from tag_overrides o
         where o.document_id = dp.document_id and o.kind = 'place' and o.action = 'remove' and o.target_id = p.id
       )
       union
       select o.document_id, p.id, p.name
       from tag_overrides o join places p on p.id = o.target_id
       where o.kind = 'place' and o.action = 'add'`,
    ),
    client.query<{ document_id: string; id: string; name: string }>(
      `select dc.document_id, c.id, c.name
       from document_categories dc join categories c on c.id = dc.category_id
       where not exists (
         select 1 from tag_overrides o
         where o.document_id = dc.document_id and o.kind = 'sector' and o.action = 'remove' and o.target_id = c.id
       )
       union
       select o.document_id, c.id, c.name
       from tag_overrides o join categories c on c.id = o.target_id
       where o.kind = 'sector' and o.action = 'add'`,
    ),
  ]);
  const placeMap = groupNames(places.rows);
  const sectorMap = groupNames(sectors.rows);
  const chunks = docs.rows.flatMap((doc) => {
    const source: IndexSource = {
      id: doc.id,
      title: doc.title,
      documentType: doc.document_type,
      year: doc.published_year,
      accession: doc.accession,
      summary: doc.summary,
      rights: doc.rights_status,
      url: doc.source_url,
      publisher: doc.publisher,
      comparative: doc.comparative,
      places: placeMap.get(doc.id) ?? [],
      sectors: sectorMap.get(doc.id) ?? [],
    };
    return buildChunks(source);
  });
  await client.query("delete from retrieval_chunks");
  for (const chunk of chunks) {
    await client.query(
      `insert into retrieval_chunks (
         id, document_id, position, source_kind, body, metadata_only, passage, page, section, year,
         place_ids, sector_ids, comparative, embedding, model_version
       ) values (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::float8[], $15
       )`,
      [
        chunk.id,
        chunk.documentId,
        Number(chunk.id.split(":").at(-1) ?? 0),
        chunk.sourceKind,
        chunk.body,
        chunk.metadataOnly,
        chunk.passage,
        chunk.page,
        chunk.section,
        chunk.year,
        chunk.placeIds,
        chunk.sectorIds,
        chunk.comparative,
        vectorLiteral(chunk.embedding),
        EMBEDDING_MODEL,
      ],
    );
  }
  return chunks;
}

async function storeAsk(client: PoolClient, actor: AskActor | null, answer: AskResponse): Promise<AskResponse> {
  const id = randomUUID();
  const stored: AskResponse = { ...answer, id };
  const audit = auditPayload(stored);
  await client.query(
    `insert into ask_log (id, actor_id, question, filters, prompt, chunk_ids, model_version, result_type, response)
     values ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb)`,
    [
      id,
      actor?.id ?? null,
      stored.query,
      JSON.stringify(stored.filters),
      stored.prompt,
      stored.chunk_ids,
      stored.model_version,
      stored.result_type,
      JSON.stringify(stored),
    ],
  );
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, detail)
     values ($1, 'ask.query', 'ask', $2, $3::jsonb)`,
    [actor?.id ?? null, id, JSON.stringify(audit)],
  );
  return stored;
}

export function askFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/retrieval_chunks|ask_log|ask_feedback/.test(message)) return "Retrieval is not installed on this database yet.";
  return "The shelf could not answer just now.";
}

export async function runAsk(
  request: AskRequest,
  actor: AskActor | null,
): Promise<{ status: number; body: AskResponse | { error: string } }> {
  const question = (request.question ?? "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (question.length < 3) return { status: 400, body: { error: "Ask a longer question." } };
  const from = yearOrNull(request.from);
  const to = yearOrNull(request.to);
  if (from.error || to.error) return { status: 400, body: { error: from.error ?? to.error ?? "Bad year." } };
  if (from.year != null && to.year != null && from.year > to.year) {
    return { status: 400, body: { error: "The start year is after the end year." } };
  }
  if (request.sourceKind && !parseSourceKind(request.sourceKind)) {
    return { status: 400, body: { error: "That source type is not on the shelf." } };
  }

  const placeId = request.placeId?.trim() || null;
  const sectorIds = [...new Set((request.sectorIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const place = placeId
    ? (await query<{ id: string; name: string; kind: string; parent_id: string | null }>(
        "select id, name, kind, parent_id from places where id = $1",
        [placeId],
      ))[0]
    : undefined;
  if (placeId && !place) return { status: 400, body: { error: "That place is not in the gazetteer." } };
  const sectorRows = sectorIds.length
    ? await query<{ id: string; name: string }>("select id, name from categories where id = any($1::text[])", [sectorIds])
    : [];
  if (sectorRows.length !== sectorIds.length) return { status: 400, body: { error: "One of those sectors is not in the index." } };

  const placeAssigned = place ? place.kind !== "district" || Boolean(place.parent_id) : true;
  const filters: AskFilters = {
    placeId,
    placeName: place?.name ?? null,
    placeAssigned,
    placeScope: placeId && placeAssigned ? await scopeIds("places", [placeId]) : [],
    sectorIds,
    sectorNames: sectorRows.map((row) => row.name),
    sectorScope: sectorIds.length ? await scopeIds("categories", sectorIds) : [],
    from: from.year,
    to: to.year,
    sourceKind: parseSourceKind(request.sourceKind),
    allowComparative: allowComparative(question),
  };

  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(404002)");
    const retrieve = filters.placeId && !filters.placeAssigned ? [] : selectChunks(question, await indexedChunks(client), filters);
    const answer = composeAnswer(question, filters, retrieve);
    const stored = await storeAsk(client, actor, answer);
    await client.query("commit");
    return { status: 200, body: stored };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function loadAsk(id: string, actorId: string | null): Promise<AskResponse | null> {
  const rows = await query<{ response: unknown }>(
    "select response from ask_log where id = $1 and actor_id is not distinct from $2::uuid",
    [id, actorId],
  );
  return parseAskResponse(rows[0]?.response) ;
}

export async function listAsks(actorId: string): Promise<{
  id: string;
  question: string;
  resultType: string;
  modelVersion: string;
  createdAt: string;
  chunkCount: number;
}[]> {
  const rows = await query<{
    id: string;
    question: string;
    result_type: string;
    model_version: string;
    created_at: Date;
    n: number;
  }>(
    `select id, question, result_type, model_version, created_at, cardinality(chunk_ids)::int as n
     from ask_log where actor_id = $1
     order by created_at desc limit 20`,
    [actorId],
  );
  return rows.map((row) => ({
    id: row.id,
    question: row.question,
    resultType: row.result_type,
    modelVersion: row.model_version,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    chunkCount: Number(row.n ?? 0),
  }));
}

export async function recordFeedback(
  askId: string,
  actor: AskActor,
  verdict: FeedbackVerdict,
  note: string,
): Promise<{ status: number; body: { id: string; verdict: FeedbackVerdict } | { error: string } }> {
  const found = await query<{ id: string }>(
    "select id from ask_log where id = $1 and (actor_id = $2 or actor_id is null)",
    [askId, actor.id],
  );
  if (!found[0]) return { status: 404, body: { error: "That question is not on the audit log." } };
  const id = randomUUID();
  const detail = feedbackAudit(askId, verdict, actor.role);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into ask_feedback (id, ask_id, actor_id, verdict, note) values ($1, $2, $3, $4, $5)`,
      [id, askId, actor.id, verdict, note],
    );
    await client.query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'ask.feedback', 'ask', $2, $3::jsonb)`,
      [actor.id, askId, JSON.stringify(detail)],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return { status: 200, body: { id, verdict } };
}

export { parseVerdict };
