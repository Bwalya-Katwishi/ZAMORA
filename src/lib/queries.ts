import { query } from "@/lib/db";
import { assessQuestion } from "@/lib/policy";
import { buildSearch, outsideZambiaQuery, type SearchInput, type SearchPlace } from "@/lib/search";
import type {
  CategoryRef,
  DocCard,
  DocumentDetail,
  EventRef,
  IndicatorSeries,
  PlaceRef,
  ScenarioDetail,
} from "@/lib/types";

interface DocRow {
  id: string;
  title: string;
  document_type: string;
  published_year: number | null;
  about_year_start: number | null;
  about_year_end: number | null;
  accession: string;
  summary: string;
  comparative: boolean;
  comparative_label: string | null;
  verification_status: string;
  rank: number;
  headline: string;
}

function card(row: DocRow): DocCard {
  return {
    id: row.id,
    title: row.title,
    type: row.document_type,
    publishedYear: row.published_year,
    aboutStart: row.about_year_start,
    aboutEnd: row.about_year_end,
    accession: row.accession,
    summary: row.summary,
    comparative: row.comparative,
    comparativeLabel: row.comparative_label,
    verification: row.verification_status,
    headline: row.headline,
  };
}

const cardSql = `
  select d.id, d.title, d.document_type, d.published_year, d.about_year_start, d.about_year_end,
         d.accession, d.summary, d.comparative, d.comparative_label, d.verification_status,
         0::float as rank, d.summary as headline
  from documents d
`;

export async function searchDocuments(input: SearchInput): Promise<{
  items: DocCard[];
  errors: string[];
  websearch: string;
  hiddenComparative: number;
  unknownPlace: boolean;
  outside: boolean;
}> {
  const built = buildSearch(input);
  const decision = assessQuestion([input.q, input.phrase, input.any].filter(Boolean).join(" "));
  if (!decision.allowed) {
    return {
      items: [],
      errors: [decision.message, ...built.errors],
      websearch: built.websearch,
      hiddenComparative: 0,
      unknownPlace: false,
      outside: decision.code === "outside_zambia",
    };
  }
  if (built.errors.length) {
    return {
      items: [],
      errors: built.errors,
      websearch: built.websearch,
      hiddenComparative: 0,
      unknownPlace: false,
      outside: outsideZambiaQuery(input.q ?? ""),
    };
  }
  let rows: DocRow[] = [];
  try {
    rows = await query<DocRow>(built.sql, built.params);
  } catch {
    return {
      items: [],
      errors: ["The query could not be read. Try a shorter phrase, or remove a stray quotation mark."],
      websearch: built.websearch,
      hiddenComparative: 0,
      unknownPlace: false,
      outside: false,
    };
  }
  let hiddenComparative = 0;
  if (input.comparative !== "include" && built.websearch) {
    const counted = await query<{ n: number }>(
      `select count(*)::int as n from documents d
       where d.comparative = true and d.search_vector @@ websearch_to_tsquery('english', $1)`,
      [built.websearch],
    );
    hiddenComparative = counted[0]?.n ?? 0;
  }
  let unknownPlace = false;
  if (input.place) {
    const known = await query<{ id: string }>(
      `select p.id from places p
       left join place_names pn on pn.place_id = p.id
       where p.id = $1 or lower(p.name) = lower($1) or lower(pn.name) = lower($1)
       limit 1`,
      [input.place],
    );
    unknownPlace = known.length === 0;
  }
  return {
    items: rows.map(card),
    errors: [],
    websearch: built.websearch,
    hiddenComparative,
    unknownPlace,
    outside: rows.length === 0 && outsideZambiaQuery(built.websearch || input.q || ""),
  };
}

export async function getDocument(id: string): Promise<DocumentDetail | null> {
  const rows = await query<
    DocRow & {
      published_on: string | null;
      publisher: string | null;
      publication_place: string | null;
      container_title: string | null;
      source_url: string | null;
      rights_status: string;
      zambia_relevance: string;
      language: string;
    }
  >(
    `select d.id, d.title, d.document_type, d.published_year, d.about_year_start, d.about_year_end,
            d.accession, d.summary, d.comparative, d.comparative_label, d.verification_status,
            0::float as rank, d.summary as headline,
            to_char(d.published_on, 'YYYY-MM-DD') as published_on,
            d.publisher, d.publication_place, d.container_title, d.source_url,
            d.rights_status, d.zambia_relevance, d.language
     from documents d where d.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  const [people, places, categories, events, corrections, overrides] = await Promise.all([
    query<{ id: string; name: string; sort_name: string; kind: "person" | "institution"; role: string }>(
      `select p.id, p.name, p.sort_name, p.kind, dp.role
       from document_people dp join people p on p.id = dp.person_id
       where dp.document_id = $1 order by dp.position`,
      [id],
    ),
    query<PlaceRef & { latitude: number | null; longitude: number | null }>(
      `select p.id, p.name, p.kind, p.latitude, p.longitude, p.note
       from document_places dp join places p on p.id = dp.place_id
       where dp.document_id = $1 order by p.name`,
      [id],
    ),
    query<CategoryRef & { parent_id: string | null }>(
      `select c.id, c.name, c.parent_id, c.description, c.layout, c.position
       from document_categories dc join categories c on c.id = dc.category_id
       where dc.document_id = $1 order by c.position`,
      [id],
    ),
    query<EventRef & { start_year: number | null; end_year: number | null; start_on: string | null; date_note: string; place_id: string | null; place_name: string | null; relation: string }>(
      `select e.id, e.title, e.summary, e.start_year, e.end_year,
              to_char(e.start_on, 'YYYY-MM-DD') as start_on, e.date_note, e.place_id,
              p.name as place_name, de.relation
       from document_events de
       join events e on e.id = de.event_id
       left join places p on p.id = e.place_id
       where de.document_id = $1
       order by e.start_year nulls last`,
      [id],
    ),
    query<{ id: string; note: string; created_at: string; author: string }>(
      `select c.id, c.note, c.created_at::text, u.name as author
       from corrections c join users u on u.id = c.author_id
       where c.document_id = $1 order by c.created_at desc`,
      [id],
    ),
    query<{ id: string; kind: "place" | "sector" | "entity"; action: "add" | "remove"; target_id: string; note: string; author: string; target_name: string }>(
      `select o.id::text, o.kind, o.action, o.target_id, o.note, u.name as author,
              coalesce(p.name, c.name, pe.name, o.target_id) as target_name
       from tag_overrides o
       join users u on u.id = o.author_id
       left join places p on o.kind = 'place' and p.id = o.target_id
       left join categories c on o.kind = 'sector' and c.id = o.target_id
       left join people pe on o.kind = 'entity' and pe.id = o.target_id
       where o.document_id = $1
       order by o.created_at`,
      [id],
    ),
  ]);
  return {
    ...card(row),
    publishedOn: row.published_on,
    publisher: row.publisher,
    publicationPlace: row.publication_place,
    container: row.container_title,
    sourceUrl: row.source_url,
    rights: row.rights_status,
    relevance: row.zambia_relevance,
    language: row.language,
    authors: people.map((person) => ({
      name: person.name,
      sortName: person.sort_name,
      kind: person.kind,
    })),
    people: people.map((person) => ({
      id: person.id,
      name: person.name,
      sortName: person.sort_name,
      kind: person.kind,
      role: person.role,
    })),
    places,
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      parentId: category.parent_id,
      description: category.description,
      layout: category.layout,
      position: category.position,
    })),
    events: events.map(mapEvent),
    corrections: corrections.map((item) => ({
      id: item.id,
      note: item.note,
      createdAt: item.created_at,
      author: item.author,
    })),
    overrides: overrides.map((item) => ({
      id: item.id,
      kind: item.kind,
      action: item.action,
      targetId: item.target_id,
      name: item.target_name,
      note: item.note,
      author: item.author,
    })),
  };
}

function mapEvent(row: {
  id: string;
  title: string;
  summary: string;
  start_year: number | null;
  end_year: number | null;
  start_on: string | null;
  date_note: string;
  place_id: string | null;
  place_name: string | null;
  relation?: string;
}): EventRef {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    startYear: row.start_year,
    endYear: row.end_year,
    startOn: row.start_on,
    dateNote: row.date_note,
    placeId: row.place_id,
    placeName: row.place_name,
    relation: row.relation,
  };
}

export async function listEvents(): Promise<EventRef[]> {
  const rows = await query<Parameters<typeof mapEvent>[0]>(
    `select e.id, e.title, e.summary, e.start_year, e.end_year,
            to_char(e.start_on, 'YYYY-MM-DD') as start_on, e.date_note, e.place_id, p.name as place_name
     from events e left join places p on p.id = e.place_id
     order by e.start_year nulls last, e.title`,
  );
  return rows.map(mapEvent);
}

export async function getEvent(id: string): Promise<(EventRef & { documents: DocCard[] }) | null> {
  const rows = await query<Parameters<typeof mapEvent>[0]>(
    `select e.id, e.title, e.summary, e.start_year, e.end_year,
            to_char(e.start_on, 'YYYY-MM-DD') as start_on, e.date_note, e.place_id, p.name as place_name
     from events e left join places p on p.id = e.place_id
     where e.id = $1`,
    [id],
  );
  const event = rows[0];
  if (!event) return null;
  const documents = await query<DocRow>(
    `${cardSql}
     join document_events de on de.document_id = d.id
     where de.event_id = $1
     order by d.published_year nulls last`,
    [id],
  );
  return { ...mapEvent(event), documents: documents.map(card) };
}

export async function countDocuments(): Promise<number> {
  const rows = await query<{ n: number }>("select count(*)::int as n from documents");
  return Number(rows[0]?.n ?? 0);
}

export async function listPeople(): Promise<{ id: string; name: string }[]> {
  return query<{ id: string; name: string }>("select id, name from people order by sort_name, name");
}

export async function listSearchPlaces(): Promise<SearchPlace[]> {
  return query<SearchPlace>(
    `select p.id, p.name, p.kind, parent.name as "parentName"
     from places p
     left join places parent on parent.id = p.parent_id
     where p.kind in ('province', 'district')
     order by p.name`,
  );
}

export async function listProvinces(): Promise<PlaceRef[]> {
  return query<PlaceRef>(
    `select id, name, kind, latitude, longitude, note
     from places where kind = 'province' order by name`,
  );
}

export async function listMappablePlaces(): Promise<PlaceRef[]> {
  return query<PlaceRef>(
    `select id, name, kind, latitude, longitude, note
     from places
     where latitude is not null and longitude is not null
     order by name`,
  );
}

export async function getPlace(id: string): Promise<PlaceRef | null> {
  const rows = await query<PlaceRef>("select id, name, kind, latitude, longitude, note from places where id = $1", [id]);
  return rows[0] ?? null;
}

export async function listCategories(): Promise<CategoryRef[]> {
  const rows = await query<CategoryRef & { parent_id: string | null }>(
    `select id, name, parent_id, description, layout, position from categories where active = true order by position, name`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    description: row.description,
    layout: row.layout,
    position: row.position,
  }));
}

export async function documentsForCategory(categoryId: string): Promise<DocCard[]> {
  const rows = await query<DocRow>(
    `${cardSql.replace("select ", "select distinct ")}
     join document_categories dc on dc.document_id = d.id
     where dc.category_id = $1 or dc.category_id in (select id from categories where parent_id = $1)
     order by d.published_year nulls last, d.title`,
    [categoryId],
  );
  return rows.map(card);
}

export async function documentsForPlace(placeId: string, from?: number, to?: number): Promise<DocCard[]> {
  const params: unknown[] = [placeId];
  let year = "";
  if (from) {
    params.push(from);
    year += ` and coalesce(d.about_year_end, d.published_year, d.about_year_start) >= $${params.length}`;
  }
  if (to) {
    params.push(to);
    year += ` and coalesce(d.about_year_start, d.published_year, d.about_year_end) <= $${params.length}`;
  }
  const rows = await query<DocRow>(
    `${cardSql.replace("select ", "select distinct ")}
     join document_places dp on dp.document_id = d.id
     where (dp.place_id = $1 or dp.place_id in (select id from places where parent_id = $1))
     ${year}
     order by d.published_year nulls last, d.title`,
    params,
  );
  return rows.map(card);
}

export async function coverageByDecade(): Promise<{ decade: number; count: number }[]> {
  const rows = await query<{ decade: number; count: number }>(
    `select (published_year / 10) * 10 as decade, count(*)::int as count
     from documents where published_year is not null
     group by 1 order by 1`,
  );
  return rows;
}

export async function getScenarios(): Promise<ScenarioDetail[]> {
  const rows = await query<{
    id: string;
    question: string;
    status: string;
    assumptions: string;
    not_claimed: string;
    method_note: string;
    category_name: string | null;
  }>(
    `select s.id, s.question, s.status, s.assumptions, s.not_claimed, s.method_note, c.name as category_name
     from scenarios s left join categories c on c.id = s.category_id
     order by s.id`,
  );
  return Promise.all(rows.map((row) => hydrateScenario(row)));
}

export async function getScenario(id: string): Promise<ScenarioDetail | null> {
  const rows = await query<{
    id: string;
    question: string;
    status: string;
    assumptions: string;
    not_claimed: string;
    method_note: string;
    category_name: string | null;
  }>(
    `select s.id, s.question, s.status, s.assumptions, s.not_claimed, s.method_note, c.name as category_name
     from scenarios s left join categories c on c.id = s.category_id
     where s.id = $1`,
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return hydrateScenario(row);
}

async function hydrateScenario(row: {
  id: string;
  question: string;
  status: string;
  assumptions: string;
  not_claimed: string;
  method_note: string;
  category_name: string | null;
}): Promise<ScenarioDetail> {
  const [events, documents] = await Promise.all([
    query<Parameters<typeof mapEvent>[0]>(
      `select e.id, e.title, e.summary, e.start_year, e.end_year, to_char(e.start_on, 'YYYY-MM-DD') as start_on,
              e.date_note, e.place_id, p.name as place_name
       from scenario_events se
       join events e on e.id = se.event_id
       left join places p on p.id = e.place_id
       where se.scenario_id = $1
       order by e.start_year`,
      [row.id],
    ),
    query<DocRow>(
      `${cardSql}
       join scenario_documents sd on sd.document_id = d.id
       where sd.scenario_id = $1
       order by d.published_year nulls last`,
      [row.id],
    ),
  ]);
  return {
    id: row.id,
    question: row.question,
    status: row.status,
    assumptions: row.assumptions,
    notClaimed: row.not_claimed,
    methodNote: row.method_note,
    categoryName: row.category_name,
    events: events.map(mapEvent),
    documents: documents.map(card),
  };
}

export async function listIndicators(scenarioId?: string): Promise<IndicatorSeries[]> {
  const rows = await query<{
    code: string;
    name: string;
    unit: string;
    caveat: string;
    source_name: string;
    source_url: string | null;
    retrieved_on: string;
    scenario_id: string | null;
  }>(
    `select code, name, unit, caveat, source_name, source_url, retrieved_on::text, scenario_id
     from indicators
     where ($1::text is null or scenario_id = $1)
     order by name`,
    [scenarioId ?? null],
  );
  const series = await Promise.all(
    rows.map(async (row) => {
      const observations = await query<{ year: number; value: number }>(
        `select year, value from indicator_observations where indicator_code = $1 order by year`,
        [row.code],
      );
      return {
        code: row.code,
        name: row.name,
        unit: row.unit,
        caveat: row.caveat,
        sourceName: row.source_name,
        sourceUrl: row.source_url,
        retrievedOn: row.retrieved_on,
        scenarioId: row.scenario_id,
        observations,
      } satisfies IndicatorSeries;
    }),
  );
  return series;
}

export async function homeShelf(): Promise<{
  documents: number;
  events: number;
  comparative: number;
  wire: string;
  shelf: DocCard[];
  eventsList: EventRef[];
}> {
  const [counts, shelf, eventsList, wire] = await Promise.all([
    query<{ documents: number; events: number; comparative: number }>(
      `select
         (select count(*)::int from documents) as documents,
         (select count(*)::int from events) as events,
         (select count(*)::int from documents where comparative) as comparative`,
    ),
    query<DocRow>(`${cardSql} order by d.published_year nulls last, d.title limit 8`),
    listEvents(),
    query<{ message: string }>("select message from ingestion_jobs where id = 'news-wire'"),
  ]);
  return {
    documents: counts[0]?.documents ?? 0,
    events: counts[0]?.events ?? 0,
    comparative: counts[0]?.comparative ?? 0,
    wire: wire[0]?.message ?? "No news wire is connected.",
    shelf: shelf.map(card),
    eventsList,
  };
}

export async function relatedDocuments(id: string): Promise<DocCard[]> {
  const rows = await query<DocRow>(
    `${cardSql}
     where d.id <> $1
       and (
         exists (
           select 1 from document_events a
           join document_events b on a.event_id = b.event_id
           where a.document_id = d.id and b.document_id = $1
         )
         or exists (
           select 1 from document_places a
           join document_places b on a.place_id = b.place_id
           where a.document_id = d.id and b.document_id = $1 and a.place_id <> 'zambia'
         )
       )
     order by d.published_year nulls last
     limit 6`,
    [id],
  );
  return rows.map(card);
}
