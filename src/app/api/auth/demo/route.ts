/**
 * 데모 로그인: 관리자 계정으로 세션만 발급 (비밀번호 없이)
 * DEMO 버튼용. 계정이 없으면 자동 생성 후 로그인.
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
      { error: "DB가 연결되지 않았습니다." },
      { status: 503 }
    );
  }

  let { data: user, error } = await db
    .from("site_users")
    .select("id, login_id, name")
    .eq("login_id", DEMO_LOGIN_ID)
    .eq("status", "approved")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "데모 계정 조회 중 오류가 발생했습니다. Supabase에 site_users 테이블이 있는지 확인해 주세요." },
      { status: 500 }
    );
  }

  if (!user) {
    const password_hash = hashPassword(DEMO_PASSWORD);
    const { data: inserted, error: insertError } = await db
      .from("site_users")
      .insert({
        login_id: DEMO_LOGIN_ID,
        password_hash,
        management_number: DEMO_MANAGEMENT_NUMBER,
        name: DEMO_NAME,
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: "demo",
      })
      .select("id, login_id, name")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: updated } = await db
          .from("site_users")
          .update({
            status: "approved",
            approved_at: new Date().toISOString(),
            approved_by: "demo",
          })
          .eq("login_id", DEMO_LOGIN_ID)
          .select("id, login_id, name")
          .maybeSingle();
        if (updated) user = updated;
      }
      if (!user) {
        return NextResponse.json(
          { error: "데모 계정 생성에 실패했습니다. DB 마이그레이션을 확인해 주세요." },
          { status: 500 }
        );
      }
    } else {
      user = inserted;
    }
  }

  const cookie = createSessionCookie({
    userId: user.id,
    loginId: user.login_id,
    name: user.name ?? user.login_id,
    role: (user as { role?: string }).role ?? undefined,
  });

  const res = NextResponse.json({
    success: true,
    user: { id: user.id, loginId: user.login_id, name: user.name },
  });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
