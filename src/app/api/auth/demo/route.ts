/**
 * 데모 로그인: 관리자 계정으로 세션만 발급 (비밀번호 없이)
 * DEMO 버튼용. ENABLE_DEMO_LOGIN=false 로 비활성화 가능.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { createSessionCookie } from "@/lib/authSession";

const DEMO_LOGIN_ID = process.env.DEMO_LOGIN_ID ?? "shinkang";

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

  const { data: user, error } = await db
    .from("site_users")
    .select("id, login_id, name, role")
    .eq("login_id", DEMO_LOGIN_ID)
    .eq("status", "approved")
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json(
      { error: "데모 계정을 찾을 수 없습니다. 관리자 계정을 먼저 생성해 주세요." },
      { status: 404 }
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
