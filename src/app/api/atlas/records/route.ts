import { NextResponse } from "next/server";
import { loadDistrict } from "@/lib/atlas-query";

function districtId(request: Request): string {
  return new URL(request.url).searchParams.get("district") ?? "";
}

export async function GET(request: Request) {
  const profile = await loadDistrict(districtId(request));
  if (!profile) return NextResponse.json({ error: "Name a district that is on the shelf." }, { status: 404 });
  return NextResponse.json({ district: profile.id, records: profile.records, assigned: profile.assigned });
}
