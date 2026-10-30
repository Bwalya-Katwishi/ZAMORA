import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { BriefError, briefFailure, briefHistory } from "@/lib/foresight-store";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  try {
    const events = await briefHistory(id, user);
    return NextResponse.json({ events });
  } catch (error) {
    const status = error instanceof BriefError ? error.status : 500;
    return NextResponse.json({ error: briefFailure(error) }, { status });
  }
}
