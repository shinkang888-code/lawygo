/**
 * 회원 정보 수정 (아이디, 이름, 권한/직급, 관리번호) - 로그인한 사용자면 누구나 가능
 * PATCH body: { id?: string, loginId?: string, name?: string, role?: string, managementNumber?: string }
 * loginId: 조회용이 아니라 변경할 새 아이디. 변경 시 site_users·staff 둘 다 반영.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";

const ROLE_OPTIONS = ["관리자", "임원", "변호사", "사무장", "국장", "직원", "사무원", "인턴"] as const;

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { id?: string; loginId?: string; name?: string; role?: string; managementNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const lookupByLoginId = (body.loginId ?? "").trim().toLowerCase();
  if (!id && !lookupByLoginId) {
    return NextResponse.json({ error: "id 또는 loginId를 입력하세요." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB 연결을 사용할 수 없습니다." }, { status: 503 });
  }

  let query = db.from("site_users").select("id, login_id, name, role, management_number");
  if (id) query = query.eq("id", id);
  else query = query.eq("login_id", lookupByLoginId);
  const { data: user, error: findError } = await query.single();

  if (findError || !user) {
    return NextResponse.json({ error: "해당 회원을 찾을 수 없습니다." }, { status: 404 });
  }

  const newLoginId = (body.loginId ?? "").trim().toLowerCase();
  if (newLoginId && newLoginId.length < 2) {
    return NextResponse.json({ error: "아이디는 2자 이상이어야 합니다." }, { status: 400 });
  }
  if (newLoginId && newLoginId !== (user.login_id ?? "")) {
    const { data: existing } = await db.from("site_users").select("id").eq("login_id", newLoginId).maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "이미 사용 중인 아이디입니다." }, { status: 409 });
    }
  }

  const updates: { login_id?: string; name?: string | null; role?: string | null; management_number?: string } = {};
  if (newLoginId && newLoginId !== (user.login_id ?? "")) {
    updates.login_id = newLoginId;
  }
  if (body.name !== undefined) {
    updates.name = (body.name ?? "").trim() || null;
  }
  if (body.role !== undefined) {
    const role = (body.role ?? "").trim();
    updates.role = ROLE_OPTIONS.includes(role as (typeof ROLE_OPTIONS)[number]) ? role : null;
  }
  if (body.managementNumber !== undefined) {
    const v = (body.managementNumber ?? "").trim();
    updates.management_number = v || (user.management_number ?? "00000");
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ success: true, message: "변경 사항이 없습니다." });
  }

  const { error: updateError } = await db.from("site_users").update(updates).eq("id", user.id);

  if (updateError) {
    console.error("admin members update:", updateError);
    return NextResponse.json({ error: "저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    user: {
      id: user.id,
      loginId: updates.login_id ?? user.login_id,
      name: updates.name ?? user.name,
      role: updates.role ?? user.role,
    },
  });
}
