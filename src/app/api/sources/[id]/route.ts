import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canManageSource } from "@/lib/governance";
import { opsFailure, patchSource } from "@/lib/ops";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !canManageSource(user.role)) return NextResponse.json({ error: "Editors edit a source." }, { status: 403 });
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  try {
    await patchSource(
      id,
      {
        licenseState: typeof body?.licenseState === "string" ? body.licenseState : undefined,
        reviewOn: typeof body?.reviewOn === "string" ? body.reviewOn : undefined,
        notes: typeof body?.notes === "string" ? body.notes : undefined,
      },
      user,
    );
    return NextResponse.json({ id });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
