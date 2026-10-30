import { NextResponse } from "next/server";
import { deskMethod } from "@/lib/desk-query";

export async function GET() {
  return NextResponse.json(deskMethod());
}
