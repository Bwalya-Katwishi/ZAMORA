import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { loadAsk } from "@/lib/ask-query";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getSessionUser();
  const answer = await loadAsk(id, user?.id ?? null);
  if (!answer) return NextResponse.json({ error: "Those citations are not on your shelf." }, { status: 404 });
  return NextResponse.json({
    id: answer.id,
    model_version: answer.model_version,
    result_type: answer.result_type,
    citations: answer.citations,
    chunk_ids: answer.chunk_ids,
  });
}
