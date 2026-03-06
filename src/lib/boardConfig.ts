/**
 * LawGo 전문 게시판 설정 (G6 게시판 ID 매핑)
 * API와 프론트에서 동일한 목록 사용
 */

export interface BoardItem {
  id: string;
  name: string;
  description?: string;
}

export const BOARD_LIST: BoardItem[] = [
  { id: "case_memo", name: "사건 메모", description: "사건별 메모·진행 기록" },
  { id: "notice", name: "공지사항", description: "사무소 공지" },
  { id: "general", name: "자유게시판", description: "업무·자료 공유" },
];
