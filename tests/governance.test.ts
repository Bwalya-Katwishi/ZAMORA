import assert from "node:assert/strict";
import test from "node:test";
import { applyTakedown, auditCoverage, canManageSource, canReadAudit, mayIngest, mayStoreText, type SourceRecord } from "../src/lib/governance";

const open: SourceRecord = {
  id: "example",
  name: "Example",
  licenseState: "open",
  reviewOn: "2027-01-01",
  ingestion: "metadata",
  fullText: false,
};

test("a missing or expired license blocks ingest", () => {
  assert.equal(mayIngest({ ...open, licenseState: null }, "2026-10-15").ok, false);
  assert.equal(mayIngest({ ...open, licenseState: "expired" }, "2026-10-15").ok, false);
  assert.equal(mayIngest({ ...open, reviewOn: "2026-01-01" }, "2026-10-15").ok, false);
  assert.equal(mayIngest({ ...open, licenseState: "restricted" }, "2026-10-15").ok, false);
  assert.equal(mayIngest(open, "2026-10-15").ok, true);
});

test("metadata-only text stays with the publisher", () => {
  const decision = mayStoreText({ ...open, licenseState: "metadata_only" });
  assert.equal(decision.ok, false);
  assert.match(decision.reason, /Metadata only/);
  assert.equal(mayStoreText({ ...open, fullText: true }).ok, true);
});

test("a takedown blocks the source and the audit list is explicit", () => {
  const blocked = applyTakedown(open);
  assert.equal(blocked.ingestion, "blocked");
  assert.equal(mayIngest(blocked, "2026-10-15").ok, false);
  const partial = auditCoverage(["ingest", "edit"]);
  assert.equal(partial.complete, false);
  assert.ok(partial.missing.includes("forecast"));
  assert.equal(auditCoverage(["ingest", "edit", "override", "query", "brief", "export", "forecast"]).complete, true);
});

test("source roles stay with editors and the audit with administrators", () => {
  assert.equal(canManageSource("researcher"), false);
  assert.equal(canManageSource("editor"), true);
  assert.equal(canReadAudit("editor"), false);
  assert.equal(canReadAudit("admin"), true);
});
