import { formatCitation, type CitationAuthor } from "@/lib/citations";
import { assessQuestion, type PolicyDecision } from "@/lib/policy";

export const questionTypes = [
  { id: "historical", label: "Historical record review" },
  { id: "sector_place", label: "Sector-place scan" },
  { id: "policy", label: "Policy and institution trace" },
  { id: "comparative", label: "Comparative context, with Zambia included" },
] as const;

export type QuestionType = (typeof questionTypes)[number]["id"];

export const deskResponseKeys = [
  "query",
  "filters",
  "scope",
  "result_type",
  "records",
  "timeline",
  "entities",
  "places",
  "sectors",
  "gaps",
  "confidence",
  "limitations",
  "citations",
] as const;

export interface NamedRef {
  id: string;
  name: string;
}

export interface ShelfRecord {
  id: string;
  accession: string;
  title: string;
  type: string;
  year: number | null;
  summary: string;
  rights: string;
  url: string | null;
  metadataOnly: boolean;
  publisher: string | null;
  publicationPlace: string | null;
  container: string | null;
  places: NamedRef[];
  sectors: NamedRef[];
  entities: (NamedRef & { sortName: string; kind: "person" | "institution" })[];
  events: { id: string; title: string; year: number | null }[];
}

export interface DeskFilters {
  placeId: string | null;
  placeName: string | null;
  placeKind: string | null;
  placeAssigned: boolean;
  sectorIds: string[];
  sectorNames: string[];
  from: number | null;
  to: number | null;
  questionType: QuestionType;
  keywords: string;
  entityId: string | null;
  entityName: string | null;
}

export interface DeskGap {
  code: string;
  detail: string;
}

export interface DeskRecordView {
  id: string;
  accession: string;
  title: string;
  type: string;
  year: number | null;
  summary: string;
  rights: string;
  url: string | null;
  metadataOnly: boolean;
  citation: string;
  places: NamedRef[];
  sectors: NamedRef[];
  entities: NamedRef[];
}

export interface DeskResponse {
  query: string;
  filters: DeskFilters;
  scope: string;
  result_type: "evidence_pack" | "insufficient" | "refused";
  records: DeskRecordView[];
  timeline: { year: number | null; label: string; recordId: string; accession: string }[];
  entities: NamedRef[];
  places: NamedRef[];
  sectors: NamedRef[];
  gaps: DeskGap[];
  confidence: "limited" | "insufficient" | "refused";
  limitations: string[];
  citations: { accession: string; title: string; citation: string; url: string | null }[];
}

const PATHWAY =
  "An approved source can be brought to an investigation file by a signed-in researcher. This page does not accept an upload, and it does not copy a publisher's text.";

const OCR_LIMIT =
  "OCR was scored on a fifty-page sample and the batch was stopped. No transcript on this shelf was produced by OCR.";

const METADATA_LIMIT =
  "Matching records are metadata and links. The shelf does not hold the texts, and a catalog note is not a quotation.";

export function isMetadataOnly(rights: string): boolean {
  return /not (copied|stored|reproduced)|metadata only|index entry|pointer only|title-level|collection-level|institution-level|official text linked/i.test(rights);
}

export function effectiveIds(catalog: string[], marks: { action: "add" | "remove"; targetId: string }[]): string[] {
  const ids = new Set(catalog);
  for (const mark of marks) {
    if (mark.action === "remove") ids.delete(mark.targetId);
    if (mark.action === "add") ids.add(mark.targetId);
  }
  return [...ids];
}

export function parseQuestionType(value: string | undefined): QuestionType | null {
  return questionTypes.some((item) => item.id === value) ? (value as QuestionType) : null;
}

export function questionLabel(id: QuestionType): string {
  return questionTypes.find((item) => item.id === id)?.label ?? id;
}

function unique(items: NamedRef[]): NamedRef[] {
  const seen = new Map<string, NamedRef>();
  for (const item of items) seen.set(item.id, { id: item.id, name: item.name });
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function authorsOf(record: ShelfRecord): CitationAuthor[] {
  if (record.entities.length) {
    return record.entities.map((entity) => ({ name: entity.name, sortName: entity.sortName, kind: entity.kind }));
  }
  const name = record.publisher || "Institutional record";
  return [{ name, sortName: name, kind: "institution" }];
}

function viewRecord(record: ShelfRecord): DeskRecordView {
  const citation = formatCitation(
    {
      authors: authorsOf(record),
      year: record.year,
      title: record.title,
      place: record.publicationPlace,
      publisher: record.publisher,
      container: record.container,
      type: record.type,
      url: record.url,
    },
    "chicago",
  );
  return {
    id: record.id,
    accession: record.accession,
    title: record.title,
    type: record.type,
    year: record.year,
    summary: record.summary,
    rights: record.rights,
    url: record.url,
    metadataOnly: record.metadataOnly,
    citation,
    places: record.places,
    sectors: record.sectors,
    entities: record.entities.map((entity) => ({ id: entity.id, name: entity.name })),
  };
}

function scopeOf(filters: DeskFilters): string {
  const place = filters.placeName ?? "No place selected";
  const sectors = filters.sectorNames.length ? filters.sectorNames.join(", ") : "No sector selected";
  const dates = filters.from || filters.to ? `${filters.from ?? "…"}–${filters.to ?? "…"}` : "No date range";
  return `${place}. ${sectors}. ${questionLabel(filters.questionType)}. ${dates}.`;
}

function packFrom(filters: DeskFilters, records: ShelfRecord[], gaps: DeskGap[], result: DeskResponse["result_type"], confidence: DeskResponse["confidence"], extraLimits: string[]): DeskResponse {
  const views = records.map(viewRecord);
  const seenEvents = new Set<string>();
  const timeline = [
    ...views.map((record) => ({ year: record.year, label: record.title, recordId: record.id, accession: record.accession })),
    ...records.flatMap((record) => record.events.flatMap((event) => {
      if (seenEvents.has(event.id)) return [];
      seenEvents.add(event.id);
      return [{ year: event.year, label: event.title, recordId: record.id, accession: record.accession }];
    })),
  ].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.label.localeCompare(b.label));
  return {
    query: filters.keywords || questionLabel(filters.questionType),
    filters,
    scope: scopeOf(filters),
    result_type: result,
    records: views,
    timeline,
    entities: unique(records.flatMap((record) => record.entities)),
    places: unique(records.flatMap((record) => record.places)),
    sectors: unique(records.flatMap((record) => record.sectors)),
    gaps,
    confidence,
    limitations: extraLimits,
    citations: views.map((record) => ({
      accession: record.accession,
      title: record.title,
      citation: record.citation,
      url: record.url,
    })),
  };
}

function dateIncomplete(filters: DeskFilters, records: ShelfRecord[]): boolean {
  if (filters.from == null || filters.to == null || filters.to - filters.from < 10) return false;
  const years = records.map((record) => record.year).filter((year): year is number => year != null);
  if (!years.length) return true;
  const covered = Math.max(...years) - Math.min(...years);
  return covered * 2 < filters.to - filters.from;
}

export function judgeDesk(input: {
  filters: DeskFilters;
  records: ShelfRecord[];
  shelfCount: number;
  placeRecordCount: number;
  sectorRecordCount: number;
  refusal: PolicyDecision;
}): DeskResponse {
  const { filters } = input;
  const baseLimits = [
    METADATA_LIMIT,
    OCR_LIMIT,
    "Editor overrides are applied before this count. A removed tag is excluded. Withdrawing an override restores the catalog tag. An uncertain district is not given another place's records.",
    PATHWAY,
  ];

  if (!input.refusal.allowed) {
    return packFrom(filters, [], [{ code: "refused", detail: input.refusal.message }], "refused", "refused", [input.refusal.message, ...baseLimits]);
  }
  if (!filters.placeId || filters.sectorIds.length === 0) {
    return packFrom(
      filters,
      [],
      [{ code: "filters", detail: "Name a place and at least one sector. A keyword alone is not a desk question." }],
      "insufficient",
      "insufficient",
      [`The shelf holds ${input.shelfCount} documents.`, ...baseLimits],
    );
  }
  if (filters.placeKind === "district" && !filters.placeAssigned) {
    return packFrom(
      filters,
      [],
      [{
        code: "uncertain_district",
        detail: `${filters.placeName} has no province assignment. Records from a neighbouring province are not attached to it.`,
      }],
      "insufficient",
      "insufficient",
      [`Records considered after filters: 0. The shelf holds ${input.shelfCount} documents.`, ...baseLimits],
    );
  }

  const countNote = `Records considered after filters: ${input.records.length}. The shelf holds ${input.shelfCount} documents.`;
  if (input.records.length === 0) {
    let code = "no_match";
    let detail = "Nothing on the shelf matches this place, sector, and date together.";
    if (input.placeRecordCount > 0 && input.sectorRecordCount === 0) {
      code = "place_without_sector";
      detail = `${filters.placeName} is on the shelf, and the selected sector is not.`;
    } else if (input.placeRecordCount === 0 && input.sectorRecordCount > 0) {
      code = "sector_without_place";
      detail = `The sector is on the shelf. ${filters.placeName} has no record tagged to it.`;
    } else if (input.placeRecordCount > 0) {
      code = "place_without_sector";
      detail = `${filters.placeName} has records, and none of them carry the selected sector in this date range.`;
    }
    return packFrom(
      filters,
      [],
      [{ code, detail: `${detail} ${PATHWAY}` }],
      "insufficient",
      "insufficient",
      [countNote, "The shelf does not currently hold enough documented material to answer this question.", ...baseLimits],
    );
  }

  if (input.records.length < 3) {
    return packFrom(
      filters,
      input.records,
      [{
        code: "too_few",
        detail: `${input.records.length} matching record${input.records.length === 1 ? "" : "s"}. A pack needs at least three. ${PATHWAY}`,
      }],
      "insufficient",
      "insufficient",
      [countNote, "The shelf does not currently hold enough documented material to answer this question.", ...baseLimits],
    );
  }

  if (dateIncomplete(filters, input.records)) {
    return packFrom(
      filters,
      input.records,
      [{
        code: "date_incomplete",
        detail: `The requested years are ${filters.from}–${filters.to}. The matching records do not cover that span. ${PATHWAY}`,
      }],
      "insufficient",
      "insufficient",
      [countNote, "The shelf does not currently hold enough documented material to answer this question.", ...baseLimits],
    );
  }

  if (filters.questionType === "policy" && input.records.every((record) => record.metadataOnly)) {
    return packFrom(
      filters,
      input.records,
      [{
        code: "metadata_only",
        detail: "A policy trace needs the instrument text. These records are metadata and links. The text is not stored.",
      }],
      "insufficient",
      "insufficient",
      [countNote, "The shelf does not currently hold enough documented material to answer this question.", ...baseLimits],
    );
  }

  return packFrom(
    filters,
    input.records,
    [{ code: "texts_not_held", detail: "The pack lists what is catalogued. It does not quote pages the shelf does not hold." }],
    "evidence_pack",
    "limited",
    [countNote, ...baseLimits],
  );
}

export function refusalFor(filters: DeskFilters): PolicyDecision {
  return assessQuestion([filters.keywords, filters.placeName, filters.questionType === "comparative" ? "Zambia" : ""].filter(Boolean).join(" "));
}
