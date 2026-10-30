import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { decideForecast, opsFailure } from "@/lib/ops";

async function decide(request: Request, id: string, decision: "approved" | "rejected") {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "editor")) return NextResponse.json({ error: "Editors decide a forecast." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const briefId = typeof body?.briefId === "string" ? body.briefId : null;
  try {
    await decideForecast(id, decision, briefId, user);
    return NextResponse.json({ id, status: decision });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return decide(request, id, "approved");
}
