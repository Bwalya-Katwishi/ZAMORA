export interface SearchInput {
  q?: string;
  phrase?: string;
  any?: string;
  exclude?: string;
  place?: string;
  category?: string;
  type?: string;
  author?: string;
  from?: string;
  to?: string;
  dateField?: string;
  comparative?: string;
}

export interface BuiltSearch {
  sql: string;
  params: unknown[];
  websearch: string;
  errors: string[];
}

const MAX = 280;

function clean(value: string | undefined, limit = MAX): string {
  return (value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function stripQuotes(value: string): string {
  return value.replace(/["“”]/g, "").trim();
}

export function composeWebSearch(input: SearchInput): { text: string; errors: string[] } {
  const errors: string[] = [];
  const parts: string[] = [];
  const q = clean(input.q);
  const phrase = stripQuotes(clean(input.phrase, 160));
  const any = clean(input.any, 160);
  const exclude = clean(input.exclude, 160);

  if (q) parts.push(q);
  if (phrase) parts.push(`"${phrase}"`);
  if (any) {
    const terms = any.split(/[, ]+/).map((term) => term.trim()).filter(Boolean).slice(0, 8);
    if (terms.length) parts.push(`(${terms.join(" OR ")})`);
  }
  if (exclude) {
    for (const term of exclude.split(/[, ]+/).map((item) => item.trim()).filter(Boolean).slice(0, 8)) {
      parts.push(`-${stripQuotes(term)}`);
    }
  }

  const text = parts.join(" ").trim();
  if (text.length > 400) errors.push("The query is too long.");
  return { text, errors };
}

function yearOrNull(value: string | undefined, errors: string[], label: string): number | null {
  const raw = clean(value, 8);
  if (!raw) return null;
  if (!/^\d{4}$/.test(raw)) {
    errors.push(`${label} must be a four-digit year.`);
    return null;
  }
  const year = Number(raw);
  if (year < 1700 || year > 2100) {
    errors.push(`${label} is outside the catalog's range.`);
    return null;
  }
  return year;
}

export function buildSearch(input: SearchInput): BuiltSearch {
  const errors: string[] = [];
  const composed = composeWebSearch(input);
  errors.push(...composed.errors);
  const from = yearOrNull(input.from, errors, "From");
  const to = yearOrNull(input.to, errors, "To");
  const dateField = input.dateField === "about" ? "about" : "published";
  const includeComparative = input.comparative === "include";
  const author = clean(input.author, 80).replace(/[%_\\]/g, "");
  const place = clean(input.place, 80);
  const category = clean(input.category, 80);
  const type = clean(input.type, 40);

  const params: unknown[] = [];
  const where: string[] = [];

  if (composed.text) {
    params.push(composed.text);
    where.push(`d.search_vector @@ websearch_to_tsquery('english', $${params.length})`);
  }
  if (type) {
    params.push(type);
    where.push(`d.document_type = $${params.length}`);
  }
  if (from !== null) {
    params.push(from);
    where.push(
      dateField === "about"
        ? `(coalesce(d.about_year_end, d.about_year_start, d.published_year) >= $${params.length})`
        : `d.published_year >= $${params.length}`,
    );
  }
  if (to !== null) {
    params.push(to);
    where.push(
      dateField === "about"
        ? `(coalesce(d.about_year_start, d.published_year) <= $${params.length})`
        : `d.published_year <= $${params.length}`,
    );
  }
  if (place) {
    params.push(place);
    const placeMatch = `(p.id = $${params.length} or lower(p.name) = lower($${params.length}) or lower(pn.name) = lower($${params.length}))`;
    where.push(`(
      exists (
        select 1
        from document_places dp
        join places p on p.id = dp.place_id
        left join place_names pn on pn.place_id = p.id
        where dp.document_id = d.id and ${placeMatch}
          and not exists (
            select 1 from tag_overrides o
            where o.document_id = d.id and o.kind = 'place' and o.action = 'remove' and o.target_id = p.id
          )
      )
      or exists (
        select 1
        from tag_overrides o
        join places p on p.id = o.target_id
        left join place_names pn on pn.place_id = p.id
        where o.document_id = d.id and o.kind = 'place' and o.action = 'add' and ${placeMatch}
      )
    )`);
  }
  if (category) {
    params.push(category);
    where.push(`(
      exists (
        select 1 from document_categories dc
        where dc.document_id = d.id and dc.category_id = $${params.length}
          and not exists (
            select 1 from tag_overrides o
            where o.document_id = d.id and o.kind = 'sector' and o.action = 'remove' and o.target_id = dc.category_id
          )
      )
      or exists (
        select 1 from tag_overrides o
        where o.document_id = d.id and o.kind = 'sector' and o.action = 'add' and o.target_id = $${params.length}
      )
    )`);
  }
  if (author) {
    params.push(`%${author}%`);
    where.push(`(
      exists (
        select 1
        from document_people dpe
        join people pe on pe.id = dpe.person_id
        where dpe.document_id = d.id
          and (pe.name ilike $${params.length} or pe.sort_name ilike $${params.length})
          and not exists (
            select 1 from tag_overrides o
            where o.document_id = d.id and o.kind = 'entity' and o.action = 'remove' and o.target_id = pe.id
          )
      )
      or exists (
        select 1
        from tag_overrides o
        join people pe on pe.id = o.target_id
        where o.document_id = d.id and o.kind = 'entity' and o.action = 'add'
          and (pe.name ilike $${params.length} or pe.sort_name ilike $${params.length})
      )
    )`);
  }
  if (!includeComparative) where.push("d.comparative = false");

  const rankSelect = composed.text
    ? `ts_rank(d.search_vector, websearch_to_tsquery('english', $1)) as rank,
       ts_headline('english', d.summary, websearch_to_tsquery('english', $1), 'MaxFragments=1, MaxWords=32, MinWords=12') as headline`
    : `0::float as rank, d.summary as headline`;

  const sql = `
    select d.id, d.title, d.document_type, d.published_year, d.about_year_start, d.about_year_end,
           d.accession, d.summary, d.comparative, d.comparative_label, d.verification_status,
           ${rankSelect}
    from documents d
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by rank desc, d.published_year nulls last, d.title
    limit 80
  `;

  return { sql, params, websearch: composed.text, errors };
}

export interface SearchPlace {
  id: string;
  name: string;
  kind: string;
  parentName: string | null;
}

export interface PlaceGroups {
  provinces: SearchPlace[];
  districts: { province: string; places: SearchPlace[] }[];
  unassigned: SearchPlace[];
}

export function groupSearchPlaces(places: SearchPlace[]): PlaceGroups {
  const provinces = places.filter((place) => place.kind === "province").sort((a, b) => a.name.localeCompare(b.name));
  const districts = places.filter((place) => place.kind === "district");
  const byProvince = new Map<string, SearchPlace[]>();
  const unassigned: SearchPlace[] = [];
  for (const district of districts) {
    if (!district.parentName) {
      unassigned.push(district);
      continue;
    }
    const list = byProvince.get(district.parentName) ?? [];
    list.push(district);
    byProvince.set(district.parentName, list);
  }
  for (const list of byProvince.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  unassigned.sort((a, b) => a.name.localeCompare(b.name));
  return {
    provinces,
    districts: [...byProvince.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([province, places]) => ({ province, places })),
    unassigned,
  };
}

export function searchOutcome(input: {
  asked: boolean;
  hits: number;
  errors: number;
  outside: boolean;
  unknownPlace: boolean;
  shelfCount: number;
  placeChosen: boolean;
}): { countLine: string | null; gap: string | null; outsideNote: string | null; hint: string | null } {
  const shelf = `The shelf holds ${input.shelfCount} documents.`;
  if (!input.asked || input.errors > 0) {
    return { countLine: null, gap: null, outsideNote: null, hint: null };
  }
  if (input.hits > 0) {
    const noun = input.hits === 1 ? "record" : "records";
    return {
      countLine: `${input.hits} ${noun} from a shelf of ${input.shelfCount}.`,
      gap: null,
      outsideNote: null,
      hint: null,
    };
  }
  if (input.unknownPlace) {
    return { countLine: null, gap: null, outsideNote: null, hint: null };
  }
  const gap = input.placeChosen
    ? `No record is tagged to that place. ${shelf} The empty row is a gap in the catalog.`
    : `Nothing in the catalog matches. ${shelf} The empty row is a gap in the catalog.`;
  return {
    countLine: null,
    gap,
    outsideNote: input.outside
      ? "That query names a place outside Zambia. External material is included only when it is labeled as comparative context for a Zambian question."
      : null,
    hint: "Try a province, a river, or a person already on the shelf: Livingstone, Richards, Kaunda, Copperbelt, Barotseland, Kariba.",
  };
}

const OUTSIDE = new Set([
  "kenya",
  "nigeria",
  "south africa",
  "zimbabwe",
  "malawi",
  "tanzania",
  "angola",
  "botswana",
  "namibia",
  "mozambique",
  "congo",
  "britain",
  "united kingdom",
  "united states",
  "china",
  "india",
  "europe",
]);

export function outsideZambiaQuery(query: string): boolean {
  const value = query.trim().toLowerCase();
  return OUTSIDE.has(value);
}
