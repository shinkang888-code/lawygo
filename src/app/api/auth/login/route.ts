/**
 * 로그인: 아이디 + 비밀번호 + 관리번호 검증, 승인 회원만 로그인 가능
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { verifyPassword } from "@/lib/authPassword";
import { createSessionCookie } from "@/lib/authSession";

export async function POST(request: NextRequest) {
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
    const hint = !url && !key
      ? " .env.local에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 넣은 뒤 개발 서버를 재시작하세요."
      : !url
        ? " NEXT_PUBLIC_SUPABASE_URL을 확인하고 서버를 재시작하세요."
        : !key
          ? " SUPABASE_SERVICE_ROLE_KEY를 확인하고 서버를 재시작하세요."
          : " 서버를 재시작한 뒤 다시 시도하세요.";
    return NextResponse.json(
      {
        error: "DB가 연결되지 않았습니다." + hint,
        code: "DB_NOT_CONFIGURED",
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
