import { NextResponse } from "next/server";
import { runDeskQuery, type DeskRequest } from "@/lib/desk-query";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as DeskRequest | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Send a desk query." }, { status: 400 });
  const result = await runDeskQuery({
    placeId: body.placeId,
    sectorIds: Array.isArray(body.sectorIds) ? body.sectorIds.map(String) : [],
    from: body.from,
    to: body.to,
    questionType: body.questionType,
    keywords: typeof body.keywords === "string" ? body.keywords : "",
    entityId: body.entityId,
  });
  return NextResponse.json(result.body, { status: result.status });
}
