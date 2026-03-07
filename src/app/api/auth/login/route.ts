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

  const loginId = (body.loginId ?? "").trim();
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
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 503 });
  }

  const { data: user, error } = await db
    .from("site_users")
    .select("id, login_id, password_hash, management_number, status, name")
    .eq("login_id", loginId)
    .single();

  if (error || !user) {
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
  });

  const res = NextResponse.json({ success: true, user: { id: user.id, loginId: user.login_id, name: user.name } });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
