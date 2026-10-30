import { NextResponse } from "next/server";
import { loadDistrict } from "@/lib/atlas-query";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("district") ?? "";
  const profile = await loadDistrict(id);
  if (!profile) return NextResponse.json({ error: "Name a district that is on the shelf." }, { status: 404 });
  return NextResponse.json({
    district: profile.id,
    gaps: profile.gaps,
    uncertainty: profile.uncertainty,
    assigned: profile.assigned,
  });
}
