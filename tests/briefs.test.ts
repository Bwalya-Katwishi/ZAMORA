import assert from "node:assert/strict";
import test from "node:test";
import type { DeskResponse } from "../src/lib/evidence";
import {
  appendVersion,
  applyBriefPatch,
  briefAudit,
  briefPermissions,
  checkBrief,
  draftFromPack,
  exportDecision,
  parseClaimLines,
  parseScenarioLines,
  renderBriefFiles,
  renderCsv,
  renderDocx,
  renderMarkdown,
  renderPdf,
  type BriefBody,
  type BriefMeta,
} from "../src/lib/foresight";

function source(id = "davis-1933"): BriefBody["sources"][number] {
  return {
    id,
    accession: "ZMR-1933-009",
    title: "Modern Industry and the African",
    citation: "Davis, J. Merle. 1933. Modern Industry and the African.",
    url: null,
    year: 1933,
  };
}

function body(patch: Partial<BriefBody> = {}): BriefBody {
  const shelf = source();
  return {
    title: "Copperbelt. Labour.",
    placeId: "copperbelt",
    placeName: "Copperbelt",
    sectorNames: ["Labour"],
    from: 1930,
    to: 1999,
    question: "What labour records does the shelf hold for the Copperbelt?",
    scope: "Copperbelt. Labour. Historical record review. 1930–1999.",
    method: "Drafted from the shelf.",
    evidence: [{ id: "evidence-1", text: "ZMR-1933-009 is a catalog record.", sourceIds: [shelf.id] }],
    timeline: [{ year: 1933, label: "Modern Industry and the African", sourceId: shelf.id }],
    patterns: [],
    signals: [],
    parallels: [],
    scenarios: [],
    notShown: ["The texts are not held."],
    gaps: ["The texts are not held."],
    confidence: "limited",
    uncertainty: "Catalog notes are not quotations.",
    questions: ["What record would close the gap?"],
    sources: [shelf],
    ...patch,
  };
}

function meta(patch: Partial<BriefMeta> = {}): BriefMeta {
  return {
    status: "draft",
    versions: [{ version: 1, note: "Drafted from the shelf.", editor: "Researcher", createdAt: "2026-10-15T12:00:00.000Z" }],
    reviewerName: null,
    reviewerRole: null,
    reviewedAt: null,
    reviewNote: null,
    signerName: null,
    signerRole: null,
    signedAt: null,
    signature: null,
    ...patch,
  };
}

function pack(): DeskResponse {
  return {
    query: "labour",
    filters: {
      placeId: "copperbelt",
      placeName: "Copperbelt",
      placeKind: "province",
      placeAssigned: true,
      sectorIds: ["labour"],
      sectorNames: ["Labour"],
      from: 1930,
      to: 1999,
      questionType: "historical",
      keywords: "labour",
      entityId: null,
      entityName: null,
    },
    scope: "Copperbelt. Labour. Historical record review. 1930–1999.",
    result_type: "evidence_pack",
    records: [{
      id: "davis-1933",
      accession: "ZMR-1933-009",
      title: "Modern Industry and the African",
      type: "report",
      year: 1933,
      summary: "A catalog note.",
      rights: "Metadata only.",
      url: null,
      metadataOnly: true,
      citation: "Davis, J. Merle. 1933. Modern Industry and the African.",
      places: [],
      sectors: [],
      entities: [],
    }],
    timeline: [{ year: 1933, label: "Modern Industry and the African", recordId: "davis-1933", accession: "ZMR-1933-009" }],
    entities: [],
    places: [],
    sectors: [],
    gaps: [{ code: "texts_not_held", detail: "The texts are not held." }],
    confidence: "limited",
    limitations: ["Catalog notes are not quotations."],
    citations: [],
  };
}

test("a draft copies shelf records and does not invent a pattern or a scenario", () => {
  const draft = draftFromPack(pack(), "What labour records does the shelf hold?");
  assert.equal(draft.sources.length, 1);
  assert.equal(draft.evidence[0].sourceIds[0], draft.sources[0].id);
  assert.equal(draft.patterns.length, 0);
  assert.equal(draft.scenarios.length, 0);
  assert.equal(draft.confidence, "limited");
  assert.match(draft.evidence[0].text, /catalog record/);
  const dumped = JSON.stringify(draft);
  assert.equal(dumped.includes("will definitely"), false);
  assert.equal(dumped.includes("probability"), false);
});

test("a claim without a source, an unknown accession, and a prediction are warnings", () => {
  const clean = body();
  assert.equal(checkBrief(clean).length, 0);
  const bare = body({ patterns: [{ id: "p1", text: "Wages moved.", sourceIds: [] }] });
  assert.equal(checkBrief(bare).some((warning) => warning.code === "missing_source"), true);
  const unknown = body({ patterns: parseClaimLines("Wages moved. ZMR-1999-999", clean.sources, "pattern") });
  assert.equal(checkBrief(unknown).some((warning) => warning.code === "unknown_source"), true);
  const labeled = parseScenarioLines("prediction: the mines will definitely close");
  assert.equal(labeled[0].label, "prediction");
  const called = body({ scenarios: labeled });
  const warnings = checkBrief(called);
  assert.equal(warnings.some((warning) => warning.code === "scenario_mislabeled"), true);
  assert.equal(warnings.some((warning) => warning.code === "prediction"), true);
  const scenario = body({ scenarios: [{ id: "s1", label: "scenario", text: "A later record might describe the same towns." }] });
  assert.equal(checkBrief(scenario).length, 0);
});

test("export is blocked without a signature, without a source, and with a citation warning", () => {
  const ready = body();
  const unsigned = exportDecision(ready, "draft");
  assert.equal(unsigned.ok, false);
  if (!unsigned.ok) assert.match(unsigned.reasons.join(" "), /signs/);
  const empty = exportDecision(body({ sources: [], evidence: [], timeline: [] }), "signed");
  assert.equal(empty.ok, false);
  if (!empty.ok) assert.match(empty.reasons.join(" "), /source/);
  const warned = exportDecision(body({ patterns: [{ id: "p1", text: "Wages moved.", sourceIds: [] }] }), "signed");
  assert.equal(warned.ok, false);
  if (!warned.ok) assert.match(warned.reasons.join(" "), /names no source/);
  assert.equal(exportDecision(ready, "signed").ok, true);
});

test("versions keep the earlier text after a later edit", () => {
  const first = body({ title: "First title" });
  const history = appendVersion([], { body: first, status: "draft", editor: "Researcher", note: "Drafted from the shelf.", at: "2026-10-15T12:00:00.000Z" });
  first.title = "Mutated";
  const second = applyBriefPatch(history[0].body, { title: "Second title" });
  const next = appendVersion(history, { body: second, status: "draft", editor: "Researcher", note: "Edited the draft.", at: "2026-10-15T13:00:00.000Z" });
  assert.equal(next.length, 2);
  assert.equal(next[0].version, 1);
  assert.equal(next[0].body.title, "First title");
  assert.equal(next[1].version, 2);
  assert.equal(next[1].body.title, "Second title");
  assert.equal(next[1].editor, "Researcher");
});

test("a researcher cannot sign, and an editor cannot export an unsigned brief", () => {
  const researcher = briefPermissions({ role: "researcher", isOwner: true, sameOrg: true, status: "in_review", hasReview: true, exportable: false });
  assert.equal(researcher.edit, true);
  assert.equal(researcher.review, false);
  assert.equal(researcher.sign, false);
  const editor = briefPermissions({ role: "editor", isOwner: false, sameOrg: true, status: "draft", hasReview: false, exportable: false });
  assert.equal(editor.review, true);
  assert.equal(editor.sign, false);
  assert.equal(editor.edit, false);
  const signer = briefPermissions({ role: "editor", isOwner: false, sameOrg: true, status: "in_review", hasReview: true, exportable: true });
  assert.equal(signer.sign, true);
  assert.equal(signer.export, true);
  const outsider = briefPermissions({ role: "editor", isOwner: false, sameOrg: false, status: "in_review", hasReview: true, exportable: true });
  assert.equal(outsider.read, false);
  assert.equal(outsider.sign, false);
  const audit = briefAudit("brief.sign", "brief-1", 3, "editor");
  assert.equal(audit.action, "brief.sign");
  assert.equal(audit.version, 3);
  assert.equal(audit.role, "editor");
});

test("markdown, pdf, docx, and csv carry the source and the signature line", () => {
  const signed = meta({
    status: "signed",
    reviewerName: "Editor",
    reviewerRole: "editor",
    reviewedAt: "2026-10-15T12:00:00.000Z",
    reviewNote: "Checked the accession against the shelf.",
    signerName: "Editor",
    signerRole: "editor",
    signedAt: "2026-10-15T14:00:00.000Z",
    signature: "Editor",
  });
  const files = renderBriefFiles(body(), signed);
  assert.match(files.markdown, /# Copperbelt\. Labour\./);
  assert.match(files.markdown, /Possible scenarios/);
  assert.match(files.markdown, /not a prediction/);
  assert.match(files.markdown, /ZMR-1933-009/);
  assert.match(files.markdown, /Signature: Editor/);
  assert.match(files.markdown, /Version history/);
  const unsigned = renderMarkdown(body(), meta());
  assert.match(unsigned, /Not signed/);
  const csv = renderCsv(body());
  assert.match(csv, /^accession,title,year,citation,url/);
  assert.match(csv, /ZMR-1933-009/);
  assert.equal(csv.includes("probability"), false);
  const pdf = renderPdf(files.markdown);
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.ok(pdf.includes(Buffer.from("Copperbelt. Labour.")));
  assert.ok(pdf.includes(Buffer.from("%%EOF")));
  const docx = renderDocx(files.markdown);
  assert.equal(docx.readUInt32LE(0), 0x04034b50);
  assert.ok(docx.includes(Buffer.from("word/document.xml")));
  assert.ok(docx.includes(Buffer.from("Copperbelt. Labour.")));
});
