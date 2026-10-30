import { NextResponse } from "next/server";
import { searchDocuments } from "@/lib/queries";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pick = (key: string) => url.searchParams.get(key) ?? undefined;
  const result = await searchDocuments({
    q: pick("q"),
    phrase: pick("phrase"),
    any: pick("any"),
    exclude: pick("exclude"),
    place: pick("place"),
    category: pick("category"),
    type: pick("type"),
    author: pick("author"),
    from: pick("from"),
    to: pick("to"),
    dateField: pick("dateField"),
    comparative: pick("comparative"),
  });
  return NextResponse.json(result);
}
