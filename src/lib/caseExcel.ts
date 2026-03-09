/**
 * 사건 목록 엑셀 양식 다운로드 (관리자 > 사건관리 대량 엑셀 등록용)
 * - 업로드 시 EXCEL_COLUMN_MAP과 동일한 헤더 사용 권장
 */

import * as XLSX from "xlsx";

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
