import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { renderBrief } from "@/lib/brief";
import { getInvestigation } from "@/lib/desk";
import type { CitationStyle } from "@/lib/citations";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const { id } = await context.params;
  const detail = await getInvestigation(user, id);
  if (!detail) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const styleParam = new URL(request.url).searchParams.get("style");
  const style: CitationStyle = styleParam === "apa" || styleParam === "harvard" ? styleParam : "chicago";
  const body = renderBrief(detail, style);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="zamora-${id}.md"`,
    },
  });
}
