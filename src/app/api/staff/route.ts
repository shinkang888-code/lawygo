/**
 * 직원 목록 조회 (GET) / 직원 제외 (DELETE)
 *
 * 핵심 설계 변경: staff 테이블 sync를 완전히 제거하고,
 * site_users(approved) 를 직접 읽어 직원 목록으로 반환.
 * → "회원 관리에서 승인된 회원 = 직원"을 별도 sync 없이 항상 일치시킴.
 *
 * DELETE: body { id: string } — site_users의 해당 login_id를 제외 목록에 추가해 직원 뷰에서 숨김.
 *         (회원 계정은 삭제되지 않음. 회원 관리에서 다시 가져오기 가능)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";
import { getAppSetting } from "@/lib/appSettingsServer";

function roleToLevel(role: string | null): number {
  if (!role) return 1;
  if (role === "임원") return 5;
  if (role === "변호사") return 3;
  if (role === "사무장" || role === "국장") return 2;
  if (role === "인턴") return 0;
  return 1;
}

const ALLOWED_ROLES = ["관리자", "임원", "변호사", "사무장", "국장", "직원", "사무원", "인턴"] as const;
const EXCLUDED_KEY = "staff_excluded_login_ids";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: "로그인이 필요합니다.", staff: [], count: 0 },
      { status: 401 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json(
      {
        staff: [],
        count: 0,
        error: "서버 DB 연결 오류. SUPABASE_SERVICE_ROLE_KEY와 NEXT_PUBLIC_SUPABASE_URL 환경 변수를 확인하세요.",
      },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  try {
    const rawExcluded = await getAppSetting<unknown>(EXCLUDED_KEY);
    const excludedArr = Array.isArray(rawExcluded) ? (rawExcluded as string[]) : [];
    const excludedSet = new Set(excludedArr);

    // site_users(approved) 직접 조회 — staff 테이블 불필요
    const { data, error } = await db
      .from("site_users")
      .select("id, login_id, name, role, management_number, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("staff GET site_users:", error.message);
      return NextResponse.json(
        { staff: [], count: 0, error: `회원 목록 조회 실패: ${error.message}` },
        { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
      );
    }

    const rows = (data ?? []).filter(
      (u: { login_id: string }) => !excludedSet.has(u.login_id)
    );

    const staff = rows.map((u: { id: string; login_id: string; name: string | null; role: string | null; management_number?: string | null }) => ({
      id: String(u.id),
      name: (u.name && u.name.trim()) || u.login_id,
      role: (u.role && ALLOWED_ROLES.includes(u.role as (typeof ALLOWED_ROLES)[number]))
        ? u.role
        : ("직원" as const),
      department: "",
      email: "",
      phone: "",
      level: roleToLevel(u.role),
      loginId: u.login_id,
      managementNumber: u.management_number ?? undefined,
    }));

    return NextResponse.json(
      { staff, count: staff.length },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "직원 목록 조회 중 알 수 없는 오류";
    console.error("staff GET:", message);
    return NextResponse.json(
      { staff: [], count: 0, error: message },
      { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}

/**
 * 직원 제외 처리.
 * site_users 레코드는 유지하고, login_id를 제외 목록에 추가해 직원 뷰에서만 숨김.
 * body: { id: string }  — site_users.id 전달
 */
export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: { id?: string };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const id = (body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "직원 id를 지정하세요." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "서버 설정 오류" }, { status: 503 });

  try {
    // site_users에서 login_id 조회
    const { data: user, error: findErr } = await db
      .from("site_users")
      .select("id, login_id")
      .eq("id", id)
      .single();

    if (findErr || !user) {
      return NextResponse.json({ error: "해당 회원을 찾을 수 없습니다." }, { status: 404 });
    }

    const loginId = (user.login_id as string | null) ?? "";
    if (!loginId.trim()) {
      return NextResponse.json({ error: "login_id가 없는 회원입니다." }, { status: 400 });
    }

    // 제외 목록에 추가
    const rawExcluded = await getAppSetting<unknown>(EXCLUDED_KEY);
    const excludedArr = Array.isArray(rawExcluded) ? (rawExcluded as string[]) : [];
    const next = [...excludedArr.filter((x) => x !== loginId), loginId];
    await db.from("app_settings").upsert({ key: EXCLUDED_KEY, value: next }, { onConflict: "key" });

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "직원 제외 처리 중 오류";
    console.error("staff DELETE:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
