import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { cancelSubscription, opsFailure } from "@/lib/ops";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "org_admin")) return NextResponse.json({ error: "An organization admin cancels." }, { status: 403 });
  try {
    const { id } = await context.params;
    await cancelSubscription(id);
    return NextResponse.json({ id, status: "cancelled", charged: false });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
