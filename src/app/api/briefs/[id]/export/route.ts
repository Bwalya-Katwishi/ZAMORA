import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { BriefError, briefFailure, exportBrief } from "@/lib/foresight-store";

function textOf(value: FormDataEntryValue | unknown): string {
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const user = await getSessionUser();
  const form = (request.headers.get("content-type") ?? "").includes("form");
  if (!user) {
    if (form) return NextResponse.redirect(new URL("/login", request.url), 303);
    return NextResponse.json({ error: "Sign in to export." }, { status: 401 });
  }
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  const format = textOf(raw?.format);
  if (format !== "markdown" && format !== "pdf" && format !== "docx" && format !== "csv") {
    return NextResponse.json({ error: "Choose markdown, pdf, docx, or csv." }, { status: 400 });
  }
  try {
    const file = await exportBrief(id, user, format);
    return new NextResponse(new Uint8Array(file.body), {
      status: 200,
      headers: {
        "content-type": file.type,
        "content-disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error) {
    const message = briefFailure(error);
    const status = error instanceof BriefError ? error.status : 500;
    if (form) {
      const url = new URL(`/desk/briefs/${id}`, request.url);
      url.searchParams.set("export", "blocked");
      url.searchParams.set("error", message);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
