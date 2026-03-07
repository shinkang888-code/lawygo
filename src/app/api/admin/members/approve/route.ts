/**
 * 회원 일괄 승인 (관리자)
 * body: { ids?: string[], loginIds?: string[] } - id(uuid) 또는 login_id로 지정
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { ids?: string[]; loginIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const ids = body.ids ?? [];
  const loginIds = (body.loginIds ?? []).map((s: string) => String(s).trim()).filter(Boolean);

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "서버 설정 오류" }, { status: 503 });

  let targetIds = [...ids];

  if (loginIds.length > 0) {
    const { data: rows } = await db.from("site_users").select("id").in("login_id", loginIds);
    targetIds = [...targetIds, ...(rows ?? []).map((r) => r.id)];
  }

  targetIds = [...new Set(targetIds)];
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "승인할 회원을 선택하거나 아이디를 입력하세요." }, { status: 400 });
  }

  const { error: updateError } = await db
    .from("site_users")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: session.loginId,
    })
    .in("id", targetIds);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ success: true, count: targetIds.length });
}
