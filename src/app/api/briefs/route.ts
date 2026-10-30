import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { runDeskQuery } from "@/lib/desk-query";
import { parseQuestionType } from "@/lib/evidence";
import { draftFromPack } from "@/lib/foresight";
import { briefFailure, createBrief, listBriefs } from "@/lib/foresight-store";

function textOf(value: FormDataEntryValue | unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const briefs = await listBriefs(user);
  return NextResponse.json({ briefs });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const form = (request.headers.get("content-type") ?? "").includes("form");
  if (!user || !allows(user.role, "researcher")) {
    if (form) return NextResponse.redirect(new URL("/login", request.url), 303);
    return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  }
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const question = textOf(raw?.question).replace(/\s+/g, " ").trim();
  const placeId = textOf(raw?.placeId || raw?.place);
  const sector = textOf(raw?.sector);
  const questionType = parseQuestionType(textOf(raw?.questionType || raw?.question)) ?? parseQuestionType("historical");
  const fail = (error: string, status: number) => {
    if (!form) return NextResponse.json({ error }, { status });
    const url = new URL("/desk/briefs", request.url);
    url.searchParams.set("error", error);
    return NextResponse.redirect(url, 303);
  };
  if (question.length < 8) return fail("Ask a longer question.", 400);
  if (!placeId || !sector || !questionType) return fail("Name a place, a sector, and a question type.", 400);
  try {
    const result = await runDeskQuery({
      placeId,
      sectorIds: [sector],
      from: textOf(raw?.from),
      to: textOf(raw?.to),
      questionType,
      keywords: question,
    });
    if (!("records" in result.body)) return fail("error" in result.body ? result.body.error : "The shelf could not be read.", result.status);
    const id = await createBrief(user, draftFromPack(result.body, question));
    if (form) return NextResponse.redirect(new URL(`/desk/briefs/${id}`, request.url), 303);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return fail(briefFailure(error), 500);
  }
}
