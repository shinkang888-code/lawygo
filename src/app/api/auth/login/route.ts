/**
 * 로그인: 아이디 + 비밀번호 + 관리번호 검증, 승인 회원만 로그인 가능
 * Rate limiting 적용 (브루트포스 방지)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { verifyPassword } from "@/lib/authPassword";
import { createSessionCookie } from "@/lib/authSession";
import { checkRateLimit, getClientIdentifier, LIMIT_AUTH_PER_MIN } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  const clientId = getClientIdentifier(request);
  if (!checkRateLimit(`auth:login:${clientId}`, LIMIT_AUTH_PER_MIN)) {
    return NextResponse.json(
      { error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let body: { loginId?: string; password?: string; managementNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const loginId = (body.loginId ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const managementNumber = (body.managementNumber ?? "").trim();

  if (!loginId || !password || !managementNumber) {
    return NextResponse.json(
      { error: "아이디, 비밀번호, 관리번호를 모두 입력하세요." },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const missing: string[] = [];
    if (!url?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!key) missing.push("SUPABASE_SERVICE_ROLE_KEY");
    const hint = missing.length
      ? `.env.local(로컬) 또는 Vercel 환경 변수(배포)에 ${missing.join(", ")}를 설정한 뒤 서버를 재시작/재배포하세요.`
      : "서버를 재시작한 뒤 다시 시도하세요.";
    return NextResponse.json(
      {
        error: "DB가 연결되지 않았습니다.",
        code: "DB_NOT_CONFIGURED",
        missing,
        hint,
      },
      { status: 503 }
    );
  }

  const { data: user, error } = await db
    .from("site_users")
    .select("id, login_id, password_hash, management_number, status, name, role")
    .eq("login_id", loginId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/login] DB error:", error.message);
    }
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (!user) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.management_number !== managementNumber) {
    return NextResponse.json({ error: "관리번호가 일치하지 않습니다." }, { status: 401 });
  }

  if (!verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "아이디 또는 비밀번호가 올바르지 않습니다." }, { status: 401 });
  }

  if (user.status !== "approved") {
    return NextResponse.json(
      { error: "승인 대기 중입니다. 관리자 승인 후 로그인할 수 있습니다." },
      { status: 403 }
    );
  }

  const cookie = createSessionCookie({
    userId: user.id,
    loginId: user.login_id,
    name: user.name ?? user.login_id,
    role: user.role ?? undefined,
  });

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, loginId: user.login_id, name: user.name, role: user.role },
  });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
