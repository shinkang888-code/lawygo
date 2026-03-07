/**
 * 회원 엑셀 일괄 등록 (직원목록 엑셀 형식)
 * FormData: file (엑셀 .xlsx/.xls)
 * 필수 컬럼: 로그인ID, 이름, 역할. 선택: 비밀번호, 관리번호
 * 형식이 맞지 않으면 등록하지 않고 검증 오류만 반환.
 * Rate limiting 적용.
 */

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSupabaseAdmin } from "@/lib/supabaseClient";
import { getSession } from "@/lib/authSession";
import { hashPassword } from "@/lib/authPassword";
import { checkRateLimit, getClientIdentifier, LIMIT_IMPORT_PER_MIN } from "@/lib/rateLimit";

const ALLOWED_ROLES = ["관리자", "임원", "변호사", "사무장", "국장", "직원", "사무원", "인턴"] as const;
const REQUIRED_HEADERS = ["로그인ID", "이름", "역할"] as const;
const DEFAULT_PASSWORD = "changeMe1!";
const DEFAULT_MANAGEMENT_NUMBER = "00000";

/** 파일 업로드 보안: 최대 5MB */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
/** 허용 확장자 화이트리스트 */
const ALLOWED_EXTENSIONS = [".xlsx", ".xls"];
/** xlsx = ZIP 매직: PK (0x50 0x4B); xls = OLE2: D0 CF 11 E0 */
function isAllowedExcelBuffer(buf: Buffer): boolean {
  if (buf.length < 4) return false;
  if (buf[0] === 0x50 && buf[1] === 0x4b) return true; // xlsx
  if (buf[0] === 0xd0 && buf[1] === 0xcf && buf[2] === 0x11 && buf[3] === 0xe0) return true; // xls
  return false;
}

export interface ExcelRowError {
  row: number;
  field?: string;
  message: string;
}

function getCell(row: Record<string, unknown>, key: string): string {
  const v = row[key];
  if (v == null) return "";
  return String(v).trim();
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const clientId = getClientIdentifier(request);
  if (!checkRateLimit(`import:${clientId}`, LIMIT_IMPORT_PER_MIN)) {
    return NextResponse.json(
      { error: "엑셀 등록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let file: File;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "엑셀 파일을 선택해 주세요." }, { status: 400 });
    }
    const name = (file.name ?? "").toLowerCase();
    const ext = ALLOWED_EXTENSIONS.some((e) => name.endsWith(e));
    if (!ext) {
      return NextResponse.json({ error: "엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다." }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `파일 크기는 ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB 이하여야 합니다.` },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!isAllowedExcelBuffer(buffer)) {
    return NextResponse.json(
      { error: "허용되지 않은 파일 형식입니다. 실제 엑셀(.xlsx, .xls) 파일을 업로드해 주세요.", errors: [{ row: 0, message: "MIME/매직 바이트 검증 실패" }] },
      { status: 400 }
    );
  }
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buffer, { type: "buffer" });
  } catch (e) {
    return NextResponse.json(
      { error: "엑셀 파일을 읽을 수 없습니다.", errors: [{ row: 0, message: "파일 형식이 올바르지 않습니다." }] },
      { status: 400 }
    );
  }

  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) {
    return NextResponse.json(
      { error: "엑셀 형식 오류", errors: [{ row: 0, message: "시트가 비어 있습니다." }] },
      { status: 400 }
    );
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "", raw: false });
  if (!rows.length) {
    return NextResponse.json(
      { error: "엑셀 형식 오류", errors: [{ row: 0, message: "데이터 행이 없습니다." }] },
      { status: 400 }
    );
  }

  const headers = Object.keys(rows[0] ?? {});
  const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    return NextResponse.json(
      {
        error: "엑셀 형식이 맞지 않습니다. 필수 컬럼이 없습니다.",
        errors: [{ row: 0, field: "헤더", message: `필수 컬럼: ${REQUIRED_HEADERS.join(", ")}. 없음: ${missingHeaders.join(", ")}` }],
      },
      { status: 400 }
    );
  }

  const errors: ExcelRowError[] = [];
  const loginIdsInFile = new Set<string>();
  const parsed: { loginId: string; name: string; role: string; password: string; managementNumber: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 1;
    const row = rows[i];
    const loginId = getCell(row, "로그인ID").toLowerCase();
    const name = getCell(row, "이름");
    const role = getCell(row, "역할");
    const password = getCell(row, "비밀번호") || DEFAULT_PASSWORD;
    const managementNumber = getCell(row, "관리번호") || DEFAULT_MANAGEMENT_NUMBER;

    if (!loginId) {
      errors.push({ row: rowIndex, field: "로그인ID", message: "로그인ID가 비어 있습니다." });
    } else if (loginId.length < 2) {
      errors.push({ row: rowIndex, field: "로그인ID", message: "로그인ID는 2자 이상이어야 합니다." });
    } else if (loginIdsInFile.has(loginId)) {
      errors.push({ row: rowIndex, field: "로그인ID", message: "파일 내 동일한 로그인ID가 이미 있습니다." });
    } else {
      loginIdsInFile.add(loginId);
    }

    if (!name) {
      errors.push({ row: rowIndex, field: "이름", message: "이름이 비어 있습니다." });
    }
    // 역할 비어 있으면 기본값 "직원"으로 반영 (오류로 막지 않음)
    const effectiveRole =
      role && ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])
        ? role
        : "직원";
    if (role && !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      errors.push({
        row: rowIndex,
        field: "역할",
        message: `역할은 다음 중 하나여야 합니다: ${ALLOWED_ROLES.join(", ")}`,
      });
    }
    if (password.length < 4) {
      errors.push({ row: rowIndex, field: "비밀번호", message: "비밀번호는 4자 이상이어야 합니다." });
    }

    if (errors.some((e) => e.row === rowIndex)) continue;

    parsed.push({
      loginId,
      name: name || loginId,
      role: effectiveRole,
      password,
      managementNumber: managementNumber || DEFAULT_MANAGEMENT_NUMBER,
    });
  }

  if (errors.length > 0) {
    return NextResponse.json(
      {
        error: "엑셀 형식 또는 데이터가 맞지 않아 등록되지 않았습니다.",
        errors,
      },
      { status: 400 }
    );
  }

  if (parsed.length === 0) {
    return NextResponse.json(
      { error: "등록할 회원 데이터가 없습니다.", errors: [{ row: 0, message: "유효한 데이터 행이 없습니다." }] },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "서버 설정 오류" }, { status: 503 });
  }

  let inserted = 0;
  const roleToLevel = (role: string) =>
    role === "임원" ? 5 : role === "변호사" ? 3 : role === "사무장" || role === "국장" ? 2 : role === "인턴" ? 0 : 1;

  for (const row of parsed) {
    const { data: existing } = await db.from("site_users").select("id").eq("login_id", row.loginId).maybeSingle();
    if (existing) continue;

    const password_hash = hashPassword(row.password);
    const { error: insertError } = await db.from("site_users").insert({
      login_id: row.loginId,
      password_hash,
      name: row.name,
      role: row.role,
      status: "approved",
      management_number: row.managementNumber,
    });

    if (insertError) {
      console.error("member import row:", insertError);
      continue;
    }

    inserted++;
    try {
      await db.from("staff").upsert(
        [
          {
            login_id: row.loginId,
            name: row.name,
            role: row.role,
            department: "",
            email: null,
            phone: null,
            approval_level: roleToLevel(row.role),
          },
        ],
        { onConflict: "login_id", ignoreDuplicates: true }
      );
    } catch {
      // staff 연동 실패해도 회원은 생성됨
    }
  }

  return NextResponse.json({ success: true, count: inserted, total: parsed.length });
}
