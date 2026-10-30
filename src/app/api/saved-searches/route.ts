import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { opsFailure, saveSearch } from "@/lib/ops";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers save a search." }, { status: 401 });
  const body = await request.json().catch(() => null);
  try {
    const id = await saveSearch(user, String(body?.name ?? ""), body?.query ?? {});
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
