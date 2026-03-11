/**
 * 사건 목록 엑셀 양식 다운로드 및 파싱 (관리자·사건 목록 페이지 공통)
 * - 업로드 시 EXCEL_COLUMN_MAP과 동일한 헤더 사용 권장
 */

import * as XLSX from "xlsx";

export const EXCEL_COLUMN_MAP: Record<string, string> = {
  키값: "caseNumber",
  사건번호: "caseNumber",
  "사건 번호": "caseNumber",
  case_number: "caseNumber",
  사건종류: "caseType",
  종류: "caseType",
  소분류: "caseType",
  case_type: "caseType",
  사건명: "caseName",
  "사건 명": "caseName",
  case_name: "caseName",
  법원: "court",
  court: "court",
  계속기관: "court",
  의뢰인: "clientName",
  당사자: "clientName",
  client_name: "clientName",
  지위: "clientPosition",
  "의)지위": "clientPosition",
  client_position: "clientPosition",
  상대방: "opponentName",
  opponent_name: "opponentName",
  상태: "status",
  status: "status",
  담당자: "assignedStaff",
  수행변호사: "assignedStaff",
  수행: "assignedStaff",
  assigned_staff_name: "assignedStaff",
  보조: "assistants",
  assistants: "assistants",
  수임일: "receivedDate",
  received_date: "receivedDate",
  수임료: "amount",
  amount: "amount",
  수납액: "receivedAmount",
  received_amount: "receivedAmount",
  미수금: "pendingAmount",
  pending_amount: "pendingAmount",
  전자소송: "isElectronic",
  전자: "isElectronic",
  긴급: "isUrgent",
  기일고정: "isImmutable",
  is_electronic: "isElectronic",
  is_urgent: "isUrgent",
  is_immutable_deadline: "isImmutable",
  비고: "notes",
  notes: "notes",
};

/** 의뢰인명 앞에 오면 '종결'로 간주하는 기호 (◐ ◑ ◒ ◓ 등, 괄호 포함 가능) */
const CLOSED_SYMBOL_PATTERN = /[\u25D0-\u25D3]/u; // ◐ ◑ ◒ ◓
const CLOSED_STATUS_PREFIX = /^\s*\(?\s*[\u25D0-\u25D3\s]+/u;

/**
 * 의뢰인명에 종결 기호(◐ 등)가 있으면 상태를 '종결'로 하고 기호·앞 괄호는 제거한 이름 반환
 */
export function normalizeClientNameForClosedStatus(
  name: string
): { name: string; status: "종결" | null } {
  const s = String(name ?? "").trim();
  if (!s) return { name: s, status: null };
  if (!CLOSED_SYMBOL_PATTERN.test(s)) return { name: s, status: null };
  const trimmed = s.replace(CLOSED_STATUS_PREFIX, "").replace(/[\u25D0-\u25D3\s]+/g, " ").trim();
  return { name: trimmed || s, status: "종결" };
}

function toBool(v: string | number | boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toUpperCase();
  return s === "Y" || s === "YES" || s === "O" || s === "1" || s === "TRUE" || s === "예";
}

export type CaseExcelRow = Record<string, string | number>;

/**
 * 엑셀 파일을 파싱해 API에 넘길 사건 행 배열로 반환 (lawygo_caselist 등 형식 지원)
 */
export function parseExcelFileToCases(file: File): Promise<CaseExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return reject(new Error("파일을 읽을 수 없습니다."));
        const wb = XLSX.read(data, { type: "binary" });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          resolve([]);
          return;
        }
        const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const out: CaseExcelRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          const obj: CaseExcelRow = {};
          headers.forEach((h, j) => {
            const key = EXCEL_COLUMN_MAP[h] ?? h;
            const val = row[j];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              obj[key] = typeof val === "number" ? val : String(val).trim();
            }
          });
          if (Object.keys(obj).length > 0 && (obj.caseNumber || obj.case_number || (obj as Record<string, unknown>)["사건번호"])) {
            const normalized: CaseExcelRow = {};
            Object.entries(obj).forEach(([k, v]) => {
              const nk = EXCEL_COLUMN_MAP[k] ?? k;
              normalized[nk] = v;
            });
            const rawClientName = normalized.clientName ?? normalized.client_name ?? (obj as Record<string, unknown>)["의뢰인"] ?? "";
            const { name: clientNameTrimmed, status: closedOverride } = normalizeClientNameForClosedStatus(String(rawClientName ?? ""));
            if (closedOverride) {
              normalized.status = closedOverride;
              if (normalized.clientName !== undefined) normalized.clientName = clientNameTrimmed;
              if (normalized.client_name !== undefined) (normalized as Record<string, unknown>).client_name = clientNameTrimmed;
            }
            if (!normalized.status) normalized.status = "진행중";
            if (!normalized.caseType) normalized.caseType = "민사";
            if (normalized.isElectronic !== undefined) (normalized as any).isElectronic = toBool(normalized.isElectronic as any);
            if (normalized.isUrgent !== undefined) (normalized as any).isUrgent = toBool(normalized.isUrgent as any);
            if (normalized.isImmutable !== undefined) (normalized as any).isImmutable = toBool(normalized.isImmutable as any);
            out.push(normalized);
          }
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
}

/** 사건 엑셀 업로드 시 사용하는 헤더 (한글) - DB/API 컬럼과 매핑됨 */
export const CASE_EXCEL_HEADERS = [
  "사건번호",
  "사건종류",
  "사건명",
  "법원",
  "의뢰인",
  "지위",
  "상대방",
  "상태",
  "담당자",
  "보조",
  "수임일",
  "수임료",
  "수납액",
  "미수금",
  "전자소송",
  "긴급",
  "기일고정",
  "비고",
] as const;

/**
 * 사건 대량 등록용 빈 엑셀 양식 다운로드
 * - 첫 행에 헤더만 넣어 두고, 아래 행에 데이터 입력 후 저장하여 업로드
 */
export function downloadCaseExcelTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([[...CASE_EXCEL_HEADERS]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "사건목록");
  XLSX.writeFile(wb, `사건등록_양식_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
