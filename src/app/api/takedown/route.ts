import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageSource } from "@/lib/governance";
import { opsFailure, takeDown } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageSource(user.role)) return NextResponse.json({ error: "Editors record a takedown." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    await takeDown(String(body?.sourceId ?? ""), String(body?.reason ?? ""), user);
    return NextResponse.json({ blocked: true });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
