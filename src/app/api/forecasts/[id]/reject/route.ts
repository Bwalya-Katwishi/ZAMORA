import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { decideForecast, opsFailure } from "@/lib/ops";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "editor")) return NextResponse.json({ error: "Editors decide a forecast." }, { status: 403 });
  const { id } = await context.params;
  try {
    await decideForecast(id, "rejected", null, user);
    return NextResponse.json({ id, status: "rejected" });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
