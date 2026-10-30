import { createHash, randomBytes } from "node:crypto";
import { allows, roleRank, type Role } from "@/lib/roles";

export const pilotTypes = ["newsroom", "university", "mine_or_cooperative", "ngo_or_government"] as const;
export type PilotType = (typeof pilotTypes)[number];

export const onboardingSteps = [
  "organization",
  "members",
  "question",
  "place",
  "sector",
  "saved_search",
  "brief",
  "feedback",
  "return_visit",
] as const;

export function isPilotType(value: string): value is PilotType {
  return (pilotTypes as readonly string[]).includes(value);
}

export function isRole(value: string): value is Role {
  return value in roleRank;
}

export function onboardingStatus(done: string[]): { complete: boolean; missing: string[]; steps: number } {
  const missing = onboardingSteps.filter((step) => !done.includes(step));
  return { complete: missing.length === 0, missing: [...missing], steps: onboardingSteps.length };
}

export function canReadPrivateDesk(input: { privateDesk: boolean; member: boolean; role: Role }): boolean {
  if (!input.privateDesk) return true;
  if (input.role === "admin") return true;
  return input.member;
}

export function canInvite(actor: Role, invited: Role): boolean {
  if (actor !== "admin" && !allows(actor, "org_admin")) return false;
  if (invited === "admin" && actor !== "admin") return false;
  return isRole(invited);
}

export function sameOrganization(viewerOrg: string | null, recordOrg: string | null, role: Role): boolean {
  if (role === "admin") return true;
  return Boolean(viewerOrg) && viewerOrg === recordOrg;
}

export function apiKeyAllows(scopes: string[], needed: string): boolean {
  return scopes.includes("*") || scopes.includes(needed);
}

export function issueApiKey(): { raw: string; hash: string } {
  const raw = `zam_${randomBytes(24).toString("hex")}`;
  const hash = createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

export function usageReport(events: { action: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.action] = (counts[event.action] ?? 0) + 1;
  return counts;
}
