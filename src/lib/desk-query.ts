import { query } from "@/lib/db";
import {
  isMetadataOnly,
  judgeDesk,
  parseQuestionType,
  questionLabel,
  questionTypes,
  refusalFor,
  type DeskFilters,
  type DeskResponse,
  type QuestionType,
  type ShelfRecord,
} from "@/lib/evidence";

export interface DeskRequest {
  placeId?: string;
  sectorIds?: string[];
  from?: string | number | null;
  to?: string | number | null;
  questionType?: string;
  keywords?: string;
  entityId?: string;
}

function yearOrNull(value: string | number | null | undefined): { year: number | null; error: string | null } {
  if (value == null || value === "") return { year: null, error: null };
  const raw = String(value).trim();
  if (!/^\d{4}$/.test(raw)) return { year: null, error: "A year must be four digits." };
  const year = Number(raw);
  if (year < 1700 || year > 2100) return { year: null, error: "That year is outside the catalog range." };
  return { year, error: null };
}

function placeSql(index: number): string {
  return `exists (
    select 1 from places q
    where (q.id = $${index} or q.parent_id = $${index})
      and (
        exists (
          select 1 from document_places dp
          where dp.document_id = d.id and dp.place_id = q.id
            and not exists (
              select 1 from tag_overrides o
              where o.document_id = d.id and o.kind = 'place' and o.action = 'remove' and o.target_id = q.id
            )
        )
        or exists (
          select 1 from tag_overrides o
          where o.document_id = d.id and o.kind = 'place' and o.action = 'add' and o.target_id = q.id
        )
      )
  )`;
}

function sectorSql(index: number): string {
  return `exists (
    select 1 from categories c
    where (c.id = any($${index}::text[]) or c.parent_id = any($${index}::text[]))
      and (
        exists (
          select 1 from document_categories dc
          where dc.document_id = d.id and dc.category_id = c.id
            and not exists (
              select 1 from tag_overrides o
              where o.document_id = d.id and o.kind = 'sector' and o.action = 'remove' and o.target_id = c.id
            )
        )
        or exists (
          select 1 from tag_overrides o
          where o.document_id = d.id and o.kind = 'sector' and o.action = 'add' and o.target_id = c.id
        )
      )
  )`;
}

async function countWhere(where: string[], params: unknown[]): Promise<number> {
  const rows = await query<{ n: number }>(
    `select count(distinct d.id)::int as n from documents d ${where.length ? `where ${where.join(" and ")}` : ""}`,
    params,
  );
  return Number(rows[0]?.n ?? 0);
}

async function loadRecords(ids: string[]): Promise<ShelfRecord[]> {
  if (!ids.length) return [];
  const docs = await query<{
    id: string;
    title: string;
    document_type: string;
    published_year: number | null;
    accession: string;
    summary: string;
    rights_status: string;
    source_url: string | null;
    publisher: string | null;
    publication_place: string | null;
    container_title: string | null;
  }>(
    `select id, title, document_type, published_year, accession, summary, rights_status, source_url,
            publisher, publication_place, container_title
     from documents where id = any($1::text[])
     order by published_year nulls last, title`,
    [ids],
  );
  const [places, sectors, entities, events] = await Promise.all([
    query<{ document_id: string; id: string; name: string }>(
      `select dp.document_id, p.id, p.name
       from document_places dp join places p on p.id = dp.place_id
       where dp.document_id = any($1::text[])
         and not exists (
           select 1 from tag_overrides o
           where o.document_id = dp.document_id and o.kind = 'place' and o.action = 'remove' and o.target_id = p.id
         )
       union
       select o.document_id, p.id, p.name
       from tag_overrides o join places p on p.id = o.target_id
       where o.document_id = any($1::text[]) and o.kind = 'place' and o.action = 'add'`,
      [ids],
    ),
    query<{ document_id: string; id: string; name: string }>(
      `select dc.document_id, c.id, c.name
       from document_categories dc join categories c on c.id = dc.category_id
       where dc.document_id = any($1::text[])
         and not exists (
           select 1 from tag_overrides o
           where o.document_id = dc.document_id and o.kind = 'sector' and o.action = 'remove' and o.target_id = c.id
         )
       union
       select o.document_id, c.id, c.name
       from tag_overrides o join categories c on c.id = o.target_id
       where o.document_id = any($1::text[]) and o.kind = 'sector' and o.action = 'add'`,
      [ids],
    ),
    query<{ document_id: string; id: string; name: string; sort_name: string; kind: "person" | "institution" }>(
      `select dpe.document_id, p.id, p.name, p.sort_name, p.kind
       from document_people dpe join people p on p.id = dpe.person_id
       where dpe.document_id = any($1::text[])
         and not exists (
           select 1 from tag_overrides o
           where o.document_id = dpe.document_id and o.kind = 'entity' and o.action = 'remove' and o.target_id = p.id
         )
       union
       select o.document_id, p.id, p.name, p.sort_name, p.kind
       from tag_overrides o join people p on p.id = o.target_id
       where o.document_id = any($1::text[]) and o.kind = 'entity' and o.action = 'add'`,
      [ids],
    ),
    query<{ document_id: string; id: string; title: string; start_year: number | null }>(
      `select de.document_id, e.id, e.title, e.start_year
       from document_events de join events e on e.id = de.event_id
       where de.document_id = any($1::text[])`,
      [ids],
    ),
  ]);
  const grouped = <T extends { document_id: string }>(rows: T[]) => {
    const map = new Map<string, T[]>();
    for (const row of rows) {
      const list = map.get(row.document_id) ?? [];
      list.push(row);
      map.set(row.document_id, list);
    }
    return map;
  };
  const placeMap = grouped(places);
  const sectorMap = grouped(sectors);
  const entityMap = grouped(entities);
  const eventMap = grouped(events);
  return docs.map((doc) => ({
    id: doc.id,
    accession: doc.accession,
    title: doc.title,
    type: doc.document_type,
    year: doc.published_year,
    summary: doc.summary,
    rights: doc.rights_status,
    url: doc.source_url,
    metadataOnly: isMetadataOnly(doc.rights_status),
    publisher: doc.publisher,
    publicationPlace: doc.publication_place,
    container: doc.container_title,
    places: (placeMap.get(doc.id) ?? []).map((item) => ({ id: item.id, name: item.name })),
    sectors: (sectorMap.get(doc.id) ?? []).map((item) => ({ id: item.id, name: item.name })),
    entities: (entityMap.get(doc.id) ?? []).map((item) => ({
      id: item.id,
      name: item.name,
      sortName: item.sort_name,
      kind: item.kind,
    })),
    events: (eventMap.get(doc.id) ?? []).map((item) => ({ id: item.id, title: item.title, year: item.start_year })),
  }));
}

async function idsFor(where: string[], params: unknown[]): Promise<string[]> {
  const rows = await query<{ id: string }>(
    `select distinct d.id from documents d ${where.length ? `where ${where.join(" and ")}` : ""}`,
    params,
  );
  return rows.map((row) => row.id);
}

export async function runDeskQuery(request: DeskRequest): Promise<{ status: number; body: DeskResponse | { error: string } }> {
  const questionType = parseQuestionType(request.questionType);
  if (!questionType) return { status: 400, body: { error: "Choose a question type." } };
  const from = yearOrNull(request.from);
  const to = yearOrNull(request.to);
  if (from.error || to.error) return { status: 400, body: { error: from.error ?? to.error ?? "Bad year." } };
  if (from.year != null && to.year != null && from.year > to.year) {
    return { status: 400, body: { error: "The start year is after the end year." } };
  }

  const placeId = request.placeId?.trim() || null;
  const sectorIds = [...new Set((request.sectorIds ?? []).map((id) => id.trim()).filter(Boolean))];
  const keywords = (request.keywords ?? "").replace(/\s+/g, " ").trim().slice(0, 280);
  const entityId = request.entityId?.trim() || null;

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

  const entity = entityId
    ? (await query<{ id: string; name: string }>("select id, name from people where id = $1", [entityId]))[0]
    : undefined;
  if (entityId && !entity) return { status: 400, body: { error: "That entity is not on the shelf." } };

  const filters: DeskFilters = {
    placeId,
    placeName: place?.name ?? null,
    placeKind: place?.kind ?? null,
    placeAssigned: place ? place.kind !== "district" || Boolean(place.parent_id) : false,
    sectorIds,
    sectorNames: sectorRows.map((row) => row.name),
    from: from.year,
    to: to.year,
    questionType: questionType as QuestionType,
    keywords,
    entityId,
    entityName: entity?.name ?? null,
  };

  const refusal = refusalFor(filters);
  const shelfCount = await countWhere([], []);
  if (!refusal.allowed || !placeId || sectorIds.length === 0 || (place?.kind === "district" && !place.parent_id)) {
    return {
      status: 200,
      body: judgeDesk({ filters, records: [], shelfCount, placeRecordCount: 0, sectorRecordCount: 0, refusal }),
    };
  }

  const comparative = questionType === "comparative" ? [] : ["d.comparative = false"];
  const placeCount = await countWhere([...comparative, placeSql(1)], [placeId]);
  const sectorCount = await countWhere([...comparative, sectorSql(1)], [sectorIds]);

  const finalParams: unknown[] = [placeId, sectorIds];
  const finalWhere = [...comparative, placeSql(1), sectorSql(2)];
  if (from.year != null) {
    finalParams.push(from.year);
    finalWhere.push(`d.published_year >= $${finalParams.length}`);
  }
  if (to.year != null) {
    finalParams.push(to.year);
    finalWhere.push(`d.published_year <= $${finalParams.length}`);
  }
  if (keywords) {
    finalParams.push(keywords);
    finalWhere.push(`d.search_vector @@ websearch_to_tsquery('english', $${finalParams.length})`);
  }
  if (entityId) {
    finalParams.push(entityId);
    finalWhere.push(`(
      exists (
        select 1 from document_people dpe
        where dpe.document_id = d.id and dpe.person_id = $${finalParams.length}
          and not exists (
            select 1 from tag_overrides o
            where o.document_id = d.id and o.kind = 'entity' and o.action = 'remove' and o.target_id = dpe.person_id
          )
      )
      or exists (
        select 1 from tag_overrides o
        where o.document_id = d.id and o.kind = 'entity' and o.action = 'add' and o.target_id = $${finalParams.length}
      )
    )`);
  }

  let ids: string[] = [];
  try {
    ids = await idsFor(finalWhere, finalParams);
  } catch {
    return { status: 400, body: { error: "The keywords could not be read. Try a shorter phrase." } };
  }
  const records = await loadRecords(ids);
  return {
    status: 200,
    body: judgeDesk({
      filters,
      records,
      shelfCount,
      placeRecordCount: placeCount,
      sectorRecordCount: sectorCount,
      refusal,
    }),
  };
}

export function deskMethod() {
  return {
    product: "ZAMORA evidence desk",
    questionTypes: questionTypes.map((item) => item.label),
    search: "The pack uses lexical PostgreSQL search. Ask-the-shelf is separate: a local hash, zamora-hash-v1, stored as numeric arrays. No external model is called.",
    pack: "A pack needs a known place, a sector, at least three matching records, and years that cover a requested span of ten years or more. Confidence stays limited because the texts are not held.",
    insufficient: "The shelf does not currently hold enough documented material to answer this question.",
    refuses: [
      "A place outside Zambia, unless Zambia is also named",
      "Naming a suspect",
      "An individual diagnosis",
      "A certain election result",
      "An instruction embedded in the question",
      "An uncertain district, which receives no records from another place",
    ],
    label: questionLabel("historical"),
  };
}
