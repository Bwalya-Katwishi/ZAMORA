import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getPool, query } from "@/lib/db";
import {
  appendVersion,
  applyBriefPatch,
  briefAudit,
  briefPermissions,
  checkBrief,
  exportDecision,
  parseBriefBody,
  parseClaimLines,
  parseQuestionLines,
  parseScenarioLines,
  renderBriefFiles,
  type BriefBody,
  type BriefMeta,
  type BriefPermissions,
  type BriefStatus,
} from "@/lib/foresight";
import { allows } from "@/lib/roles";
import type { SessionUser } from "@/lib/types";

export class BriefError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export interface StoredBrief {
  id: string;
  status: BriefStatus;
  version: number;
  body: BriefBody;
  ownerId: string;
  reviewerName: string | null;
  reviewerRole: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  signerName: string | null;
  signerRole: string | null;
  signedAt: string | null;
  signature: string | null;
  versions: { version: number; note: string; status: BriefStatus; editor: string; createdAt: string }[];
  warnings: ReturnType<typeof checkBrief>;
  permissions: BriefPermissions;
}

interface BriefRow {
  id: string;
  owner_id: string;
  organization_id: string | null;
  status: BriefStatus;
  title: string;
  body: unknown;
  version: number;
  reviewer_id: string | null;
  reviewer_name: string | null;
  reviewer_role: string | null;
  reviewed_at: Date | string | null;
  review_note: string | null;
  signer_name: string | null;
  signer_role: string | null;
  signed_at: Date | string | null;
  signature: string | null;
}

function iso(value: Date | string | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

function metaOf(row: BriefRow, versions: StoredBrief["versions"]): BriefMeta {
  return {
    status: row.status,
    versions: versions.map((version) => ({ version: version.version, note: version.note, editor: version.editor, createdAt: version.createdAt })),
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role,
    reviewedAt: iso(row.reviewed_at),
    reviewNote: row.review_note,
    signerName: row.signer_name,
    signerRole: row.signer_role,
    signedAt: iso(row.signed_at),
    signature: row.signature,
  };
}

async function orgOf(userId: string): Promise<string | null> {
  const rows = await query<{ organization_id: string | null }>("select organization_id from users where id = $1", [userId]);
  return rows[0]?.organization_id ?? null;
}

async function readRow(id: string): Promise<BriefRow | null> {
  const rows = await query<BriefRow>(
    `select id, owner_id, organization_id, status, title, body, version, reviewer_id, reviewer_name, reviewer_role,
            reviewed_at, review_note, signer_name, signer_role, signed_at, signature
     from foresight_briefs where id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

async function readVersions(id: string): Promise<StoredBrief["versions"]> {
  const rows = await query<{ version: number; note: string; status: BriefStatus; editor: string | null; created_at: Date | string }>(
    `select v.version, v.note, v.status, v.created_at, coalesce(u.name, 'Desk') as editor
     from foresight_versions v
     left join users u on u.id = v.editor_id
     where v.brief_id = $1
     order by v.version`,
    [id],
  );
  return rows.map((row) => ({
    version: row.version,
    note: row.note,
    status: row.status,
    editor: row.editor ?? "Desk",
    createdAt: iso(row.created_at) ?? "",
  }));
}

function present(row: BriefRow, versions: StoredBrief["versions"], user: SessionUser, orgId: string | null): StoredBrief | null {
  const body = parseBriefBody(row.body);
  if (!body) throw new BriefError("The brief record could not be read.", 500);
  const decision = exportDecision(body, row.status);
  const permissions = briefPermissions({
    role: user.role,
    isOwner: row.owner_id === user.id,
    sameOrg: Boolean(orgId && row.organization_id && orgId === row.organization_id),
    status: row.status,
    hasReview: Boolean(row.reviewer_id),
    exportable: decision.ok,
  });
  if (!permissions.read) return null;
  return {
    id: row.id,
    status: row.status,
    version: row.version,
    body,
    ownerId: row.owner_id,
    reviewerName: row.reviewer_name,
    reviewerRole: row.reviewer_role,
    reviewedAt: iso(row.reviewed_at),
    reviewNote: row.review_note,
    signerName: row.signer_name,
    signerRole: row.signer_role,
    signedAt: iso(row.signed_at),
    signature: row.signature,
    versions,
    warnings: checkBrief(body),
    permissions,
  };
}

export async function loadBrief(id: string, user: SessionUser): Promise<StoredBrief | null> {
  const row = await readRow(id);
  if (!row) return null;
  const [versions, orgId] = await Promise.all([readVersions(id), orgOf(user.id)]);
  return present(row, versions, user, orgId);
}

export async function listBriefs(user: SessionUser): Promise<{ id: string; title: string; status: BriefStatus; version: number; updatedAt: string; signerName: string | null }[]> {
  const orgId = await orgOf(user.id);
  const rows = await query<{ id: string; title: string; status: BriefStatus; version: number; updated_at: Date | string; signer_name: string | null }>(
    `select id, title, status, version, updated_at, signer_name
     from foresight_briefs
     where owner_id = $1
        or ($2::uuid is not null and organization_id = $2::uuid)
        or $3 = 'admin'
     order by updated_at desc
     limit 50`,
    [user.id, orgId, user.role],
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    version: row.version,
    updatedAt: iso(row.updated_at) ?? "",
    signerName: row.signer_name,
  }));
}

async function audit(client: PoolClient, user: SessionUser, action: "brief.create" | "brief.edit" | "brief.review" | "brief.sign" | "brief.export", briefId: string, version: number, extra: Record<string, string> = {}): Promise<void> {
  await client.query(
    `insert into audit_log (actor_id, action, entity_type, entity_id, detail)
     values ($1, $2, 'brief', $3, $4::jsonb)`,
    [user.id, action, briefId, JSON.stringify(briefAudit(action, briefId, version, user.role, extra))],
  );
}

async function writeVersion(client: PoolClient, briefId: string, version: number, editorId: string, note: string, body: BriefBody, status: BriefStatus): Promise<void> {
  await client.query(
    `insert into foresight_versions (id, brief_id, version, editor_id, note, body, status)
     values ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
    [randomUUID(), briefId, version, editorId, note, JSON.stringify(body), status],
  );
}

export async function createBrief(user: SessionUser, body: BriefBody): Promise<string> {
  if (!allows(user.role, "researcher")) throw new BriefError("Researchers draft briefs.", 403);
  const id = randomUUID();
  const orgId = await orgOf(user.id);
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `insert into foresight_briefs (id, owner_id, organization_id, status, title, body, version)
       values ($1, $2, $3, 'draft', $4, $5::jsonb, 1)`,
      [id, user.id, orgId, body.title, JSON.stringify(body)],
    );
    await writeVersion(client, id, 1, user.id, "Drafted from the shelf.", body, "draft");
    await audit(client, user, "brief.create", id, 1);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  return id;
}

export async function updateBrief(id: string, user: SessionUser, fields: {
  title?: string;
  patterns?: string;
  signals?: string;
  parallels?: string;
  scenarios?: string;
  questions?: string;
}): Promise<StoredBrief> {
  const current = await loadBrief(id, user);
  if (!current) throw new BriefError("That brief is not on your desk.", 404);
  if (!current.permissions.edit) throw new BriefError("A signed brief stays as signed. Only the owner edits a draft.", 403);
  const body = applyBriefPatch(current.body, {
    title: fields.title,
    patterns: fields.patterns == null ? undefined : parseClaimLines(fields.patterns, current.body.sources, "pattern"),
    signals: fields.signals == null ? undefined : parseClaimLines(fields.signals, current.body.sources, "signal"),
    parallels: fields.parallels == null ? undefined : parseClaimLines(fields.parallels, current.body.sources, "parallel"),
    scenarios: fields.scenarios == null ? undefined : parseScenarioLines(fields.scenarios),
    questions: fields.questions == null ? undefined : parseQuestionLines(fields.questions),
  });
  const version = current.version + 1;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `update foresight_briefs set title = $2, body = $3::jsonb, version = $4, updated_at = now() where id = $1 and status <> 'signed'`,
      [id, body.title, JSON.stringify(body), version],
    );
    await writeVersion(client, id, version, user.id, "Edited the draft.", body, current.status);
    await audit(client, user, "brief.edit", id, version);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  const saved = await loadBrief(id, user);
  if (!saved) throw new BriefError("The brief could not be reread.", 500);
  return saved;
}

export async function reviewBrief(id: string, user: SessionUser, note: string): Promise<StoredBrief> {
  const current = await loadBrief(id, user);
  if (!current) throw new BriefError("That brief is not on your desk.", 404);
  if (!current.permissions.review) throw new BriefError("An editor reviews a brief. A reader or a researcher does not.", 403);
  const review = note.replace(/\s+/g, " ").trim();
  if (review.length < 12 || review.length > 800) throw new BriefError("The review note needs at least 12 characters.", 400);
  const version = current.version + 1;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `update foresight_briefs
       set status = 'in_review', reviewer_id = $2, reviewer_name = $3, reviewer_role = $4,
           reviewed_at = now(), review_note = $5, version = $6, updated_at = now()
       where id = $1 and status <> 'signed'`,
      [id, user.id, user.name, user.role, review, version],
    );
    await writeVersion(client, id, version, user.id, `Reviewed. ${review}`.slice(0, 400), current.body, "in_review");
    await audit(client, user, "brief.review", id, version);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  const saved = await loadBrief(id, user);
  if (!saved) throw new BriefError("The brief could not be reread.", 500);
  return saved;
}

export async function signBrief(id: string, user: SessionUser, signature: string): Promise<StoredBrief> {
  const current = await loadBrief(id, user);
  if (!current) throw new BriefError("That brief is not on your desk.", 404);
  if (!current.permissions.sign) throw new BriefError("Sign-off waits for an editor, and for a review already stored.", 403);
  if (signature.trim() !== user.name) throw new BriefError("Type your name as it is on the account. That is the signature.", 400);
  const version = current.version + 1;
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await client.query(
      `update foresight_briefs
       set status = 'signed', signer_id = $2, signer_name = $3, signer_role = $4,
           signed_at = now(), signature = $5, version = $6, updated_at = now()
       where id = $1 and status <> 'signed' and reviewer_id is not null`,
      [id, user.id, user.name, user.role, user.name, version],
    );
    await writeVersion(client, id, version, user.id, "Signed.", current.body, "signed");
    await audit(client, user, "brief.sign", id, version);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  const saved = await loadBrief(id, user);
  if (!saved) throw new BriefError("The brief could not be reread.", 500);
  return saved;
}

export async function exportBrief(id: string, user: SessionUser, format: "markdown" | "pdf" | "docx" | "csv"): Promise<{ filename: string; type: string; body: Buffer }> {
  const current = await loadBrief(id, user);
  if (!current) throw new BriefError("That brief is not on your desk.", 404);
  const decision = exportDecision(current.body, current.status);
  if (!decision.ok || !current.permissions.read) {
    throw new BriefError(decision.ok ? "Export is closed." : decision.reasons.join(" "), 409);
  }
  const versions = await readVersions(id);
  const row = await readRow(id);
  if (!row) throw new BriefError("That brief is not on your desk.", 404);
  const files = renderBriefFiles(current.body, metaOf(row, versions));
  const client = await getPool().connect();
  try {
    await client.query("begin");
    await audit(client, user, "brief.export", id, current.version, { format });
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
  const stem = `brief-${id.slice(0, 8)}`;
  if (format === "markdown") return { filename: `${stem}.md`, type: "text/markdown; charset=utf-8", body: Buffer.from(files.markdown, "utf8") };
  if (format === "csv") return { filename: `${stem}-sources.csv`, type: "text/csv; charset=utf-8", body: Buffer.from(files.csv, "utf8") };
  if (format === "pdf") return { filename: `${stem}.pdf`, type: "application/pdf", body: files.pdf };
  return { filename: `${stem}.docx`, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", body: files.docx };
}

export async function briefHistory(id: string, user: SessionUser): Promise<{ id: string; action: string; detail: unknown; createdAt: string }[]> {
  const current = await loadBrief(id, user);
  if (!current) throw new BriefError("That brief is not on your desk.", 404);
  const rows = await query<{ id: string; action: string; detail: unknown; created_at: Date | string }>(
    `select id::text, action, detail, created_at
     from audit_log
     where entity_type = 'brief' and entity_id = $1
     order by id`,
    [id],
  );
  return rows.map((row) => ({ id: row.id, action: row.action, detail: row.detail, createdAt: iso(row.created_at) ?? "" }));
}

export function briefFailure(error: unknown): string {
  if (error instanceof BriefError) return error.message;
  const message = error instanceof Error ? error.message : "";
  if (/foresight_briefs|foresight_versions/.test(message)) return "Briefs are not installed on this database yet.";
  return "The brief could not be saved.";
}
