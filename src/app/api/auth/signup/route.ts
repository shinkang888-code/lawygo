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
    return NextResponse.json(
      {
        error: "DB가 연결되지 않았습니다. .env.local(또는 Vercel 환경 변수)에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 설정하고, Supabase에 site_users 테이블을 생성한 뒤 서버를 재시작하세요.",
        code: "DB_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  const { data: existing, error: existingError } = await db
    .from("site_users")
    .select("id")
    .eq("login_id", loginId)
    .maybeSingle();

  if (existingError) {
    console.error("signup existing check:", existingError);
    const msg =
      process.env.NODE_ENV === "development"
        ? `DB 조회 오류: ${existingError.message}. site_users 테이블이 있는지 Supabase SQL Editor에서 확인하세요.`
        : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
  if (existing) {
    return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
  }

  const { count, error: countError } = await db.from("site_users").select("id", { count: "exact", head: true });
  if (countError) {
    console.error("signup count:", countError);
    const msg =
      process.env.NODE_ENV === "development"
        ? `DB 조회 오류: ${countError.message}. site_users 테이블을 생성했는지 확인하세요.`
        : "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
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
    const code = error.code ?? "";
    const hint =
      process.env.NODE_ENV === "development"
        ? ` (${code}: ${error.message})`
        : "";
    if (code === "42P01" || error.message?.includes("does not exist")) {
      return NextResponse.json(
        {
          error:
            "site_users 테이블이 없습니다. Supabase 대시보드 → SQL Editor에서 supabase/migrations/20260307200000_site_users.sql 내용을 실행한 뒤 다시 시도하세요." + hint,
        },
        { status: 503 }
      );
    }
    if (code === "23505") {
      return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "회원가입 처리에 실패했습니다." + hint },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: isFirstUser
      ? "첫 회원으로 가입되었습니다. 바로 로그인할 수 있습니다."
      : "회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
    user: { id: inserted.id, loginId: inserted.login_id, status: inserted.status },
  });
}
