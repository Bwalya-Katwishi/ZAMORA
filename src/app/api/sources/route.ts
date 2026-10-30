import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageSource, isLicenseState } from "@/lib/governance";
import { listSources, opsFailure, registerSource } from "@/lib/ops";

export async function GET() {
  try {
    return NextResponse.json({ sources: await listSources() });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !canManageSource(user.role)) return NextResponse.json({ error: "Editors register a source." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const licenseState = typeof body?.licenseState === "string" && isLicenseState(body.licenseState) ? body.licenseState : null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    await registerSource(
      {
        id: String(body?.id ?? ""),
        name: String(body?.name ?? ""),
        licenseState,
        reviewOn: typeof body?.reviewOn === "string" ? body.reviewOn : null,
        ingestion: "not_started",
        fullText: false,
        accessMethod: String(body?.accessMethod ?? "manual"),
        permitted: String(body?.permitted ?? ""),
        prohibited: String(body?.prohibited ?? "Do not crawl."),
        refresh: String(body?.refresh ?? "Recheck before use"),
        steward: user.name,
        ocrStatus: "not_applicable",
        notes: String(body?.notes ?? ""),
      },
      today,
    );
    return NextResponse.json({ id: body?.id }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
