import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canReadAudit } from "@/lib/governance";
import { listAudit, opsFailure } from "@/lib/ops";

export async function GET() {
  const user = await getSessionUser();
  if (!user || !canReadAudit(user.role)) return NextResponse.json({ error: "Administrators read the audit log." }, { status: 403 });
  try {
    return NextResponse.json({ audit: await listAudit() });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
