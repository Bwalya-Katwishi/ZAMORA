import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { gate } from "@/lib/billing";
import { createAlert, currentPlan, opsFailure } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers set an alert." }, { status: 401 });
  let plan = "public";
  try {
    plan = user.role === "admin" ? "newsroom" : await currentPlan(user.id, new Date().toISOString().slice(0, 10));
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  const opened = gate(plan, "alert");
  if (!opened.allowed) return NextResponse.json({ error: opened.prompt, plan }, { status: 402 });
  const body = await request.json().catch(() => null);
  try {
    const id = await createAlert(user, String(body?.searchId ?? ""), String(body?.cadence ?? ""));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
