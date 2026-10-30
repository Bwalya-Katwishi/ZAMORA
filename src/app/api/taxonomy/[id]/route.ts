import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { query } from "@/lib/db";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().min(8).max(600),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "editor")) return NextResponse.json({ error: "Editors only." }, { status: 403 });
  const contentType = request.headers.get("content-type") ?? "";
  const raw = contentType.includes("form") ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Name and description are required." }, { status: 400 });
  const { id } = await context.params;
  await query("update categories set name = $2, description = $3 where id = $1", [id, parsed.data.name, parsed.data.description]);
  await query(
    "insert into audit_log (actor_id, action, entity_type, entity_id, detail) values ($1, 'taxonomy.update', 'category', $2, $3::jsonb)",
    [user.id, id, JSON.stringify({ name: parsed.data.name })],
  );
  if (contentType.includes("form")) return NextResponse.redirect(new URL("/admin/taxonomy", request.url), 303);
  return NextResponse.json({ ok: true });
}
