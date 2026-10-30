import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { opsFailure, setSeats } from "@/lib/ops";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin sets seats." }, { status: 403 });
  const body = await request.json().catch(() => null);
  try {
    const { id } = await context.params;
    await setSeats(id, Number(body?.seats));
    return NextResponse.json({ id, seats: Number(body?.seats) });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
