import { NextResponse } from "next/server";
import { runDeskQuery } from "@/lib/desk-query";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const result = await runDeskQuery({
    placeId: url.searchParams.get("place") ?? undefined,
    sectorIds: url.searchParams.getAll("sector"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    questionType: url.searchParams.get("question") ?? undefined,
    keywords: url.searchParams.get("q") ?? "",
    entityId: url.searchParams.get("entity") ?? undefined,
  });
  if (result.status !== 200 || !("gaps" in result.body)) return NextResponse.json(result.body, { status: result.status });
  return NextResponse.json({
    gaps: result.body.gaps,
    confidence: result.body.confidence,
    limitations: result.body.limitations,
    result_type: result.body.result_type,
  });
}
