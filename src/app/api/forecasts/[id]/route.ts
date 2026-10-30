import { NextResponse } from "next/server";
import { getForecast, opsFailure } from "@/lib/ops";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const forecast = await getForecast(id);
    if (!forecast) return NextResponse.json({ error: "No forecast with that id." }, { status: 404 });
    return NextResponse.json(forecast);
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
