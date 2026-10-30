import { accessionPattern, documents, type DocumentSeed } from "@/data/documents";
import { places } from "@/data/places";
import { categories } from "@/data/taxonomy";
import { events } from "@/data/events";

const placeIds = new Set(places.map((place) => place.id));
const categoryIds = new Set(categories.map((category) => category.id));
const eventIds = new Set(events.map((event) => event.id));

export interface IntegrityIssue {
  id: string;
  message: string;
}

export function validateDocument(document: DocumentSeed): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  if (!document.title.trim()) issues.push({ id: document.id, message: "Missing title." });
  if (!document.rights.trim()) issues.push({ id: document.id, message: "Rights line is missing." });
  if (!accessionPattern.test(document.accession)) {
    issues.push({ id: document.id, message: "Accession is not a ZAMORA accession." });
  }
  if (document.summary.trim().length < 80) issues.push({ id: document.id, message: "Catalog note is too thin." });
  if (document.relevance.trim().length < 40) issues.push({ id: document.id, message: "Zambia relevance is missing." });
  if (/lorem ipsum|placeholder|todo|tbd/i.test(document.summary)) {
    issues.push({ id: document.id, message: "Catalog note contains placeholder text." });
  }
  if (document.comparative && !document.comparativeLabel) {
    issues.push({ id: document.id, message: "Comparative records need a label." });
  }
  if (!document.places.length) issues.push({ id: document.id, message: "No place." });
  if (!document.places.includes("zambia") && !document.places.some((id) => placeIds.has(id))) {
    issues.push({ id: document.id, message: "No Zambian place." });
  }
  for (const placeId of document.places) {
    if (!placeIds.has(placeId)) issues.push({ id: document.id, message: `Unknown place ${placeId}.` });
  }
  for (const categoryId of document.categories) {
    if (!categoryIds.has(categoryId)) issues.push({ id: document.id, message: `Unknown category ${categoryId}.` });
  }
  for (const link of document.events) {
    if (!eventIds.has(link.id)) issues.push({ id: document.id, message: `Unknown event ${link.id}.` });
  }
  if (document.year === null && document.aboutStart == null && document.type !== "archive") {
    issues.push({ id: document.id, message: "Needs a publication year or a period." });
  }
  return issues;
}

export function validateCatalog(): IntegrityIssue[] {
  const issues = documents.flatMap(validateDocument);
  const accessions = new Set<string>();
  const fingerprints = new Set<string>();
  for (const document of documents) {
    if (accessions.has(document.accession)) issues.push({ id: document.id, message: "Duplicate accession." });
    accessions.add(document.accession);
    const fingerprint = `${document.title.toLowerCase()}|${document.year ?? ""}|${document.url ?? ""}`;
    if (fingerprints.has(fingerprint)) issues.push({ id: document.id, message: "Duplicate fingerprint." });
    fingerprints.add(fingerprint);
  }
  return issues;
}

export function fingerprintOf(document: Pick<DocumentSeed, "title" | "year" | "url">): string {
  return `${document.title.trim().toLowerCase().replace(/\s+/g, " ")}|${document.year ?? ""}|${document.url ?? ""}`;
}
