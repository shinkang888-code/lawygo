/**
 * 회원가입: 아이디, 비밀번호, 관리번호 저장 → status = pending (관리자 승인 전 대기)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { hashPassword } from "@/lib/authPassword";

export async function POST(request: NextRequest) {
  let body: { loginId?: string; password?: string; managementNumber?: string; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const loginId = (body.loginId ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  const managementNumber = (body.managementNumber ?? "").trim();
  const name = (body.name ?? "").trim();

  if (!loginId || !password || !managementNumber) {
    return NextResponse.json(
      { error: "아이디, 비밀번호, 관리번호를 모두 입력하세요." },
      { status: 400 }
    );
  }

  if (loginId.length < 2) {
    return NextResponse.json({ error: "아이디는 2자 이상이어야 합니다." }, { status: 400 });
  }
  if (password.length < 4) {
    return NextResponse.json({ error: "비밀번호는 4자 이상이어야 합니다." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "서버 설정 오류입니다." }, { status: 503 });
  }

  const { data: existing } = await db.from("site_users").select("id").eq("login_id", loginId).single();
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const { count } = await db.from("site_users").select("id", { count: "exact", head: true });
  const isFirstUser = (count ?? 0) === 0;

  const password_hash = hashPassword(password);

  const { data: inserted, error } = await db
    .from("site_users")
    .insert({
      login_id: loginId,
      password_hash,
      management_number: managementNumber,
      status: isFirstUser ? "approved" : "pending",
      name: name || null,
    })
    .select("id, login_id, status, created_at")
    .single();

  if (error) {
    console.error("signup insert error:", error);
    return NextResponse.json({ error: "회원가입 처리에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    message: isFirstUser
      ? "첫 회원으로 가입되었습니다. 바로 로그인할 수 있습니다."
      : "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
    user: { id: inserted.id, loginId: inserted.login_id, status: inserted.status },
  });
}
