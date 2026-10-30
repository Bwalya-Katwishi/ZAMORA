import { NextResponse } from "next/server";
import { z } from "zod";
import { allows, getSessionUser } from "@/lib/auth";
import { createInvestigation, listInvestigations } from "@/lib/desk";

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  question: z.string().trim().min(8).max(800),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  return NextResponse.json({ investigations: await listInvestigations(user) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Give the desk a title and a question." }, { status: 400 });
  const id = await createInvestigation(user, parsed.data.title, parsed.data.question);
  return NextResponse.json({ id }, { status: 201 });
}
