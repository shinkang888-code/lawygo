/**
 * 기일(deadlines) 조회 API - 사건과 연동
 * GET ?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD (달력 기간)
 * GET ?caseId=uuid (사건별 기일)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

function getDb() {
  return getSupabaseAdmin();
}

export async function GET(request: NextRequest) {
  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const caseId = searchParams.get("caseId") ?? "";

  let query = db
    .from("deadlines")
    .select("id, case_id, deadline_date, deadline_type, court, memo, is_immutable, completed_at, created_at, cases(case_number)");

  if (caseId) {
    query = query.eq("case_id", caseId).order("deadline_date", { ascending: true });
  } else {
    query = query.order("deadline_date", { ascending: true });
    if (dateFrom) query = query.gte("deadline_date", dateFrom);
    if (dateTo) query = query.lte("deadline_date", dateTo);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const list = (data ?? []).map((r: Record<string, unknown>) => {
    const casesRow = r.cases as Record<string, unknown> | null;
    return {
      id: r.id,
      caseId: r.case_id,
      caseNumber: casesRow?.case_number ?? "",
      date: r.deadline_date,
      type: r.deadline_type,
      court: r.court ?? "",
      memo: r.memo ?? "",
      isImmutable: Boolean(r.is_immutable),
      completedAt: r.completed_at,
      createdAt: r.created_at,
    };
  });

  return NextResponse.json({ data: list });
}
