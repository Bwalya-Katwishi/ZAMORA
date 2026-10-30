import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createOrganization, opsFailure } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "Administrators open an organization." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const id = await createOrganization(String(body?.name ?? ""), String(body?.kind ?? ""), user);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
