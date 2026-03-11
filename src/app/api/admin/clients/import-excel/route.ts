/**
 * 고객(의뢰인) 엑셀 일괄 등록 / 전량 반영
 * FormData: file, replace (optional, "true" 시 기존 고객 전부 삭제 후 엑셀만 반영)
 * guestlist 형식: 의뢰인명, 이동전화, 전화, 이메일, 주소, 고유번호, 직위, 비고 등
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function getCell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v == null) return "";
  return String(v).trim();
}

function rowToDbClient(row: Record<string, unknown>, isGuestlist: boolean) {
  if (isGuestlist) {
    const name = getCell(row, "의뢰인명");
    if (!name) return null;
    const phone = getCell(row, "이동전화") || getCell(row, "전화");
    const memoParts = [
      getCell(row, "비고"),
      getCell(row, "구분") ? `구분: ${getCell(row, "구분")}` : "",
      getCell(row, "담당자명") ? `담당: ${getCell(row, "담당자명")}` : "",
      getCell(row, "사건번호") ? `사건번호: ${getCell(row, "사건번호")}` : "",
      getCell(row, "사건명") ? `사건명: ${getCell(row, "사건명")}` : "",
    ].filter(Boolean);
    const memo = memoParts.join(" / ").slice(0, 2000) || null;
    return {
      name,
      position: getCell(row, "직위") || null,
      contact_phone: phone || null,
      contact_email: getCell(row, "이메일") || null,
      memo,
      address: getCell(row, "주소") || null,
      guest_code: getCell(row, "고유번호") || null,
    };
  }
  const name = getCell(row, "의뢰인");
  if (!name) return null;
  const phone = getCell(row, "연락처") || getCell(row, "휴대폰");
  return {
    name,
    position: null,
    contact_phone: phone || null,
    contact_email: getCell(row, "이메일") || null,
    memo: getCell(row, "메모") || null,
    address: getCell(row, "주소") || null,
    guest_code: null,
  };
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }

  let file: File;
  let replaceMode = false;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File;
    const replaceParam = formData.get("replace");
    replaceMode = replaceParam === "true" || replaceParam === "1";
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "엑셀 파일을 선택해 주세요." }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".xls") && !file.name.toLowerCase().endsWith(".xlsx")) {
      return NextResponse.json({ error: "엑셀 파일(.xls, .xlsx)만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "파일 크기는 5MB 이하여야 합니다." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch {
    return NextResponse.json({ error: "엑셀 파일을 읽을 수 없습니다." }, { status: 400 });
  }

  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return NextResponse.json({ error: "시트가 비어 있습니다." }, { status: 400 });
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!rows.length) {
    return NextResponse.json({ error: "데이터 행이 없습니다." }, { status: 400 });
  }

  const headers = Object.keys(rows[0] ?? {});
  const isGuestlist = headers.includes("의뢰인명");

  const toInsert: Array<Record<string, unknown>> = [];
  for (const row of rows) {
    const c = rowToDbClient(row, isGuestlist);
    if (c) toInsert.push(c);
  }

  if (toInsert.length === 0) {
    return NextResponse.json({ error: "등록할 고객 데이터가 없습니다. (의뢰인명 또는 의뢰인 컬럼 필요)" }, { status: 400 });
  }

  if (replaceMode) {
    const { data: existing } = await db.from("clients").select("id");
    const ids = (existing ?? []).map((r: { id: string }) => r.id);
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await db.from("clients").delete().in("id", chunk);
      if (error) {
        return NextResponse.json({ error: `기존 고객 삭제 실패: ${error.message}` }, { status: 500 });
      }
    }
  }

  const chunk = 80;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const slice = toInsert.slice(i, i + chunk);
    const { error } = await db.from("clients").insert(slice);
    if (error) {
      return NextResponse.json({ error: `고객 삽입 실패: ${error.message}` }, { status: 500 });
    }
    inserted += slice.length;
  }

  return NextResponse.json({
    success: true,
    count: inserted,
    total: toInsert.length,
    replaced: replaceMode,
  });
}
