import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { opsFailure, usageSummary } from "@/lib/ops";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to read usage." }, { status: 401 });
  try {
    return NextResponse.json({ usage: await usageSummary(user) });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
