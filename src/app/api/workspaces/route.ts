import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { actorOrganization, createWorkspace, opsFailure } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin opens a workspace." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const home = await actorOrganization(user.id);
  const organizationId = user.role === "admin" && typeof body?.organizationId === "string" ? body.organizationId : home;
  if (!organizationId) return NextResponse.json({ error: "This account has no organization." }, { status: 422 });
  try {
    const id = await createWorkspace(organizationId, String(body?.name ?? ""), body?.private !== false, user);
    return NextResponse.json({ id, private: body?.private !== false }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
