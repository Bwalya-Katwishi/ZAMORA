import type { Role } from "@/lib/roles";

export interface DocCard {
  id: string;
  title: string;
  type: string;
  publishedYear: number | null;
  aboutStart: number | null;
  aboutEnd: number | null;
  accession: string;
  summary: string;
  comparative: boolean;
  comparativeLabel: string | null;
  verification: string;
  headline: string;
  authors?: { name: string; sortName: string; kind: "person" | "institution" }[];
}

export interface PersonCredit {
  id: string;
  name: string;
  sortName: string;
  kind: "person" | "institution";
  role: string;
}

export interface PlaceRef {
  id: string;
  name: string;
  kind: string;
  latitude: number | null;
  longitude: number | null;
  note: string;
}

export interface CategoryRef {
  id: string;
  name: string;
  parentId: string | null;
  description: string;
  layout: string;
  position: number;
}

export interface EventRef {
  id: string;
  title: string;
  summary: string;
  startYear: number | null;
  endYear: number | null;
  startOn: string | null;
  dateNote: string;
  placeId: string | null;
  placeName: string | null;
  relation?: string;
}

export interface DocumentDetail extends DocCard {
  publishedOn: string | null;
  publisher: string | null;
  publicationPlace: string | null;
  container: string | null;
  sourceUrl: string | null;
  rights: string;
  relevance: string;
  language: string;
  people: PersonCredit[];
  places: PlaceRef[];
  categories: CategoryRef[];
  events: EventRef[];
  corrections: { id: string; note: string; createdAt: string; author: string }[];
  overrides: { id: string; kind: "place" | "sector" | "entity"; action: "add" | "remove"; targetId: string; name: string; note: string; author: string }[];
}

export interface IndicatorSeries {
  code: string;
  name: string;
  unit: string;
  caveat: string;
  sourceName: string;
  sourceUrl: string | null;
  retrievedOn: string;
  scenarioId: string | null;
  observations: { year: number; value: number }[];
}

export interface ScenarioDetail {
  id: string;
  question: string;
  status: string;
  assumptions: string;
  notClaimed: string;
  methodNote: string;
  categoryName: string | null;
  events: EventRef[];
  documents: DocCard[];
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface InvestigationSummary {
  id: string;
  title: string;
  question: string;
  status: string;
  updatedAt: string;
}

export interface EvidenceItem {
  id: string;
  stance: "supports" | "contradicts" | "context";
  note: string;
  documentId: string | null;
  documentTitle: string | null;
}

export interface ClaimItem {
  id: string;
  statement: string;
  status: string;
  evidence: EvidenceItem[];
}

export interface InvestigationDetail extends InvestigationSummary {
  sources: DocCard[];
  claims: ClaimItem[];
  notes: { id: string; body: string; createdAt: string; author: string }[];
}
