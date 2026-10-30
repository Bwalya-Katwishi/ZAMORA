import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { actorOrganization, inviteMember, opsFailure } from "@/lib/ops";
import { isRole } from "@/lib/workspace";
import { canInvite } from "@/lib/workspace";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to invite." }, { status: 401 });
  const { id } = await context.params;
  const home = await actorOrganization(user.id);
  if (user.role !== "admin" && home !== id) return NextResponse.json({ error: "That organization is not yours." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const role = typeof body?.role === "string" && isRole(body.role) ? body.role : null;
  if (!role || !canInvite(user.role, role)) return NextResponse.json({ error: "You cannot offer that role." }, { status: 403 });
  try {
    const invitation = await inviteMember(id, String(body?.email ?? ""), role, user);
    return NextResponse.json({ id: invitation }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
