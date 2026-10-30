import { query } from "@/lib/db";
import { draftInvoice, effectivePlan, findPlan, seatsAllowed } from "@/lib/billing";
import { evaluateForecast, forReader, MODEL_VERSION, publicationDecision, refuseUseCase, type ForecastEvaluation } from "@/lib/forecast";
import { isLicenseState, mayIngest, type LicenseState, type SourceRecord } from "@/lib/governance";
import type { Role } from "@/lib/roles";
import type { SessionUser } from "@/lib/types";
import { isPilotType, isRole, issueApiKey } from "@/lib/workspace";

export class OpsError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

function installed(error: unknown): never {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
  if (code === "42P01") throw new OpsError("This register is not installed on the database yet.", 503);
  if (error instanceof OpsError) throw error;
  throw new OpsError("The request could not be stored.", 500);
}

export async function recordUsage(action: string, user: SessionUser | null): Promise<void> {
  const org = user ? await organizationId(user.id) : null;
  await query(
    `insert into usage_events (organization_id, user_id, action) values ($1, $2, $3)`,
    [org, user?.id ?? null, action],
  ).catch((error) => installed(error));
}

export async function actorOrganization(userId: string): Promise<string | null> {
  const rows = await query<{ organization_id: string | null }>(
    `select organization_id from users where id = $1`,
    [userId],
  );
  return rows[0]?.organization_id ?? null;
}

async function organizationId(userId: string): Promise<string | null> {
  return actorOrganization(userId);
}

export async function listSources(): Promise<Record<string, unknown>[]> {
  try {
    return await query(
      `select id, name, license_state, access_method, permitted, prohibited, refresh_schedule, steward,
              last_checked::text, review_on::text, ingestion, ocr_status, notes
       from data_sources order by name`,
    );
  } catch (error) {
    installed(error);
  }
}

export async function registerSource(input: SourceRecord & {
  accessMethod: string;
  permitted: string;
  prohibited: string;
  refresh: string;
  steward: string;
  ocrStatus: string;
  notes: string;
}, today: string): Promise<void> {
  const decision = mayIngest(input, today);
  if (!decision.ok) throw new OpsError(decision.reason, 422);
  if (!input.licenseState) throw new OpsError("No ingestion without a license state.", 422);
  try {
    await query(
      `insert into data_sources
         (id, name, license_state, access_method, permitted, prohibited, refresh_schedule, steward, review_on, ingestion, ocr_status, notes)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'not_started',$10,$11)`,
      [input.id, input.name, input.licenseState, input.accessMethod, input.permitted, input.prohibited, input.refresh, input.steward, input.reviewOn, input.ocrStatus, input.notes],
    );
  } catch (error) {
    installed(error);
  }
}

export async function patchSource(id: string, patch: { licenseState?: string; reviewOn?: string | null; notes?: string }, actor: SessionUser): Promise<void> {
  if (patch.licenseState && !isLicenseState(patch.licenseState)) throw new OpsError("Unknown license state.", 422);
  try {
    const rows = await query<{ id: string }>(
      `update data_sources
       set license_state = coalesce($2, license_state),
           review_on = coalesce($3::date, review_on),
           notes = coalesce($4, notes)
       where id = $1
       returning id`,
      [id, patch.licenseState ?? null, patch.reviewOn ?? null, patch.notes ?? null],
    );
    if (!rows[0]) throw new OpsError("No source with that id.", 404);
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'edit', 'source', $2, $3::jsonb)`,
      [actor.id, id, JSON.stringify({ licenseState: patch.licenseState ?? null })],
    );
  } catch (error) {
    installed(error);
  }
}

export async function markLicenseCheck(id: string, today: string, reviewOn: string, actor: SessionUser): Promise<void> {
  try {
    const rows = await query(
      `update data_sources set last_checked = $2::date, review_on = $3::date where id = $1 returning id`,
      [id, today, reviewOn],
    );
    if (!rows[0]) throw new OpsError("No source with that id.", 404);
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'ingest', 'source', $2, $3::jsonb)`,
      [actor.id, id, JSON.stringify({ lastChecked: today, reviewOn })],
    );
  } catch (error) {
    installed(error);
  }
}

export async function takeDown(sourceId: string, reason: string, actor: SessionUser): Promise<void> {
  if (reason.trim().length < 12) throw new OpsError("A takedown needs a reason of at least 12 characters.", 422);
  try {
    const rows = await query(`update data_sources set ingestion = 'blocked' where id = $1 returning id`, [sourceId]);
    if (!rows[0]) throw new OpsError("No source with that id.", 404);
    await query(
      `insert into takedowns (source_id, reason, actor_id) values ($1, $2, $3)`,
      [sourceId, reason.trim(), actor.id],
    );
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'edit', 'takedown', $2, $3::jsonb)`,
      [actor.id, sourceId, JSON.stringify({ reason: reason.trim() })],
    );
  } catch (error) {
    installed(error);
  }
}

export async function listAudit(limit = 100): Promise<Record<string, unknown>[]> {
  try {
    return await query(
      `select id, actor_id, action, entity_type, entity_id, detail, created_at
       from audit_log order by id desc limit $1`,
      [limit],
    );
  } catch (error) {
    installed(error);
  }
}

export async function saveForecast(input: { indicatorCode?: string; useCase?: string }, actor: SessionUser | null): Promise<Record<string, unknown>> {
  const refusal = input.useCase ? refuseUseCase(input.useCase) : null;
  let evaluation: ForecastEvaluation | null = null;
  let status = "insufficient";
  if (refusal) status = "insufficient";
  else if (input.indicatorCode) {
    const points = await query<{ year: number; value: number }>(
      `select year, value::float8 as value from indicator_observations where indicator_code = $1 order by year`,
      [input.indicatorCode],
    );
    if (!points.length) throw new OpsError("That series is not on the shelf.", 404);
    evaluation = evaluateForecast(points.map((point) => ({ year: Number(point.year), value: Number(point.value) })));
    status = evaluation.status;
  } else throw new OpsError("Name a use case or a series that is already stored.", 422);
  const stored = evaluation ?? {
    status: "insufficient",
    modelVersion: MODEL_VERSION,
    reason: refusal?.reason,
    individual: false,
    published: false,
    scenario: null,
  };
  try {
    const rows = await query<{ id: string }>(
      `insert into forecasts (indicator_code, use_case, status, model_version, evaluation)
       values ($1, $2, $3, $4, $5::jsonb) returning id`,
      [input.indicatorCode ?? null, input.useCase ?? null, status, MODEL_VERSION, JSON.stringify(stored)],
    );
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'forecast', 'forecast', $2, $3::jsonb)`,
      [actor?.id ?? null, rows[0].id, JSON.stringify({ status })],
    );
    return { id: rows[0].id, status, modelVersion: MODEL_VERSION, evaluation: forReader(evaluation ?? evaluateForecast([]), false), refusal };
  } catch (error) {
    installed(error);
  }
}

export async function listForecasts(): Promise<Record<string, unknown>[]> {
  try {
    const rows = await query<{
      id: string;
      status: string;
      model_version: string;
      evaluation: ForecastEvaluation;
      brief_id: string | null;
      indicator_code: string | null;
      use_case: string | null;
    }>(
      `select id, status, model_version, evaluation, brief_id, indicator_code, use_case
       from forecasts order by created_at desc limit 50`,
    );
    return rows.map((row) => ({
      id: row.id,
      status: row.status,
      modelVersion: row.model_version,
      indicatorCode: row.indicator_code,
      useCase: row.use_case,
      briefId: row.brief_id,
      evaluation: forReader(row.evaluation, row.status === "approved"),
    }));
  } catch (error) {
    installed(error);
  }
}

export async function getForecast(id: string): Promise<Record<string, unknown> | null> {
  try {
    const rows = await query<{ id: string; status: string; model_version: string; evaluation: ForecastEvaluation; brief_id: string | null; indicator_code: string | null; use_case: string | null }>(
      `select id, status, model_version, evaluation, brief_id, indicator_code, use_case from forecasts where id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    const approved = row.status === "approved";
    return {
      id: row.id,
      status: row.status,
      modelVersion: row.model_version,
      indicatorCode: row.indicator_code,
      useCase: row.use_case,
      briefId: row.brief_id,
      evaluation: forReader(row.evaluation, approved),
    };
  } catch (error) {
    installed(error);
  }
}

export async function decideForecast(id: string, decision: "approved" | "rejected", briefId: string | null, actor: SessionUser): Promise<void> {
  try {
    const rows = await query<{ status: string; evaluation: ForecastEvaluation }>(
      `select status, evaluation from forecasts where id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) throw new OpsError("No forecast with that id.", 404);
    if (decision === "approved") {
      if (!briefId) throw new OpsError("Approval needs a signed brief.", 422);
      const signed = await query<{ id: string }>(
        `select id from foresight_briefs where id = $1 and status = 'signed'`,
        [briefId],
      );
      const gate = publicationDecision(row.evaluation, Boolean(signed[0]));
      if (!gate.ok) throw new OpsError(gate.reason, 422);
      await query(
        `update forecasts set status = 'approved', brief_id = $2, decided_by = $3 where id = $1`,
        [id, briefId, actor.id],
      );
    } else {
      await query(
        `update forecasts set status = 'rejected', decided_by = $2 where id = $1`,
        [id, actor.id],
      );
    }
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'forecast', 'forecast', $2, $3::jsonb)`,
      [actor.id, id, JSON.stringify({ decision })],
    );
  } catch (error) {
    installed(error);
  }
}

export async function createOrganization(name: string, kind: string, actor: SessionUser): Promise<string> {
  if (!isPilotType(kind)) throw new OpsError("Unknown pilot type.", 422);
  if (name.trim().length < 3) throw new OpsError("Name the organization.", 422);
  try {
    const rows = await query<{ id: string }>(
      `insert into organizations (name, kind) values ($1, $2) returning id`,
      [name.trim(), kind],
    );
    await query(
      `insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'edit', 'organization', $2, '{}'::jsonb)`,
      [actor.id, rows[0].id],
    );
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function inviteMember(organizationId: string, email: string, role: Role, actor: SessionUser): Promise<string> {
  if (!email.includes("@")) throw new OpsError("The invitation needs an email.", 422);
  try {
    const rows = await query<{ id: string }>(
      `insert into invitations (organization_id, email, role, invited_by) values ($1, $2, $3, $4) returning id`,
      [organizationId, email.trim(), role, actor.id],
    );
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function createWorkspace(organizationId: string, name: string, isPrivate: boolean, actor: SessionUser): Promise<string> {
  try {
    const rows = await query<{ id: string }>(
      `insert into workspaces (organization_id, name, private) values ($1, $2, $3) returning id`,
      [organizationId, name.trim(), isPrivate],
    );
    await query(
      `insert into workspace_members (workspace_id, user_id, role) values ($1, $2, $3)`,
      [rows[0].id, actor.id, actor.role],
    );
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function addWorkspaceMember(workspaceId: string, userId: string, role: Role): Promise<void> {
  if (!isRole(role)) throw new OpsError("Unknown role.", 422);
  try {
    await query(
      `insert into workspace_members (workspace_id, user_id, role) values ($1, $2, $3)
       on conflict (workspace_id, user_id) do update set role = excluded.role`,
      [workspaceId, userId, role],
    );
  } catch (error) {
    installed(error);
  }
}

export async function saveSearch(user: SessionUser, name: string, searchQuery: unknown): Promise<string> {
  const org = await organizationId(user.id);
  try {
    const rows = await query<{ id: string }>(
      `insert into saved_searches (organization_id, user_id, name, query) values ($1, $2, $3, $4::jsonb) returning id`,
      [org, user.id, name.trim(), JSON.stringify(searchQuery ?? {})],
    );
    await recordUsage("query", user);
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function createAlert(user: SessionUser, searchId: string, cadence: string): Promise<string> {
  if (cadence !== "weekly" && cadence !== "monthly") throw new OpsError("An alert is weekly or monthly.", 422);
  const org = await organizationId(user.id);
  try {
    const rows = await query<{ id: string }>(
      `insert into alerts (organization_id, user_id, search_id, cadence) values ($1, $2, $3, $4) returning id`,
      [org, user.id, searchId, cadence],
    );
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function usageSummary(user: SessionUser): Promise<Record<string, number>> {
  const org = await organizationId(user.id);
  try {
    const rows = await query<{ action: string; count: number }>(
      `select action, count(*)::int as count from usage_events
       where organization_id is not distinct from $1
       group by action order by action`,
      [org],
    );
    return Object.fromEntries(rows.map((row) => [row.action, row.count]));
  } catch (error) {
    installed(error);
  }
}

export async function createApiKey(user: SessionUser, name: string, scopes: string[]): Promise<{ id: string; token: string }> {
  const issued = issueApiKey();
  const org = await organizationId(user.id);
  try {
    const rows = await query<{ id: string }>(
      `insert into api_keys (organization_id, user_id, name, token_hash, scopes) values ($1, $2, $3, $4, $5) returning id`,
      [org, user.id, name.trim(), issued.hash, scopes],
    );
    return { id: rows[0].id, token: issued.raw };
  } catch (error) {
    installed(error);
  }
}

export async function createSubscription(organizationId: string, planId: string, seats: number, trial: boolean): Promise<string> {
  const plan = findPlan(planId);
  if (!plan) throw new OpsError("Unknown plan.", 422);
  const seatCheck = plan.seatCap == null ? { ok: false, reason: "This audience is not priced." } : seatsAllowed(planId, seats);
  if (!seatCheck.ok) throw new OpsError(seatCheck.reason, 422);
  try {
    const rows = await query<{ id: string }>(
      `insert into subscriptions (organization_id, plan_id, status, seats, trial_ends)
       values ($1, $2, $3, $4, case when $3 = 'trial' then current_date + 30 else null end)
       returning id`,
      [organizationId, planId, trial ? "trial" : "active", seats],
    );
    if (!trial && plan.priceZmw) {
      const invoice = draftInvoice(planId, seats);
      if (!("error" in invoice)) {
        await query(
          `insert into invoices (subscription_id, amount_zmw, currency, planning, status, provider, note)
           values ($1, $2, 'ZMW', true, 'issued', 'manual', $3)`,
          [rows[0].id, invoice.amountZmw, invoice.note],
        );
      }
    }
    return rows[0].id;
  } catch (error) {
    installed(error);
  }
}

export async function getSubscription(id: string): Promise<Record<string, unknown> | null> {
  try {
    const rows = await query(
      `select id, organization_id, plan_id, status, seats, trial_ends::text, created_at from subscriptions where id = $1`,
      [id],
    );
    return rows[0] ?? null;
  } catch (error) {
    installed(error);
  }
}

export async function setSeats(id: string, seats: number): Promise<void> {
  try {
    const rows = await query<{ plan_id: string }>(`select plan_id from subscriptions where id = $1`, [id]);
    if (!rows[0]) throw new OpsError("No subscription with that id.", 404);
    const check = seatsAllowed(rows[0].plan_id, seats);
    if (!check.ok) throw new OpsError(check.reason, 422);
    await query(`update subscriptions set seats = $2 where id = $1`, [id, seats]);
  } catch (error) {
    installed(error);
  }
}

export async function cancelSubscription(id: string): Promise<void> {
  try {
    const rows = await query(`update subscriptions set status = 'cancelled' where id = $1 returning id`, [id]);
    if (!rows[0]) throw new OpsError("No subscription with that id.", 404);
  } catch (error) {
    installed(error);
  }
}

export async function acceptWebhookEvent(provider: string, eventId: string): Promise<{ duplicate: boolean }> {
  if (!eventId) throw new OpsError("The webhook needs an id.", 422);
  try {
    const existing = await query<{ id: string }>(`select id from webhook_events where id = $1`, [eventId]);
    if (existing[0]) return { duplicate: true };
    await query(`insert into webhook_events (id, provider) values ($1, $2)`, [eventId, provider || "manual"]);
    return { duplicate: false };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String((error as { code: string }).code) : "";
    if (code === "23505") return { duplicate: true };
    installed(error);
  }
}

export async function listInvoices(organizationId: string | null): Promise<Record<string, unknown>[]> {
  try {
    return await query(
      `select i.id, i.amount_zmw, i.currency, i.planning, i.status, i.provider, i.note, i.created_at, s.plan_id, s.organization_id
       from invoices i
       join subscriptions s on s.id = i.subscription_id
       where ($1::uuid is null or s.organization_id = $1)
       order by i.created_at desc`,
      [organizationId],
    );
  } catch (error) {
    installed(error);
  }
}

export async function currentPlan(userId: string, today: string): Promise<string> {
  const org = await actorOrganization(userId);
  if (!org) return "public";
  try {
    const rows = await query<{ plan_id: string; status: "trial" | "active" | "cancelled"; trial_ends: string | null }>(
      `select plan_id, status, trial_ends::text from subscriptions
       where organization_id = $1 order by created_at desc limit 1`,
      [org],
    );
    if (!rows[0]) return "public";
    return effectivePlan({ planId: rows[0].plan_id, status: rows[0].status, trialEnds: rows[0].trial_ends }, today);
  } catch (error) {
    installed(error);
  }
}

export function opsFailure(error: unknown): { error: string; status: number } {
  if (error instanceof OpsError) return { error: error.message, status: error.status };
  return { error: "The request could not be stored.", status: 500 };
}

export async function onboardingFor(organizationId: string): Promise<string[]> {
  try {
    const rows = await query<{ step: string }>(
      `select step from onboarding_checks where organization_id = $1 and done`,
      [organizationId],
    );
    return rows.map((row) => row.step);
  } catch (error) {
    installed(error);
  }
}
