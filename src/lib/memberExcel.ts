/**
 * 회원 목록 엑셀 다운로드 (회원 관리 페이지)
 */
import * as XLSX from "xlsx";

export interface MemberForExport {
  id: string;
  login_id: string;
  management_number: string;
  status: string;
  name: string | null;
  role: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
  } catch {
    return iso;
  }
}

/**
 * 현재 회원 목록을 엑셀 파일로 다운로드 (직원목록 형식과 동일한 컬럼 포함)
 */
export function exportMembersToExcel(members: MemberForExport[]): void {
  const rows = members.map((m) => ({
    로그인ID: m.login_id ?? "",
    이름: m.name ?? "",
    역할: m.role ?? "",
    관리번호: m.management_number ?? "",
    상태: m.status === "approved" ? "승인" : m.status === "pending" ? "대기" : m.status,
    가입일: formatDate(m.created_at),
    승인일: formatDate(m.approved_at),
    승인자: m.approved_by ?? "",
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "회원목록");
  XLSX.writeFile(wb, `회원목록_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
