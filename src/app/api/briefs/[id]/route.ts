import { NextResponse } from "next/server";
import { allows, getSessionUser } from "@/lib/auth";
import { briefFailure, loadBrief, updateBrief } from "@/lib/foresight-store";

function textOf(value: FormDataEntryValue | unknown): string {
  return typeof value === "string" ? value : "";
}

async function actor(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const user = await getSessionUser();
  if (!user || !allows(user.role, "researcher")) return { user: null, id };
  return { user, id };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const gate = await actor(id);
  if (!gate?.user) return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  const brief = await loadBrief(gate.id, gate.user);
  if (!brief) return NextResponse.json({ error: "That brief is not on your desk." }, { status: 404 });
  return NextResponse.json(brief);
}

async function save(request: Request, id: string) {
  const user = await getSessionUser();
  const form = (request.headers.get("content-type") ?? "").includes("form");
  if (!user || !allows(user.role, "researcher")) {
    if (form) return NextResponse.redirect(new URL("/login", request.url), 303);
    return NextResponse.json({ error: "Researchers only." }, { status: 401 });
  }
  const raw = form ? Object.fromEntries(await request.formData()) : await request.json().catch(() => null);
  try {
    const brief = await updateBrief(id, user, {
      title: textOf(raw?.title),
      patterns: raw && "patterns" in raw ? textOf(raw.patterns) : undefined,
      signals: raw && "signals" in raw ? textOf(raw.signals) : undefined,
      parallels: raw && "parallels" in raw ? textOf(raw.parallels) : undefined,
      scenarios: raw && "scenarios" in raw ? textOf(raw.scenarios) : undefined,
      questions: raw && "questions" in raw ? textOf(raw.questions) : undefined,
    });
    if (form) return NextResponse.redirect(new URL(`/desk/briefs/${id}?saved=1`, request.url), 303);
    return NextResponse.json(brief);
  } catch (error) {
    const message = briefFailure(error);
    const status = error instanceof Error && "status" in error && typeof error.status === "number" ? error.status : 500;
    if (form) {
      const url = new URL(`/desk/briefs/${id}`, request.url);
      url.searchParams.set("error", message);
      return NextResponse.redirect(url, 303);
    }
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return save(request, id);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return save(request, id);
}
