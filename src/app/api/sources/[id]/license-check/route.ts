import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageSource } from "@/lib/governance";
import { markLicenseCheck, opsFailure } from "@/lib/ops";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !canManageSource(user.role)) return NextResponse.json({ error: "Editors check a license." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const today = new Date().toISOString().slice(0, 10);
  const reviewOn = typeof body?.reviewOn === "string" ? body.reviewOn : today;
  try {
    await markLicenseCheck(id, today, reviewOn, user);
    return NextResponse.json({ id, lastChecked: today, reviewOn });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
