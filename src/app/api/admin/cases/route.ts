/**
 * 관리자 사건 API - 목록/생성/일괄 상태변경/일괄삭제
 * Supabase cases 테이블 연동
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { normalizeClientNameForClosedStatus } from "@/lib/caseExcel";

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
  const rawClientName = String(item.clientName ?? item.client_name ?? "").trim() || "(의뢰인 없음)";
  const { name: client_name, status: closedOverride } = normalizeClientNameForClosedStatus(rawClientName);
  return {
    case_number: String(item.caseNumber ?? item.case_number ?? "").trim() || "미등록",
    case_type: String(item.caseType ?? item.case_type ?? "민사").trim() || "민사",
    case_name: String(item.caseName ?? item.case_name ?? "").trim() || "(사건명 없음)",
    court: String(item.court ?? "").trim() || "미정",
    client_name: client_name || "(의뢰인 없음)",
    client_position: (item.clientPosition ?? item.client_position ?? "") as string,
    opponent_name: (item.opponentName ?? item.opponent_name ?? "") as string,
    status: closedOverride ?? item.status ?? "진행중",
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
  const idParam = searchParams.get("id") ?? "";
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const caseType = searchParams.get("case_type") ?? "";
  const court = searchParams.get("court") ?? "";
  const assignedStaff = searchParams.get("assigned_staff") ?? "";
  const pageParam = Number(searchParams.get("page") ?? "1");
  const sizeParam = Number(searchParams.get("page_size") ?? "15");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSizeRaw = Number.isFinite(sizeParam) && sizeParam > 0 ? sizeParam : 15;
  const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = db
    .from("cases")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (idParam.trim()) {
    query = query.eq("id", idParam.trim());
  }
  if (q.trim()) {
    query = query.or(`client_name.ilike.%${q.trim()}%,case_number.ilike.%${q.trim()}%,case_name.ilike.%${q.trim()}%`);
  }
  if (status && ["진행중", "종결", "사임"].includes(status)) {
    query = query.eq("status", status);
  }
  if (caseType.trim()) query = query.eq("case_type", caseType.trim());
  if (court.trim()) query = query.eq("court", court.trim());
  if (assignedStaff.trim()) query = query.eq("assigned_staff_name", assignedStaff.trim());

  const { data, error, count } = await query;
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
  return NextResponse.json({
    data: out,
    total: typeof count === "number" ? count : out.length,
    page,
    pageSize,
  });
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
    const rawRows = body.items.map((item) => toRow(item));

    // 1) 기존 DB에 이미 있는 사건 키 수집 (id/created_at/updated_at 제외 완전 동일 기준)
    const { data: existing, error: loadError } = await db.from("cases").select("*");
    if (loadError) {
      return NextResponse.json({ error: loadError.message }, { status: 400 });
    }
    type Row = Record<string, unknown>;
    const existingKeys = new Set<string>();
    for (const r of (existing ?? []) as Row[]) {
      const keyObj: Row = { ...r };
      delete keyObj.id;
      delete keyObj.created_at;
      delete keyObj.updated_at;
      const key = JSON.stringify(keyObj);
      existingKeys.add(key);
    }

    // 2) 이번 엑셀 업로드 내에서의 중복도 함께 제거
    const newKeys = new Set<string>();
    let inserted = 0;
    let skippedExisting = 0;
    let skippedInBatch = 0;

    for (const row of rawRows) {
      const key = JSON.stringify(row);
      if (existingKeys.has(key)) {
        skippedExisting += 1;
        continue;
      }
      if (newKeys.has(key)) {
        skippedInBatch += 1;
        continue;
      }
      const { error } = await db.from("cases").insert(row);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      newKeys.add(key);
      inserted += 1;
    }

    const messages: string[] = [];
    messages.push(`${inserted}건 신규 사건이 등록되었습니다.`);
    if (skippedExisting > 0) {
      messages.push(`기존과 완전히 동일한 사건 ${skippedExisting}건은 중복으로 제외했습니다.`);
    }
    if (skippedInBatch > 0) {
      messages.push(`엑셀 내에서 완전히 동일한 사건 ${skippedInBatch}건은 1건만 등록하고 나머지는 제외했습니다.`);
    }

    return NextResponse.json({ message: messages.join(" "), inserted, skippedExisting, skippedInBatch });
  }

  const row = toRow(body);
  const { data, error } = await db
    .from("cases")
    .insert(row)
    .select("*")
    .single();
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
  let body: { ids?: string[]; all?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  // 전체 삭제 모드
  if (body.all) {
    let totalDeleted = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await db.from("cases").select("id").range(0, pageSize - 1);
      if (error) {
        return NextResponse.json({ error: error.message, deleted: totalDeleted }, { status: 400 });
      }
      const idsChunk = (data ?? []).map((r) => r.id as string).filter(Boolean);
      if (idsChunk.length === 0) break;
      const { error: delError } = await db.from("cases").delete().in("id", idsChunk);
      if (delError) {
        return NextResponse.json({ error: delError.message, deleted: totalDeleted }, { status: 400 });
      }
      totalDeleted += idsChunk.length;
      if (idsChunk.length < pageSize) break;
    }
    return NextResponse.json({ message: `전체 사건 ${totalDeleted}건을 삭제했습니다.`, deleted: totalDeleted });
  }

  // 선택 삭제 모드
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
