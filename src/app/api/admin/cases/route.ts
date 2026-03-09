/**
 * 관리자 사건 API - 목록/생성/일괄 상태변경/일괄삭제
 * Supabase cases 테이블 연동
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

function getDb() {
  return getSupabaseAdmin();
}

function toBool(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toUpperCase();
  return s === "Y" || s === "YES" || s === "O" || s === "1" || s === "TRUE" || s === "예" || s === "ELEC";
}

function toDateString(v: unknown): string {
  if (v === undefined || v === null) return new Date().toISOString().slice(0, 10);
  if (typeof v === "number" && v > 10000) {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

function toRow(item: Record<string, unknown>) {
  const receivedRaw = item.receivedDate ?? item.received_date;
  return {
    case_number: String(item.caseNumber ?? item.case_number ?? "").trim() || "미등록",
    case_type: String(item.caseType ?? item.case_type ?? "민사").trim() || "민사",
    case_name: String(item.caseName ?? item.case_name ?? "").trim() || "(사건명 없음)",
    court: String(item.court ?? "").trim() || "미정",
    client_name: String(item.clientName ?? item.client_name ?? "").trim() || "(의뢰인 없음)",
    client_position: (item.clientPosition ?? item.client_position ?? "") as string,
    opponent_name: (item.opponentName ?? item.opponent_name ?? "") as string,
    status: item.status ?? "진행중",
    assigned_staff_name: String(item.assignedStaff ?? item.assigned_staff_name ?? "").trim() || "미배정",
    assistants: (item.assistants ?? "") as string,
    received_date: toDateString(receivedRaw),
    amount: Number(item.amount ?? 0),
    received_amount: Number(item.receivedAmount ?? item.received_amount ?? 0),
    pending_amount: Number(item.pendingAmount ?? item.pending_amount ?? 0),
    is_electronic: toBool(item.isElectronic ?? item.is_electronic),
    is_urgent: toBool(item.isUrgent ?? item.is_urgent),
    is_immutable_deadline: toBool(item.isImmutable ?? item.is_immutable_deadline),
    notes: (item.notes ?? "") as string,
  };
}

function fromRow(r: Record<string, unknown>) {
  return {
    id: r.id,
    caseNumber: r.case_number,
    caseType: r.case_type,
    caseName: r.case_name,
    court: r.court,
    clientName: r.client_name,
    clientPosition: r.client_position,
    opponentName: r.opponent_name,
    status: r.status,
    assignedStaff: r.assigned_staff_name,
    assistants: r.assistants ?? "",
    receivedDate: r.received_date,
    nextDate: null as string | null,
    amount: Number(r.amount ?? 0),
    receivedAmount: Number(r.received_amount ?? 0),
    pendingAmount: Number(r.pending_amount ?? 0),
    isElectronic: Boolean(r.is_electronic),
    isUrgent: Boolean(r.is_urgent),
    isImmutable: Boolean(r.is_immutable_deadline),
    notes: r.notes ?? "",
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const caseType = searchParams.get("case_type") ?? "";
  const court = searchParams.get("court") ?? "";
  const assignedStaff = searchParams.get("assigned_staff") ?? "";

  let query = db.from("cases").select("*").order("created_at", { ascending: false });

  if (q.trim()) {
    query = query.or(`client_name.ilike.%${q.trim()}%,case_number.ilike.%${q.trim()}%,case_name.ilike.%${q.trim()}%`);
  }
  if (status && ["진행중", "완료", "보류", "취하", "종결"].includes(status)) {
    query = query.eq("status", status);
  }
  if (caseType.trim()) query = query.eq("case_type", caseType.trim());
  if (court.trim()) query = query.eq("court", court.trim());
  if (assignedStaff.trim()) query = query.eq("assigned_staff_name", assignedStaff.trim());

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const cases = (data ?? []) as Record<string, unknown>[];
  const caseIds = cases.map((c) => c.id as string).filter(Boolean);
  const today = new Date().toISOString().slice(0, 10);
  let nextDateByCaseId: Record<string, string> = {};
  if (caseIds.length > 0) {
    const { data: dlRows } = await db
      .from("deadlines")
      .select("case_id, deadline_date")
      .in("case_id", caseIds)
      .gte("deadline_date", today)
      .order("deadline_date", { ascending: true });
    const byCase = new Map<string, string>();
    for (const r of dlRows ?? []) {
      const cid = r.case_id as string;
      if (!byCase.has(cid)) byCase.set(cid, r.deadline_date as string);
    }
    nextDateByCaseId = Object.fromEntries(byCase);
  }
  const out = cases.map((r) => {
    const row = fromRow(r);
    return { ...row, nextDate: nextDateByCaseId[row.id as string] ?? null };
  });
  return NextResponse.json({ data: out });
}

export async function POST(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }
  let body: Record<string, unknown> | { items?: Record<string, unknown>[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    const rows = body.items.map((item) => toRow(item));
    const { data, error } = await db.from("cases").insert(rows).select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: `${rows.length}건 등록되었습니다.`, inserted: data?.length ?? 0 });
  }

  const row = toRow(body);
  const { data, error } = await db.from("cases").insert(row).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data: fromRow(data as Record<string, unknown>) });
}

export async function PATCH(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }
  let body: { ids?: string[]; status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const ids = body.ids ?? [];
  const status = body.status ?? "종결";
  if (ids.length === 0) {
    return NextResponse.json({ error: "대상 사건을 선택하세요." }, { status: 400 });
  }
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === "종결") {
    update.closed_at = new Date().toISOString().slice(0, 10);
    update.closed_type = "일괄종결";
  }
  const { error } = await db.from("cases").update(update).in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ message: `${ids.length}건이 ${status}(으)로 변경되었습니다.` });
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }
  let body: { ids?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const ids = body.ids ?? [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "삭제할 사건을 선택하세요." }, { status: 400 });
  }
  const { error } = await db.from("cases").delete().in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ message: `${ids.length}건이 삭제되었습니다.` });
}
