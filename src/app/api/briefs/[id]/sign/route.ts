import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { BriefError, briefFailure, signBrief } from "@/lib/foresight-store";

function textOf(value: FormDataEntryValue | unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getSessionUser();
  const form = (request.headers.get("content-type") ?? "").includes("form");
  if (!user) {
    if (form) return NextResponse.redirect(new URL("/login", request.url), 303);
    return NextResponse.json({ error: "Sign in to sign." }, { status: 401 });
  }
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  try {
    const brief = await signBrief(id, user, textOf(raw?.signature));
    if (form) return NextResponse.redirect(new URL(`/desk/briefs/${id}?signed=1`, request.url), 303);
    return NextResponse.json(brief);
  } catch (error) {
    const message = briefFailure(error);
    const status = error instanceof BriefError ? error.status : 500;
    if (form) {
      const url = new URL(`/desk/briefs/${id}`, request.url);
      url.searchParams.set("error", message);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
