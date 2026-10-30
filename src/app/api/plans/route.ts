import { NextResponse } from "next/server";
import { FX_NOTE, plans } from "@/lib/billing";

export async function GET() {
  return NextResponse.json({
    fxZmwPerUsd: 27,
    note: FX_NOTE,
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      audience: plan.audience,
      priceZmw: plan.priceZmw,
      usdAt27: plan.usdAt27,
      seatCap: plan.seatCap,
      note: plan.note,
      planning: true,
    })),
  });
}
