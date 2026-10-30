import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query<{ documents: number }>("select count(*)::int as documents from documents");
    return NextResponse.json({ ok: true, documents: rows[0]?.documents ?? 0 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
