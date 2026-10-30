import { formatCitation, type CitationStyle } from "@/lib/citations";
import type { InvestigationDetail } from "@/lib/types";

export function renderBrief(detail: InvestigationDetail, style: CitationStyle): string {
  const lines = [
    `# ${detail.title}`,
    "",
    `Question: ${detail.question}`,
    "",
    "This brief assembles only the claims, notes, and sources stored on this desk. It does not add facts, and it is not a forecast.",
    "",
    "## Claims",
  ];
  if (!detail.claims.length) lines.push("No claim has been filed.");
  for (const claim of detail.claims) {
    lines.push(`- ${claim.statement} (${claim.status})`);
    for (const item of claim.evidence) {
      const source = item.documentTitle ? ` — ${item.documentTitle}` : "";
      lines.push(`  - ${item.stance}${source}${item.note ? `: ${item.note}` : ""}`);
    }
  }
  lines.push("", "## Sources");
  if (!detail.sources.length) lines.push("No source has been placed on the desk.");
  for (const source of detail.sources) {
    lines.push(
      `- ${formatCitation(
        {
          authors: (source.authors ?? []).map((author) => ({
            name: author.name,
            sortName: author.sortName,
            kind: author.kind,
          })),
          year: source.publishedYear,
          title: source.title,
          type: source.type,
        },
        style,
      )} Accession ${source.accession}.`,
    );
  }
  lines.push("", "## Notes");
  if (!detail.notes.length) lines.push("No note.");
  for (const note of detail.notes) {
    lines.push(`- ${note.author}, ${note.createdAt.slice(0, 10)}: ${note.body}`);
  }
  lines.push(
    "",
    "---",
    "Prepared in ZAMORA. Citations above use the catalog metadata on the desk. Where a source has no author in this export, open the reading room for the full credit.",
    "History is not a promise about the future.",
  );
  return lines.join("\n");
}
