import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { actorOrganization, createSubscription, opsFailure } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin opens a subscription." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const home = await actorOrganization(user.id);
  const organizationId = user.role === "admin" && typeof body?.organizationId === "string" ? body.organizationId : home;
  if (!organizationId) return NextResponse.json({ error: "This account has no organization." }, { status: 422 });
  const seats = Number(body?.seats ?? 1);
  try {
    const id = await createSubscription(organizationId, String(body?.planId ?? ""), seats, Boolean(body?.trial));
    return NextResponse.json({ id, charged: false, provider: "manual" }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
