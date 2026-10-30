export type CitationStyle = "chicago" | "apa" | "harvard";

export interface CitationAuthor {
  name: string;
  sortName: string;
  kind: "person" | "institution";
}

export interface CitationInput {
  authors: CitationAuthor[];
  year: number | null;
  title: string;
  place?: string | null;
  publisher?: string | null;
  container?: string | null;
  type: string;
  url?: string | null;
}

function splitSort(sortName: string): { family: string; given: string } | null {
  const parts = sortName.split(",");
  if (parts.length < 2) return null;
  return { family: parts[0].trim(), given: parts.slice(1).join(",").trim() };
}

function initial(given: string): string {
  const first = given.trim().split(/\s+/)[0] ?? "";
  return first ? `${first[0]}.` : "";
}

function apaName(author: CitationAuthor): string {
  if (author.kind === "institution") return author.name;
  const parsed = splitSort(author.sortName);
  if (!parsed) return author.name;
  const ini = initial(parsed.given);
  return ini ? `${parsed.family}, ${ini}` : parsed.family;
}

function chicagoName(author: CitationAuthor, inverted: boolean): string {
  if (author.kind === "institution") return author.name;
  const parsed = splitSort(author.sortName);
  if (!parsed) return author.name;
  if (inverted) return `${parsed.family}, ${parsed.given}`;
  return `${parsed.given} ${parsed.family}`;
}

function joinAuthors(names: string[], style: CitationStyle): string {
  if (names.length === 0) return "Unknown";
  if (names.length === 1) return names[0];
  if (names.length === 2) {
    const conjunction = style === "apa" ? "&" : "and";
    return `${names[0]}, ${conjunction} ${names[1]}`;
  }
  const conjunction = style === "apa" ? "&" : "and";
  return `${names.slice(0, -1).join(", ")}, ${conjunction} ${names[names.length - 1]}`;
}

function yearLabel(year: number | null): string {
  return year === null ? "n.d." : String(year);
}

function imprint(place?: string | null, publisher?: string | null): string {
  if (place && publisher) return `${place}: ${publisher}`;
  return publisher || place || "";
}

export function formatCitation(input: CitationInput, style: CitationStyle): string {
  const year = yearLabel(input.year);
  const imprintText = imprint(input.place, input.publisher);
  const container = input.container ? ` ${input.container}.` : "";

  if (style === "chicago") {
    const names = input.authors.map((author, index) => chicagoName(author, index === 0));
    const who = joinAuthors(names, style);
    const tail = [imprintText, input.year ? String(input.year) : "n.d."].filter(Boolean).join(", ");
    return `${who}. ${input.title}.${container}${tail ? ` ${tail}.` : ""}`.replace(/\.\./g, ".");
  }

  if (style === "apa") {
    const who = joinAuthors(input.authors.map(apaName), style);
    const pub = input.publisher ? ` ${input.publisher}.` : "";
    return `${who} (${year}). ${input.title}.${container}${pub}`.replace(/\.\./g, ".");
  }

  const who = joinAuthors(input.authors.map(apaName), style);
  const tail = imprintText ? ` ${imprintText}.` : "";
  return `${who} (${year}) ${input.title}.${container}${tail}`.replace(/\.\./g, ".");
}

export function citationLink(url?: string | null): string | null {
  if (!url) return null;
  return url;
}
