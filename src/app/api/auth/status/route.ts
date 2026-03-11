/**
 * 로그인 전 DB 연결 상태 확인 (환경 변수 누락 여부만 반환, 값 노출 없음)
 * GET /api/auth/status
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function GET() {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const db = getSupabaseAdmin();

  if (db) {
    return NextResponse.json({ ok: true, connected: true });
  }

  const missing: string[] = [];
  if (!hasUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!hasKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  const hint =
    missing.length > 0
      ? `다음 환경 변수를 설정하세요: ${missing.join(", ")}. 로컬은 .env.local, Vercel은 프로젝트 설정 → Environment Variables에서 추가 후 재시작/재배포하세요.`
      : "환경 변수는 설정되어 있으나 DB 연결에 실패했습니다. URL·키 형식을 확인하세요.";

  return NextResponse.json({
    ok: false,
    connected: false,
    missing,
    hint,
  });
}
