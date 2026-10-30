import { allows, type Role } from "@/lib/roles";

export const licenseStates = [
  "public_domain",
  "open",
  "metadata_only",
  "request",
  "partnership",
  "restricted",
  "expired",
] as const;

export type LicenseState = (typeof licenseStates)[number];

export interface SourceRecord {
  id: string;
  name: string;
  licenseState: LicenseState | null;
  reviewOn: string | null;
  ingestion: "not_started" | "metadata" | "blocked";
  fullText: boolean;
}

const AUDIT_ACTIONS = ["ingest", "edit", "override", "query", "brief", "export", "forecast"] as const;

export function isLicenseState(value: string): value is LicenseState {
  return (licenseStates as readonly string[]).includes(value);
}

export function mayIngest(source: SourceRecord, today: string): { ok: boolean; reason: string } {
  if (!source.licenseState) return { ok: false, reason: "No ingestion without a license state." };
  if (source.licenseState === "expired") return { ok: false, reason: "An expired license blocks ingestion." };
  if (source.reviewOn && source.reviewOn < today) return { ok: false, reason: "The license review date has passed." };
  if (source.ingestion === "blocked") return { ok: false, reason: "A takedown blocks ingestion." };
  if (source.licenseState === "restricted") return { ok: false, reason: "Restricted material is not ingested for public display." };
  if (source.licenseState === "request" || source.licenseState === "partnership") {
    return { ok: false, reason: "This source waits for a request or a partnership. Nothing is crawled." };
  }
  return { ok: true, reason: "The license state allows the registered access method." };
}

export function mayStoreText(source: SourceRecord): { ok: boolean; reason: string } {
  if (source.licenseState === "metadata_only") return { ok: false, reason: "Metadata only. The text stays with the publisher." };
  if (source.licenseState !== "public_domain" && source.licenseState !== "open") {
    return { ok: false, reason: "Full text is stored only for public-domain or open sources with a checked right." };
  }
  if (!source.fullText) return { ok: false, reason: "This registration does not include a checked full-text right." };
  return { ok: true, reason: "A checked open or public-domain right covers the stored text." };
}

export function applyTakedown<T extends SourceRecord>(source: T): T {
  return { ...source, ingestion: "blocked" };
}

export function auditCoverage(actions: string[]): { complete: boolean; missing: string[] } {
  const missing = AUDIT_ACTIONS.filter((action) => !actions.includes(action));
  return { complete: missing.length === 0, missing: [...missing] };
}

export function canManageSource(role: Role): boolean {
  return allows(role, "editor");
}

export function canReadAudit(role: Role): boolean {
  return role === "admin";
}
