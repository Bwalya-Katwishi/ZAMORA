import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

const schema = z.object({
  id: z.string().regex(/^[a-z0-9-]{2,40}$/),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(8).max(600),
  parentId: z.string().regex(/^[a-z0-9-]{2,40}$/).optional(),
});

export async function GET() {
  const rows = await query("select id, name, parent_id, description, layout, position, active from categories order by position, name");
  return NextResponse.json({ categories: rows });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "editor")) return NextResponse.json({ error: "Editors only." }, { status: 403 });
  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("form") ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const parent = typeof raw?.parentId === "string" && raw.parentId.trim() ? raw.parentId.trim() : undefined;
  const parsed = schema.safeParse({ ...raw, parentId: parent });
  if (!parsed.success) {
    return NextResponse.json({ error: "Use a short id, a name, and a description." }, { status: 400 });
  }
  await query(
    `insert into categories (id, name, parent_id, description, layout, position)
     values ($1, $2, $3, $4, 'index', 50)`,
    [parsed.data.id, parsed.data.name, parsed.data.parentId ?? null, parsed.data.description],
  );
  await query(
    "insert into audit_log (actor_id, action, entity_type, entity_id) values ($1, 'taxonomy.create', 'category', $2)",
    [user.id, parsed.data.id],
  );
  if (contentType.includes("form")) return NextResponse.redirect(new URL("/admin/taxonomy", request.url), 303);
  return NextResponse.json({ id: parsed.data.id }, { status: 201 });
}
