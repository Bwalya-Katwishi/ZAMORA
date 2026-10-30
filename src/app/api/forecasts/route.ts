import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listForecasts, opsFailure, saveForecast } from "@/lib/ops";

export async function GET() {
  try {
    return NextResponse.json({ forecasts: await listForecasts() });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  const body = await request.json().catch(() => null);
  const indicatorCode = typeof body?.indicatorCode === "string" ? body.indicatorCode : undefined;
  const useCase = typeof body?.useCase === "string" ? body.useCase : undefined;
  try {
    const saved = await saveForecast({ indicatorCode, useCase }, user);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
