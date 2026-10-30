import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { getPool } from "@/lib/db";
import { parseTagOverride, type TagKind } from "@/lib/tags";

const tables: Record<TagKind, { table: string; link: string; column: string }> = {
  place: { table: "places", link: "document_places", column: "place_id" },
  sector: { table: "categories", link: "document_categories", column: "category_id" },
  entity: { table: "people", link: "document_people", column: "person_id" },
};

function back(request: Request, id: string, code: string) {
  const url = new URL(`/documents/${id}`, request.url);
  url.searchParams.set("tag", code);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  const { id } = await context.params;
  const contentType = request.headers.get("content-type") ?? "";
  const form = contentType.includes("form");
  if (!user || !allows(user.role, "editor")) {
    return form ? back(request, id, "editors") : NextResponse.json({ error: "Editors only." }, { status: 403 });
  }
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const parsed = parseTagOverride({
    kind: typeof raw?.kind === "string" ? raw.kind : "",
    action: typeof raw?.action === "string" ? raw.action : "",
    targetId: typeof raw?.targetId === "string" ? raw.targetId : "",
    note: typeof raw?.note === "string" ? raw.note : "",
  });
  if (!parsed.ok) return form ? back(request, id, "note") : NextResponse.json({ error: parsed.error }, { status: 400 });

  const client = await getPool().connect();
  try {
    await client.query("begin");
    const document = await client.query("select id from documents where id = $1", [id]);
    if (!document.rowCount) {
      await client.query("rollback");
      return form ? back(request, id, "missing") : NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
    const spec = tables[parsed.kind];
    const found = await client.query<{ id: string }>(
      `select id from ${spec.table} where id = $1 or lower(name) = lower($1) order by (id = $1) desc limit 1`,
      [parsed.targetId],
    );
    const targetId = found.rows[0]?.id;
    if (!targetId) {
      await client.query("rollback");
      return form ? back(request, id, "target") : NextResponse.json({ error: "That tag is not on the shelf." }, { status: 400 });
    }
    const linked = await client.query(
      `select 1 from ${spec.link} where document_id = $1 and ${spec.column} = $2`,
      [id, targetId],
    );
    const existing = await client.query<{ action: "add" | "remove" }>(
      "select action from tag_overrides where document_id = $1 and kind = $2 and target_id = $3",
      [id, parsed.kind, targetId],
    );
    const onCatalog = (linked.rowCount ?? 0) > 0;
    const prior = existing.rows[0]?.action;
    let code = "saved";

    if (parsed.action === "withdraw" || (parsed.action === "remove" && prior === "add" && !onCatalog) || (parsed.action === "add" && prior === "remove")) {
      if (!prior) {
        await client.query("rollback");
        return form ? back(request, id, "missing") : NextResponse.json({ error: "No editor mark to withdraw." }, { status: 400 });
      }
      await client.query("delete from tag_overrides where document_id = $1 and kind = $2 and target_id = $3", [id, parsed.kind, targetId]);
      code = "withdrawn";
    } else if (parsed.action === "add") {
      if (onCatalog) {
        await client.query("rollback");
        return form ? back(request, id, "already") : NextResponse.json({ error: "That tag is already on the catalog record." }, { status: 400 });
      }
      await client.query(
        `insert into tag_overrides (document_id, kind, action, target_id, note, author_id)
         values ($1, $2, 'add', $3, $4, $5)
         on conflict (document_id, kind, target_id)
         do update set action = 'add', note = excluded.note, author_id = excluded.author_id, created_at = now()`,
        [id, parsed.kind, targetId, parsed.note, user.id],
      );
    } else if (onCatalog) {
      await client.query(
        `insert into tag_overrides (document_id, kind, action, target_id, note, author_id)
         values ($1, $2, 'remove', $3, $4, $5)
         on conflict (document_id, kind, target_id)
         do update set action = 'remove', note = excluded.note, author_id = excluded.author_id, created_at = now()`,
        [id, parsed.kind, targetId, parsed.note, user.id],
      );
    } else {
      await client.query("rollback");
      return form ? back(request, id, "missing") : NextResponse.json({ error: "That tag is not on this record." }, { status: 400 });
    }

    await client.query(
      "insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'tag.override', 'document', $2, $3::jsonb)",
      [user.id, id, JSON.stringify({ kind: parsed.kind, action: parsed.action, targetId, result: code })],
    );
    await client.query("commit");
    return form ? back(request, id, code) : NextResponse.json({ ok: true, result: code });
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
