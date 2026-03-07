/**
 * LawGo 전문 게시판 설정 (G6 게시판 ID 매핑 + AI·문서 엔진)
 * API와 프론트에서 동일한 목록 사용
 */

export interface BoardItem {
  id: string;
  name: string;
  description?: string;
}

/** G6 연동 게시판 */
export const BOARD_LIST: BoardItem[] = [
  { id: "case_memo", name: "사건 메모", description: "사건별 메모·진행 기록" },
  { id: "notice", name: "공지사항", description: "사무소 공지" },
  { id: "general", name: "자유게시판", description: "업무·자료 공유" },
];

/** AI·문서 엔진 기능 (Gemini 연동) */
export interface AiFeatureItem {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string; // Gemini 시스템 프롬프트 요약
}

export const AI_FEATURES: AiFeatureItem[] = [
  { id: "case_search", name: "판례검색", description: "판례 키워드·요건 검색", systemPrompt: "판례 검색 및 요약" },
  { id: "law_search", name: "법률검색", description: "법령·조문 검색", systemPrompt: "법령·조문 검색 및 해석" },
  { id: "doc_summary", name: "AI 문서요약", description: "문서 자동 요약", systemPrompt: "문서 요약" },
  { id: "doc_draft", name: "AI 서면작성", description: "서면·진술서 초안 작성", systemPrompt: "법률 서면 초안 작성" },
  { id: "ai_search", name: "AI 검색", description: "자연어 질의 검색", systemPrompt: "법률·판례 통합 검색" },
];
