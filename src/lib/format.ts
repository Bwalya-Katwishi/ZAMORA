const typeLabels: Record<string, string> = {
  book: "Book",
  paper: "Paper",
  report: "Official report",
  photograph: "Photograph",
  archive: "Archive",
  legal: "Legal instrument",
  gazette: "Gazette",
  newspaper: "Newspaper",
  dataset: "Dataset",
};

const relationLabels: Record<string, string> = {
  contemporary: "From the time",
  retrospective: "Later account",
  study_of: "Study",
  depiction: "Depiction",
};

export function typeLabel(type: string): string {
  return typeLabels[type] ?? type;
}

export function relationLabel(relation: string): string {
  return relationLabels[relation] ?? relation;
}

export function yearSpan(start?: number | null, end?: number | null, fallback = "Undated"): string {
  if (start && end && start !== end) return `${start}–${end}`;
  if (start) return String(start);
  if (end) return String(end);
  return fallback;
}

export function formatValue(value: number, unit: string): string {
  if (unit.startsWith("kilogram")) return Math.round(value).toLocaleString("en-ZM");
  return value.toLocaleString("en-ZM", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}
