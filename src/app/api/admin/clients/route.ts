/**
 * 고객(의뢰인) 목록 조회
 * GET /api/admin/clients
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";

function getDb() {
  return getSupabaseAdmin();
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }

  const { data, error } = await db
    .from("clients")
    .select("id, name, position, contact_phone, contact_email, memo, address, guest_code, created_at, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const list = (data ?? []).map((r: Record<string, unknown>) => ({
    id: r.id,
    name: r.name,
    phone: r.contact_phone ?? undefined,
    mobile: r.contact_phone ?? undefined,
    email: r.contact_email ?? undefined,
    address: r.address ?? undefined,
    memo: r.memo ?? undefined,
    guestCode: r.guest_code ?? undefined,
    position: r.position ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return NextResponse.json({ data: list });
}
