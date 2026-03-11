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
/** user_lawygo.xls 형식: 성명, ID, 사용자유형 */
const USER_LAWYGO_HEADERS = ["성명", "ID"] as const;
const DEFAULT_PASSWORD = "changeMe1!";
const DEFAULT_MANAGEMENT_NUMBER = "00000";
const ADMIN_LOGIN_ID = "shinkang";

function mapUserTypeToRole(사용자유형: string): string {
  const s = String(사용자유형 ?? "").trim();
  if (s.includes("변호사")) return "변호사";
  if (s.includes("관리자")) return "관리자";
  if (s.includes("국장")) return "국장";
  if (s.includes("사무장")) return "사무장";
  if (s.includes("임원")) return "임원";
  if (s.includes("인턴")) return "인턴";
  if (s.includes("사무원")) return "사무원";
  return "직원";
}

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
  let replaceMode = false;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File;
    const replaceParam = formData.get("replace");
    replaceMode = replaceParam === "true" || replaceParam === "1" || String(replaceParam).toLowerCase() === "true";
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
  const hasStandard = REQUIRED_HEADERS.every((h) => headers.includes(h));
  const hasUserLawygo = USER_LAWYGO_HEADERS.every((h) => headers.includes(h));

  if (!hasStandard && !hasUserLawygo) {
    return NextResponse.json(
      {
        error: "엑셀 형식이 맞지 않습니다. 표준(로그인ID, 이름, 역할) 또는 user_lawygo(성명, ID, 사용자유형) 형식이어야 합니다.",
        errors: [{ row: 0, field: "헤더", message: `필수: ${REQUIRED_HEADERS.join(", ")} 또는 성명, ID, 사용자유형` }],
      },
      { status: 400 }
    );
  }

  const normalizedRows: Record<string, unknown>[] = hasUserLawygo
    ? rows.map((row) => ({
        로그인ID: getCell(row, "ID"),
        이름: getCell(row, "성명"),
        역할: mapUserTypeToRole(getCell(row, "사용자유형")),
        비밀번호: DEFAULT_PASSWORD,
        관리번호: getCell(row, "ID") || DEFAULT_MANAGEMENT_NUMBER,
        소속부서: getCell(row, "소속부서"),
        이메일: getCell(row, "이메일"),
        이동전화: getCell(row, "이동전화"),
        업무전화: getCell(row, "업무전화"),
      }))
    : rows;

  const errors: ExcelRowError[] = [];
  const loginIdsInFile = new Set<string>();
  const parsed: {
    loginId: string;
    name: string;
    role: string;
    password: string;
    managementNumber: string;
    department?: string;
    email?: string;
    phone?: string;
  }[] = [];

  for (let i = 0; i < normalizedRows.length; i++) {
    const rowIndex = i + 1;
    const row = normalizedRows[i];
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

    const department = getCell(row, "소속부서");
    const email = getCell(row, "이메일");
    const phone = getCell(row, "이동전화") || getCell(row, "업무전화");
    parsed.push({
      loginId,
      name: name || loginId,
      role: effectiveRole,
      password,
      managementNumber: managementNumber || DEFAULT_MANAGEMENT_NUMBER,
      ...(department && { department }),
      ...(email && { email }),
      ...(phone && { phone }),
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

  const roleToLevel = (role: string) =>
    role === "임원" ? 5 : role === "변호사" ? 3 : role === "사무장" || role === "국장" ? 2 : role === "인턴" ? 0 : 1;

  if (replaceMode) {
    const { data: existingUsers } = await db.from("site_users").select("id, login_id");
    const toDeleteUserIds = (existingUsers ?? []).filter((r) => String(r.login_id).toLowerCase() !== ADMIN_LOGIN_ID).map((r) => r.id);
    for (let i = 0; i < toDeleteUserIds.length; i += 100) {
      const chunk = toDeleteUserIds.slice(i, i + 100);
      const { error } = await db.from("site_users").delete().in("id", chunk);
      if (error) {
        return NextResponse.json({ error: `기존 회원 삭제 실패: ${error.message}` }, { status: 500 });
      }
    }
    const { data: existingStaff } = await db.from("staff").select("id");
    const staffIds = (existingStaff ?? []).map((r) => r.id);
    for (let i = 0; i < staffIds.length; i += 100) {
      const chunk = staffIds.slice(i, i + 100);
      const { error } = await db.from("staff").delete().in("id", chunk);
      if (error) {
        return NextResponse.json({ error: `기존 직원 삭제 실패: ${error.message}` }, { status: 500 });
      }
    }
  }

  let inserted = 0;
  for (const row of parsed) {
    if (row.loginId === ADMIN_LOGIN_ID) continue;

    if (!replaceMode) {
      const { data: existing } = await db.from("site_users").select("id").eq("login_id", row.loginId).maybeSingle();
      if (existing) continue;
    }

    const password_hash = hashPassword(row.password);
    const { error: insertError } = await db.from("site_users").insert({
      login_id: row.loginId,
      password_hash,
      name: row.name,
      role: row.role,
      status: "approved",
      management_number: row.managementNumber,
      approved_at: new Date().toISOString(),
      approved_by: replaceMode ? "excel-replace" : "excel-import",
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
            department: row.department ?? "",
            email: row.email || null,
            phone: row.phone || null,
            approval_level: roleToLevel(row.role),
          },
        ],
        { onConflict: "login_id", ignoreDuplicates: !replaceMode }
      );
    } catch {
      // staff 연동 실패해도 회원은 생성됨
    }
  }

  if (replaceMode) {
    const { data: adminStaff } = await db.from("staff").select("id").eq("login_id", ADMIN_LOGIN_ID).maybeSingle();
    if (!adminStaff) {
      const { data: adminUser } = await db.from("site_users").select("name").eq("login_id", ADMIN_LOGIN_ID).maybeSingle();
      await db.from("staff").insert({
        login_id: ADMIN_LOGIN_ID,
        name: (adminUser as { name?: string } | null)?.name ?? "관리자",
        role: "관리자",
        department: "",
        approval_level: 5,
      });
    }
    // 직원 관리 '제외 목록' 초기화 — 전량 반영 후 목록에 모두 표시
    await db.from("app_settings").upsert(
      { key: "staff_excluded_login_ids", value: [] },
      { onConflict: "key" }
    );
  }

  return NextResponse.json({
    success: true,
    count: inserted,
    total: parsed.length,
    replaced: replaceMode,
  });
}
