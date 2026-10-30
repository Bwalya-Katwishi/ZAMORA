import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { addClaim } from "@/lib/desk";

const schema = z.object({ statement: z.string().trim().min(8).max(600) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The claim needs a full sentence." }, { status: 400 });
  const { id } = await context.params;
  try {
    await addClaim(user, id, parsed.data.statement);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Not saved." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
