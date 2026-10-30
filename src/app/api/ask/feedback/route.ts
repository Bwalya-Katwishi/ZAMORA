import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { recordFeedback } from "@/lib/ask-query";
import { parseVerdict } from "@/lib/retrieve";

function textOf(value: FormDataEntryValue | unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const contentType = request.headers.get("content-type") ?? "";
  const form = contentType.includes("form");
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const askId = textOf(raw?.askId);
  const verdict = parseVerdict(textOf(raw?.verdict));
  const note = textOf(raw?.note).trim().slice(0, 400);
  if (!user) {
    if (form) return NextResponse.redirect(new URL("/login", request.url), 303);
    return NextResponse.json({ error: "Sign in to record a review." }, { status: 401 });
  }
  if (!askId || !verdict) {
    return form
      ? NextResponse.redirect(new URL("/desk", request.url), 303)
      : NextResponse.json({ error: "A stored question and a review are required." }, { status: 400 });
  }
  try {
    const result = await recordFeedback(askId, { id: user.id, role: user.role }, verdict, note);
    if (form) {
      const url = new URL("/desk", request.url);
      url.searchParams.set("asked", askId);
      url.searchParams.set("review", result.status === 200 ? verdict : "missing");
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json({ error: "The review was not stored." }, { status: 500 });
  }
}
