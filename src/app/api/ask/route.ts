import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { runAsk, type AskRequest } from "@/lib/ask-query";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AskRequest | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a question." }, { status: 400 });
  const user = await getSessionUser();
  try {
    const result = await runAsk(
      {
        question: typeof body.question === "string" ? body.question : "",
        placeId: typeof body.placeId === "string" ? body.placeId : undefined,
        sectorIds: Array.isArray(body.sectorIds) ? body.sectorIds.map(String) : [],
        from: body.from,
        to: body.to,
        sourceKind: typeof body.sourceKind === "string" ? body.sourceKind : undefined,
      },
      user ? { id: user.id, role: user.role } : null,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "The shelf could not answer just now." }, { status: 500 });
  }
}
