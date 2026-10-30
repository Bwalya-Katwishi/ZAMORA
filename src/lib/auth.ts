import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { allows } from "@/lib/roles";
import type { SessionUser } from "@/lib/types";

export { allows };

const COOKIE = "zamora_session";
const MAX_AGE = 60 * 60 * 24 * 14;

function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return createHmac("sha256", secret).update(token).digest("hex");
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await query<{ id: string; email: string; name: string; role: SessionUser["role"] }>(
    `select u.id, u.email, u.name, u.role
     from sessions s
     join users u on u.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function startSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await query(
    `insert into sessions (user_id, token_hash, expires_at)
     values ($1, $2, now() + interval '14 days')`,
    [userId, hashToken(token)],
  );
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await query("delete from sessions where token_hash = $1", [hashToken(token)]);
  jar.delete(COOKIE);
}
