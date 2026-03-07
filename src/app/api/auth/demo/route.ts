/**
 * 데모 로그인: 관리자 계정으로 세션만 발급 (비밀번호 없이)
 * DEMO 버튼용. upsert로 데모 계정을 보장한 뒤 로그인.
 * ENABLE_DEMO_LOGIN=false 로 비활성화 가능.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { createSessionCookie } from "@/lib/authSession";
import { hashPassword } from "@/lib/authPassword";

const DEMO_LOGIN_ID = process.env.DEMO_LOGIN_ID ?? "shinkang";
const DEMO_PASSWORD = process.env.DEMO_INITIAL_PASSWORD ?? "Admin1234!";
const DEMO_MANAGEMENT_NUMBER = process.env.DEMO_MANAGEMENT_NUMBER ?? "00000";
const DEMO_NAME = process.env.DEMO_NAME ?? "관리자";

export async function POST() {
  if (process.env.ENABLE_DEMO_LOGIN === "false") {
    return NextResponse.json({ error: "데모 로그인이 비활성화되어 있습니다." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      { error: "DB가 연결되지 않았습니다. Vercel 환경 변수를 확인해 주세요." },
      { status: 503 }
    );
  }

  const password_hash = hashPassword(DEMO_PASSWORD);
  const { error: upsertError } = await db
    .from("site_users")
    .upsert(
      {
        login_id: DEMO_LOGIN_ID,
        password_hash,
        management_number: DEMO_MANAGEMENT_NUMBER,
        name: DEMO_NAME,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: "demo",
      },
      { onConflict: "login_id" }
    );

  if (upsertError) {
    return NextResponse.json(
      {
        error:
          "데모 계정을 준비하지 못했습니다. Supabase에 site_users 테이블이 있고, 마이그레이션이 적용되었는지 확인해 주세요.",
      },
      { status: 500 }
    );
  }

  const { data: user, error: selectError } = await db
    .from("site_users")
    .select("id, login_id, name")
    .eq("login_id", DEMO_LOGIN_ID)
    .single();

  if (selectError || !user) {
    return NextResponse.json(
      { error: "데모 계정 조회에 실패했습니다." },
      { status: 500 }
    );
  }

  const cookie = createSessionCookie({
    userId: user.id,
    loginId: user.login_id,
    name: user.name ?? user.login_id,
    role: undefined,
  });

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, loginId: user.login_id, name: user.name },
  });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
