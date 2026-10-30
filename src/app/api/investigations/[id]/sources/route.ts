import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { addSource } from "@/lib/desk";

const schema = z.object({ documentId: z.string().trim().min(2).max(80) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Name a document." }, { status: 400 });
  const { id } = await context.params;
  try {
    await addSource(user, id, parsed.data.documentId);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Not saved." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
