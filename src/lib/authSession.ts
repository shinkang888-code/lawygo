/**
 * 서버 전용: 세션 쿠키 생성/검증
 */

import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE_NAME = "lawygo_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7일
const SECRET = process.env.SESSION_SECRET ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "lawygo-default-secret";

export interface SessionPayload {
  userId: string;
  loginId: string;
  name: string;
  role?: string;
}

function encode(data: SessionPayload): string {
  const json = JSON.stringify(data);
  const encoded = Buffer.from(json, "utf-8").toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function decode(token: string): SessionPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expected = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  if (sig.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, "utf-8"), Buffer.from(expected, "utf-8"))) return null;
  } catch {
    return null;
  }
  try {
    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export function createSessionCookie(payload: SessionPayload): string {
  const token = encode(payload);
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE}; ${process.env.NODE_ENV === "production" ? "Secure;" : ""}`;
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  if (!cookie) return null;
  return decode(cookie);
}

export async function deleteSession(): Promise<string> {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
