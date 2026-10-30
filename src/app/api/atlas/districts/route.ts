import { NextResponse } from "next/server";
import { listDistrictCards } from "@/lib/atlas-query";

export async function GET() {
  const districts = listDistrictCards();
  return NextResponse.json({
    districts,
    drawn: false,
    unassigned: districts.filter((district) => !district.assigned).length,
  });
}
