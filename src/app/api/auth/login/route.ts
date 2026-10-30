import { NextResponse } from "next/server";
import { z } from "zod";
import { startSession } from "@/lib/auth";
import { query } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}`, 8, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many attempts. Wait and try again." }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a desk address and a password." }, { status: 400 });
  const rows = await query<{ id: string; password_hash: string }>(
    "select id, password_hash from users where lower(email) = lower($1)",
    [parsed.data.email],
  );
  const user = rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return NextResponse.json({ error: "That slip does not match an account." }, { status: 401 });
  }
  await startSession(user.id);
  await query(
    "insert into audit_log (actor_id, action, entity_type, entity_id) values ($1, 'auth.login', 'user', $2)",
    [user.id, user.id],
  );
  return NextResponse.json({ ok: true });
}
