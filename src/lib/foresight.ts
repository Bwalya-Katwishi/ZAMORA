import type { DeskResponse } from "@/lib/evidence";
import { allows, type Role } from "@/lib/roles";

export const briefStatuses = ["draft", "in_review", "signed"] as const;
export type BriefStatus = (typeof briefStatuses)[number];
export type BriefRole = Role;

export const BRIEF_METHOD =
  "Drafted from the evidence desk. The pack search is lexical. Ask-the-shelf, when a note was retrieved, uses the local hash zamora-hash-v1. A numbered shelf line is a catalog note, not a quotation. A scenario is labeled as a scenario. This file is not published. Export waits for a source, a clear citation check, and an editor's signature.";

const ACCESSION = /ZMR-(?:\d{4}|ARCH|DATA)-\d{3}/g;
const PREDICTION = /\b(will definitely|certain to|guarantee that|who will win|exact probability|predict with certainty)\b/i;

export interface BriefSource {
  id: string;
  accession: string;
  title: string;
  citation: string;
  url: string | null;
  year: number | null;
}

export interface BriefClaim {
  id: string;
  text: string;
  sourceIds: string[];
}

export interface BriefScenario {
  id: string;
  text: string;
  label: string;
}

export interface BriefBody {
  title: string;
  placeId: string | null;
  placeName: string | null;
  sectorNames: string[];
  from: number | null;
  to: number | null;
  question: string;
  scope: string;
  method: string;
  evidence: BriefClaim[];
  timeline: { year: number | null; label: string; sourceId: string }[];
  patterns: BriefClaim[];
  signals: BriefClaim[];
  parallels: BriefClaim[];
  scenarios: BriefScenario[];
  notShown: string[];
  gaps: string[];
  confidence: "limited" | "insufficient" | "refused";
  uncertainty: string;
  questions: string[];
  sources: BriefSource[];
}

export interface CitationWarning {
  code: "missing_source" | "unknown_source" | "no_sources" | "scenario_mislabeled" | "prediction";
  detail: string;
  claimId?: string;
}

export interface BriefVersion {
  version: number;
  body: BriefBody;
  status: BriefStatus;
  editor: string;
  note: string;
  createdAt: string;
}

export interface BriefMeta {
  status: BriefStatus;
  versions: { version: number; note: string; editor: string; createdAt: string }[];
  reviewerName: string | null;
  reviewerRole: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  signerName: string | null;
  signerRole: string | null;
  signedAt: string | null;
  signature: string | null;
}

export interface BriefPermissions {
  read: boolean;
  edit: boolean;
  review: boolean;
  sign: boolean;
  export: boolean;
}

const bodyKeys = [
  "title", "placeId", "placeName", "sectorNames", "from", "to", "question", "scope", "method",
  "evidence", "timeline", "patterns", "signals", "parallels", "scenarios", "notShown", "gaps",
  "confidence", "uncertainty", "questions", "sources",
] as const;

export function parseBriefBody(value: unknown): BriefBody | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (!bodyKeys.every((key) => key in record)) return null;
  if (record.confidence !== "limited" && record.confidence !== "insufficient" && record.confidence !== "refused") return null;
  if (!Array.isArray(record.sources) || !Array.isArray(record.evidence)) return null;
  return record as unknown as BriefBody;
}

export function draftFromPack(pack: DeskResponse, question: string): BriefBody {
  const sources: BriefSource[] = pack.records.map((record) => ({
    id: record.id,
    accession: record.accession,
    title: record.title,
    citation: record.citation,
    url: record.url,
    year: record.year,
  }));
  const known = new Set(sources.map((source) => source.id));
  const place = pack.filters.placeName ?? "No place";
  const sectors = pack.filters.sectorNames.length ? pack.filters.sectorNames.join(", ") : "No sector";
  return {
    title: `${place}. ${sectors}.`.slice(0, 180),
    placeId: pack.filters.placeId,
    placeName: pack.filters.placeName,
    sectorNames: [...pack.filters.sectorNames],
    from: pack.filters.from,
    to: pack.filters.to,
    question: question.replace(/\s+/g, " ").trim().slice(0, 500),
    scope: pack.scope,
    method: BRIEF_METHOD,
    evidence: pack.records.map((record) => ({
      id: `evidence-${record.id}`,
      text: `${record.accession} is on the shelf as a catalog record. The stored note is not a quotation from the publisher.`,
      sourceIds: [record.id],
    })),
    timeline: pack.timeline
      .filter((item) => known.has(item.recordId))
      .map((item) => ({ year: item.year, label: item.label, sourceId: item.recordId })),
    patterns: [],
    signals: [],
    parallels: [],
    scenarios: [],
    notShown: pack.gaps.map((gap) => gap.detail),
    gaps: pack.gaps.map((gap) => gap.detail),
    confidence: pack.confidence,
    uncertainty: pack.limitations.join(" "),
    questions: ["What approved record would close a gap named on this brief?"],
    sources,
  };
}

export function parseClaimLines(text: string, sources: BriefSource[], prefix: string): BriefClaim[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((line, index) => {
      const accessions = line.match(ACCESSION) ?? [];
      const prose = line.replace(ACCESSION, " ").replace(/\s+/g, " ").trim().slice(0, 600);
      const sourceIds = accessions.map((accession) => sources.find((source) => source.accession === accession)?.id ?? `missing:${accession}`);
      return { id: `${prefix}-${index + 1}`, text: prose || line.slice(0, 600), sourceIds };
    });
}

export function formatClaimLines(claims: BriefClaim[], sources: BriefSource[]): string {
  return claims
    .map((claim) => {
      const accessions = claim.sourceIds
        .map((id) => sources.find((source) => source.id === id)?.accession ?? (id.startsWith("missing:") ? id.slice(8) : ""))
        .filter(Boolean);
      return accessions.length ? `${claim.text} ${accessions.join(" ")}` : claim.text;
    })
    .join("\n");
}

export function parseScenarioLines(text: string): BriefScenario[] {
  return text
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((line, index) => {
      const labeled = /^(prediction|forecast)\s*[:\-]\s*/i.exec(line);
      return {
        id: `scenario-${index + 1}`,
        label: labeled ? "prediction" : "scenario",
        text: (labeled ? line.slice(labeled[0].length) : line).trim().slice(0, 600),
      };
    });
}

export function formatScenarioLines(scenarios: BriefScenario[]): string {
  return scenarios
    .map((scenario) => (scenario.label === "scenario" ? scenario.text : `${scenario.label}: ${scenario.text}`))
    .join("\n");
}

export function parseQuestionLines(text: string): string[] {
  return text.split(/\n/).map((line) => line.trim()).filter(Boolean).slice(0, 12).map((line) => line.slice(0, 400));
}

function claimWarnings(claims: BriefClaim[], sources: Set<string>, section: string): CitationWarning[] {
  const warnings: CitationWarning[] = [];
  for (const claim of claims) {
    if (PREDICTION.test(claim.text)) {
      warnings.push({ code: "prediction", claimId: claim.id, detail: `${section}: a line reads as a certain call. Remove it. A brief does not predict.` });
    }
    if (!claim.sourceIds.length) {
      warnings.push({ code: "missing_source", claimId: claim.id, detail: `${section}: "${claim.text.slice(0, 80)}" names no source on this brief.` });
      continue;
    }
    for (const id of claim.sourceIds) {
      if (!sources.has(id)) {
        warnings.push({ code: "unknown_source", claimId: claim.id, detail: `${section}: a line cites ${id.replace(/^missing:/, "")}, which is not a source on this brief.` });
      }
    }
  }
  return warnings;
}

export function checkBrief(body: BriefBody): CitationWarning[] {
  const known = new Set(body.sources.map((source) => source.id));
  const warnings: CitationWarning[] = [];
  if (!body.sources.length) {
    warnings.push({ code: "no_sources", detail: "The brief has no source. Export needs at least one." });
  }
  warnings.push(
    ...claimWarnings(body.evidence, known, "Evidence reviewed"),
    ...claimWarnings(body.patterns, known, "Key patterns"),
    ...claimWarnings(body.signals, known, "Current signals"),
    ...claimWarnings(body.parallels, known, "Historical parallels"),
  );
  for (const item of body.timeline) {
    if (!known.has(item.sourceId)) {
      warnings.push({ code: "unknown_source", detail: `Timeline: "${item.label}" is not tied to a source on this brief.` });
    }
  }
  for (const scenario of body.scenarios) {
    if (scenario.label !== "scenario") {
      warnings.push({ code: "scenario_mislabeled", claimId: scenario.id, detail: "A scenario must be labeled as a scenario. It is not a prediction." });
    }
    if (PREDICTION.test(scenario.text)) {
      warnings.push({ code: "prediction", claimId: scenario.id, detail: "A scenario line reads as a certain call. Rewrite it as a scenario, or remove it." });
    }
  }
  for (const question of body.questions) {
    if (PREDICTION.test(question)) {
      warnings.push({ code: "prediction", detail: "A recommended line reads as a certain call. Ask a question the shelf can hold." });
    }
  }
  return warnings;
}

export function exportDecision(body: BriefBody, status: BriefStatus): { ok: true } | { ok: false; reasons: string[] } {
  const reasons: string[] = [];
  if (status !== "signed") reasons.push("A brief cannot be exported before an editor signs it.");
  const warnings = checkBrief(body);
  if (!body.sources.length) reasons.push("A brief cannot be exported without a source.");
  for (const warning of warnings) {
    if (warning.code === "no_sources") continue;
    reasons.push(warning.detail);
  }
  if (reasons.length) return { ok: false, reasons };
  return { ok: true };
}

export function briefPermissions(input: {
  role: BriefRole;
  isOwner: boolean;
  sameOrg: boolean;
  status: BriefStatus;
  hasReview: boolean;
  exportable: boolean;
}): BriefPermissions {
  const staff = allows(input.role, "editor");
  const member = input.role === "admin" || input.isOwner || (input.sameOrg && allows(input.role, "researcher"));
  const desk = input.role === "admin" || input.isOwner || input.sameOrg;
  return {
    read: member,
    edit: input.isOwner && allows(input.role, "researcher") && input.status !== "signed",
    review: staff && desk && input.status !== "signed",
    sign: staff && desk && input.hasReview && input.status !== "signed",
    export: member && input.exportable,
  };
}

export function appendVersion(
  history: BriefVersion[],
  input: { body: BriefBody; status: BriefStatus; editor: string; note: string; at: string },
): BriefVersion[] {
  const version = (history.at(-1)?.version ?? 0) + 1;
  return [
    ...history,
    {
      version,
      body: structuredClone(input.body),
      status: input.status,
      editor: input.editor,
      note: input.note.slice(0, 400),
      createdAt: input.at,
    },
  ];
}

export function applyBriefPatch(body: BriefBody, patch: {
  title?: string;
  patterns?: BriefClaim[];
  signals?: BriefClaim[];
  parallels?: BriefClaim[];
  scenarios?: BriefScenario[];
  questions?: string[];
}): BriefBody {
  return {
    ...body,
    title: patch.title?.trim().slice(0, 180) || body.title,
    patterns: patch.patterns ?? body.patterns,
    signals: patch.signals ?? body.signals,
    parallels: patch.parallels ?? body.parallels,
    scenarios: patch.scenarios ?? body.scenarios,
    questions: patch.questions ?? body.questions,
  };
}

function stamp(meta: BriefMeta): string {
  if (!meta.signature || !meta.signerName) return "Not signed.";
  const date = meta.signedAt ? meta.signedAt.slice(0, 10) : "undated";
  return `${meta.signerName}, ${meta.signerRole ?? "editor"}, ${date}. Signature: ${meta.signature}.`;
}

export function renderMarkdown(body: BriefBody, meta: BriefMeta): string {
  const lines = [
    `# ${body.title}`,
    "",
    `District or province: ${body.placeName ?? "None named"}`,
    `Sector: ${body.sectorNames.join(", ") || "None named"}`,
    `Date range: ${body.from ?? "…"}–${body.to ?? "…"}`,
    `Question: ${body.question}`,
    "",
    "## Scope and method",
    body.scope,
    "",
    body.method,
    "",
    "## Evidence reviewed",
  ];
  if (!body.evidence.length) lines.push("No shelf record was placed on this brief.");
  for (const claim of body.evidence) lines.push(`- ${claim.text}`);
  lines.push("", "## Historical timeline");
  if (!body.timeline.length) lines.push("No dated item.");
  for (const item of body.timeline) lines.push(`- ${item.year ?? "Undated"}: ${item.label}`);
  lines.push("", "## Key patterns");
  if (!body.patterns.length) lines.push("No pattern has been written.");
  for (const claim of body.patterns) lines.push(`- ${claim.text}`);
  lines.push("", "## Current signals");
  if (!body.signals.length) lines.push("No current signal has been written.");
  for (const claim of body.signals) lines.push(`- ${claim.text}`);
  lines.push("", "## Historical parallels");
  if (!body.parallels.length) lines.push("No parallel has been written.");
  for (const claim of body.parallels) lines.push(`- ${claim.text}`);
  lines.push("", "## Possible scenarios", "Each item below is a scenario, not a prediction.");
  if (!body.scenarios.length) lines.push("No scenario has been written.");
  for (const scenario of body.scenarios) lines.push(`- Scenario: ${scenario.text}`);
  lines.push("", "## What the evidence does not show");
  if (!body.notShown.length) lines.push("No gap sentence was stored.");
  for (const line of body.notShown) lines.push(`- ${line}`);
  lines.push("", "## Data gaps");
  if (!body.gaps.length) lines.push("No data gap was stored.");
  for (const line of body.gaps) lines.push(`- ${line}`);
  lines.push("", "## Confidence and uncertainty", body.confidence, "", body.uncertainty, "", "## Recommended questions or actions");
  if (!body.questions.length) lines.push("No question has been written.");
  for (const line of body.questions) lines.push(`- ${line}`);
  lines.push("", "## Full source list");
  if (!body.sources.length) lines.push("No source.");
  for (const source of body.sources) {
    lines.push(`- ${source.accession}. ${source.citation}${source.url ? ` ${source.url}` : ""}`);
  }
  lines.push("", "## Reviewer", stamp(meta));
  if (meta.reviewNote) lines.push(`Review note: ${meta.reviewNote}`);
  lines.push("", "## Version history");
  if (!meta.versions.length) lines.push("No version stored.");
  for (const version of meta.versions) {
    lines.push(`- ${version.version}. ${version.createdAt.slice(0, 10)} ${version.editor}: ${version.note}`);
  }
  return lines.join("\n");
}

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function renderCsv(body: BriefBody): string {
  const lines = ["accession,title,year,citation,url"];
  for (const source of body.sources) {
    lines.push([
      csvCell(source.accession),
      csvCell(source.title),
      source.year == null ? "" : String(source.year),
      csvCell(source.citation),
      csvCell(source.url ?? ""),
    ].join(","));
  }
  return lines.join("\n");
}

function pdfSafe(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapPdf(value: string): string[] {
  const clean = pdfSafe(value);
  if (!clean) return [""];
  const lines: string[] = [];
  for (let index = 0; index < clean.length; index += 90) lines.push(clean.slice(index, index + 90));
  return lines;
}

export function renderPdf(text: string): Buffer {
  const lines = text.split("\n").flatMap((line) => wrapPdf(line));
  const pageLines = 46;
  const slices: string[][] = [];
  for (let index = 0; index < lines.length; index += pageLines) slices.push(lines.slice(index, index + pageLines));
  if (!slices.length) slices.push([""]);
  const fontId = 3 + slices.length * 2;
  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${slices.length} /Kids [${slices.map((_, index) => `${3 + index * 2} 0 R`).join(" ")}] >>`,
  ];
  slices.forEach((slice, index) => {
    const commands = ["BT", "/F1 10 Tf", "50 760 Td", "14 TL"];
    for (const line of slice) commands.push(`(${line}) Tj`, "T*");
    commands.push("ET");
    const stream = commands.join("\n");
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects[pageId - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
    objects[contentId - 1] = `<< /Length ${Buffer.byteLength(stream, "latin1")} >> stream\n${stream}\nendstream`;
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const header = Buffer.from("%PDF-1.4\n", "latin1");
  let cursor = header.length;
  const chunks: Buffer[] = [header];
  const offsets = [0];
  objects.forEach((object, index) => {
    const body = Buffer.from(`${index + 1} 0 obj ${object} endobj\n`, "latin1");
    offsets.push(cursor);
    chunks.push(body);
    cursor += body.length;
  });
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  xref += `trailer << /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${cursor}\n%%EOF`;
  chunks.push(Buffer.from(xref, "latin1"));
  return Buffer.concat(chunks);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function zipStore(files: { name: string; data: Buffer }[]): Buffer {
  const parts: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const crc = crc32(file.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(file.data.length, 18);
    local.writeUInt32LE(file.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0);
    cen.writeUInt16LE(20, 4);
    cen.writeUInt16LE(20, 6);
    cen.writeUInt32LE(crc, 16);
    cen.writeUInt32LE(file.data.length, 20);
    cen.writeUInt32LE(file.data.length, 24);
    cen.writeUInt16LE(name.length, 28);
    cen.writeUInt32LE(offset, 42);
    parts.push(local, name, file.data);
    central.push(cen, name);
    offset += local.length + name.length + file.data.length;
  }
  const centralBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, centralBuf, eocd]);
}

function xmlEscape(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function renderDocx(text: string): Buffer {
  const paragraphs = text.split("\n").map((line) => `<w:p><w:r><w:t xml:space="preserve">${xmlEscape(line)}</w:t></w:r></w:p>`).join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipStore([
    { name: "[Content_Types].xml", data: Buffer.from(types, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "word/document.xml", data: Buffer.from(document, "utf8") },
  ]);
}

export function renderBriefFiles(body: BriefBody, meta: BriefMeta): {
  markdown: string;
  csv: string;
  pdf: Buffer;
  docx: Buffer;
} {
  const markdown = renderMarkdown(body, meta);
  return { markdown, csv: renderCsv(body), pdf: renderPdf(markdown), docx: renderDocx(markdown) };
}

export function briefAudit(
  action: "brief.create" | "brief.edit" | "brief.review" | "brief.sign" | "brief.export",
  briefId: string,
  version: number,
  role: string,
  extra: Record<string, string> = {},
): { action: string; briefId: string; version: number; role: string; format?: string } {
  return { action, briefId, version, role, ...extra };
}
