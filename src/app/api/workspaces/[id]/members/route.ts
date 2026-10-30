import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { addWorkspaceMember, opsFailure } from "@/lib/ops";
import { isRole } from "@/lib/workspace";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin adds a member." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const role = typeof body?.role === "string" && isRole(body.role) ? body.role : null;
  if (!role || typeof body?.userId !== "string") return NextResponse.json({ error: "Name a user and a role." }, { status: 422 });
  try {
    await addWorkspaceMember(id, body.userId, role);
    return NextResponse.json({ id });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
