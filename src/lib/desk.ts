import { query } from "@/lib/db";
import type { ClaimItem, DocCard, InvestigationDetail, InvestigationSummary, SessionUser } from "@/lib/types";

async function canSee(user: SessionUser, investigationId: string): Promise<boolean> {
  if (user.role === "admin") return true;
  const rows = await query<{ ok: number }>(
    `select 1 as ok from investigations i
     left join investigation_members m on m.investigation_id = i.id and m.user_id = $2
     where i.id = $1 and (i.owner_id = $2 or m.user_id is not null)`,
    [investigationId, user.id],
  );
  return rows.length > 0;
}

export async function listInvestigations(user: SessionUser): Promise<InvestigationSummary[]> {
  return query<InvestigationSummary>(
    `select i.id, i.title, i.question, i.status, i.updated_at::text as "updatedAt"
     from investigations i
     left join investigation_members m on m.investigation_id = i.id and m.user_id = $1
     where i.owner_id = $1 or m.user_id is not null or $2 = 'admin'
     order by i.updated_at desc`,
    [user.id, user.role],
  );
}

export async function getInvestigation(user: SessionUser, id: string): Promise<InvestigationDetail | null> {
  if (!(await canSee(user, id))) return null;
  const rows = await query<InvestigationSummary>(
    `select id, title, question, status, updated_at::text as "updatedAt" from investigations where id = $1`,
    [id],
  );
  const investigation = rows[0];
  if (!investigation) return null;
  const [sources, claims, evidence, notes] = await Promise.all([
    query<DocCard & { document_type: string; published_year: number | null; about_year_start: number | null; about_year_end: number | null; comparative_label: string | null; verification_status: string }>(
      `select d.id, d.title, d.document_type, d.published_year, d.about_year_start, d.about_year_end,
              d.accession, d.summary, d.comparative, d.comparative_label, d.verification_status,
              d.summary as headline
       from investigation_sources s
       join documents d on d.id = s.document_id
       where s.investigation_id = $1
       order by d.published_year nulls last`,
      [id],
    ),
    query<{ id: string; statement: string; status: string }>(
      `select id, statement, status from claims where investigation_id = $1 order by created_at`,
      [id],
    ),
    query<{ id: string; claim_id: string; stance: ClaimItem["evidence"][number]["stance"]; note: string; document_id: string | null; title: string | null }>(
      `select e.id, e.claim_id, e.stance, e.note, e.document_id, d.title
       from claim_evidence e
       join claims c on c.id = e.claim_id
       left join documents d on d.id = e.document_id
       where c.investigation_id = $1`,
      [id],
    ),
    query<{ id: string; body: string; createdAt: string; author: string }>(
      `select n.id, n.body, n.created_at::text as "createdAt", u.name as author
       from notes n join users u on u.id = n.author_id
       where n.investigation_id = $1 order by n.created_at`,
      [id],
    ),
  ]);
  const people = sources.length
    ? await query<{ document_id: string; name: string; sort_name: string; kind: "person" | "institution" }>(
        `select dp.document_id, p.name, p.sort_name, p.kind
         from document_people dp
         join people p on p.id = dp.person_id
         where dp.document_id = any($1::text[])
         order by dp.position`,
        [sources.map((source) => source.id)],
      )
    : [];
  const mappedSources: DocCard[] = sources.map((source) => ({
    id: source.id,
    title: source.title,
    type: source.document_type,
    publishedYear: source.published_year,
    aboutStart: source.about_year_start,
    aboutEnd: source.about_year_end,
    accession: source.accession,
    summary: source.summary,
    comparative: source.comparative,
    comparativeLabel: source.comparative_label,
    verification: source.verification_status,
    headline: source.summary,
    authors: people
      .filter((person) => person.document_id === source.id)
      .map((person) => ({ name: person.name, sortName: person.sort_name, kind: person.kind })),
  }));
  const mappedClaims: ClaimItem[] = claims.map((claim) => ({
    id: claim.id,
    statement: claim.statement,
    status: claim.status,
    evidence: evidence
      .filter((item) => item.claim_id === claim.id)
      .map((item) => ({
        id: item.id,
        stance: item.stance,
        note: item.note,
        documentId: item.document_id,
        documentTitle: item.title,
      })),
  }));
  return { ...investigation, sources: mappedSources, claims: mappedClaims, notes };
}

export async function createInvestigation(user: SessionUser, title: string, question: string): Promise<string> {
  const rows = await query<{ id: string }>(
    `insert into investigations (owner_id, organization_id, title, question)
     values ($1, (select organization_id from users where id = $1), $2, $3)
     returning id`,
    [user.id, title, question],
  );
  await query(
    `insert into audit_log (actor_id, action, entity_type, entity_id) values ($1, 'investigation.create', 'investigation', $2)`,
    [user.id, rows[0].id],
  );
  return rows[0].id;
}

export async function addSource(user: SessionUser, investigationId: string, documentId: string): Promise<void> {
  if (!(await canSee(user, investigationId))) throw new Error("This desk is not open to you.");
  await query(
    `insert into investigation_sources (investigation_id, document_id, added_by)
     values ($1, $2, $3)
     on conflict do nothing`,
    [investigationId, documentId, user.id],
  );
  await touch(investigationId);
}

export async function addClaim(user: SessionUser, investigationId: string, statement: string): Promise<void> {
  if (!(await canSee(user, investigationId))) throw new Error("This desk is not open to you.");
  await query(
    `insert into claims (investigation_id, statement, created_by) values ($1, $2, $3)`,
    [investigationId, statement, user.id],
  );
  await touch(investigationId);
}

export async function addEvidence(
  user: SessionUser,
  investigationId: string,
  claimId: string,
  stance: string,
  note: string,
  documentId: string | null,
): Promise<void> {
  if (!(await canSee(user, investigationId))) throw new Error("This desk is not open to you.");
  const owned = await query("select 1 from claims where id = $1 and investigation_id = $2", [claimId, investigationId]);
  if (!owned.length) throw new Error("That claim is not on this desk.");
  await query(
    `insert into claim_evidence (claim_id, document_id, stance, note, created_by)
     values ($1, $2, $3, $4, $5)`,
    [claimId, documentId, stance, note, user.id],
  );
  await touch(investigationId);
}

export async function addNote(user: SessionUser, investigationId: string, body: string): Promise<void> {
  if (!(await canSee(user, investigationId))) throw new Error("This desk is not open to you.");
  await query(`insert into notes (investigation_id, author_id, body) values ($1, $2, $3)`, [
    investigationId,
    user.id,
    body,
  ]);
  await touch(investigationId);
}

export async function setStatus(user: SessionUser, investigationId: string, status: string): Promise<void> {
  if (!(await canSee(user, investigationId))) throw new Error("This desk is not open to you.");
  await query(`update investigations set status = $2 where id = $1`, [investigationId, status]);
  await touch(investigationId);
}

async function touch(id: string): Promise<void> {
  await query(`update investigations set updated_at = now() where id = $1`, [id]);
}
