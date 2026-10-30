import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { addEvidence } from "@/lib/desk";

const schema = z.object({
  claimId: z.string().uuid(),
  stance: z.enum(["supports", "contradicts", "context"]),
  note: z.string().trim().max(500).optional().default(""),
  documentId: z.string().trim().min(2).max(80).nullable().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The evidence could not be read." }, { status: 400 });
  const { id } = await context.params;
  try {
    await addEvidence(user, id, parsed.data.claimId, parsed.data.stance, parsed.data.note, parsed.data.documentId ?? null);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Not saved." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
