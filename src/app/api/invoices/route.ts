import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { actorOrganization, listInvoices, opsFailure } from "@/lib/ops";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in to read invoices." }, { status: 401 });
  try {
    const org = user.role === "admin" ? null : await actorOrganization(user.id);
    const invoices = await listInvoices(org);
    return NextResponse.json({ invoices, charged: false, provider: "manual" });
  } catch (error) {
    const failure = opsFailure(error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
}
