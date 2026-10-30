import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listAsks } from "@/lib/ask-query";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ signed_in: false, asks: [] });
  const asks = await listAsks(user.id);
  return NextResponse.json({ signed_in: true, asks });
}
