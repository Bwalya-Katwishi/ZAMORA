import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { createApiKey, opsFailure } from "@/lib/ops";

const SCOPES = ["catalogue", "search", "desk"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin issues a key." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const scopes = Array.isArray(body?.scopes) ? body.scopes.filter((scope: unknown) => typeof scope === "string" && SCOPES.includes(scope)) : ["catalogue"];
  try {
    const issued = await createApiKey(user, String(body?.name ?? "desk"), scopes);
    return NextResponse.json({ id: issued.id, token: issued.token, scopes }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
