import { NextResponse } from "next/server";
import { loadDistrict } from "@/lib/atlas-query";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const profile = await loadDistrict(id);
  if (!profile) return NextResponse.json({ error: "No district with that id." }, { status: 404 });
  return NextResponse.json(profile);
}
