import { NextResponse } from "next/server";
import { acceptWebhookEvent, opsFailure } from "@/lib/ops";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const result = await acceptWebhookEvent(String(body?.provider ?? "manual"), String(body?.id ?? ""));
    return NextResponse.json({ ...result, charged: false });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
