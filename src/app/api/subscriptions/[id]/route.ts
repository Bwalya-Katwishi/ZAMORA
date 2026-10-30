import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSubscription, opsFailure } from "@/lib/ops";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to read a subscription." }, { status: 401 });
  try {
    const { id } = await context.params;
    const subscription = await getSubscription(id);
    if (!subscription) return NextResponse.json({ error: "No subscription with that id." }, { status: 404 });
    return NextResponse.json({ ...subscription, charged: false });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
