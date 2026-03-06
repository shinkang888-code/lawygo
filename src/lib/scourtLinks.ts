/**
 * 대법원 나의 사건검색 연동
 * - 조회 페이지 URL 생성
 * - 사건번호/당사자명 복사 (포털에 붙여넣기용)
 * @see docs/scourt-case-search-integration.md
 */

/** 나의 사건검색 페이지 URL (대법원 포털) */
export const SCOURT_MY_CASE_SEARCH_URL =
  "https://www.scourt.go.kr/portal/information/events/search/search.jsp";

/** ssgo 나의 사건검색 */
export const SCOURT_SSGO_SEARCH_URL = "https://ssgo.scourt.go.kr/ssgo/index.on?cortId=www";

/**
 * 법원 나의 사건검색 페이지를 새 탭에서 연다.
 * 사건번호·당사자명은 포털이 GET 파라미터를 지원하지 않을 수 있어, 복사용 텍스트만 반환.
 */
export function openScourtMyCaseSearch(): void {
  if (typeof window !== "undefined") {
    window.open(SCOURT_MY_CASE_SEARCH_URL, "_blank", "noopener,noreferrer");
  }
}

/**
 * 사건번호와 당사자명을 포털에 붙여넣기 쉬운 형태로 반환.
 * "법원에서 조회" 시 클립보드에 복사해 두면 사용자가 포털에서 바로 입력할 수 있다.
 */
export function getScourtSearchCopyText(caseNumber: string, partyName: string): string {
  const lines: string[] = [];
  if (caseNumber?.trim()) lines.push(`사건번호: ${caseNumber.trim()}`);
  if (partyName?.trim()) lines.push(`당사자: ${partyName.trim()}`);
  return lines.length ? lines.join("\n") : "";
}

/**
 * 사건번호·당사자명을 클립보드에 복사한 뒤 법원 조회 페이지를 연다.
 * (복사 실패 시에도 새 탭은 연다.)
 */
export async function copyAndOpenScourtSearch(caseNumber: string, partyName: string): Promise<void> {
  const text = getScourtSearchCopyText(caseNumber, partyName);
  if (text && typeof navigator?.clipboard?.writeText === "function") {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }
  openScourtMyCaseSearch();
}
