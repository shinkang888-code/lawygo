/**
 * 그누보드 6 REST API 연동 유틸리티
 * 그누보드 6의 API 엔드포인트와 통신합니다.
 */

const GNUBOARD_API_BASE = process.env.NEXT_PUBLIC_GNUBOARD_API_URL || "https://your-gnuboard.com/api";
const GNUBOARD_API_KEY = process.env.NEXT_PUBLIC_GNUBOARD_API_KEY || "";

export interface GnuboardPost {
  wr_id: number;
  wr_subject: string;
  wr_content: string;
  wr_name: string;
  wr_datetime: string;
  wr_last: string;
  wr_hit: number;
  wr_comment: number;
  wr_good: number;
  wr_option: string;
  ca_name: string;
  wr_1?: string; // case_id (사건 연동 필드)
  wr_2?: string; // case_type
  wr_3?: string; // priority
  wr_4?: string; // due_date
  wr_5?: string; // staff_list
  files?: GnuboardFile[];
}

export interface GnuboardFile {
  bf_id: number;
  bf_source: string;
  bf_file: string;
  bf_filesize: number;
  bf_content_type: string;
  bf_download: number;
}

export interface GnuboardComment {
  co_id: number;
  wr_id: number;
  co_content: string;
  co_name: string;
  co_datetime: string;
  co_ip: string;
}

export interface GnuboardResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  total?: number;
  page?: number;
  per_page?: number;
}

async function gnuFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<GnuboardResponse<T>> {
  const url = `${GNUBOARD_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GNUBOARD_API_KEY}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Gnuboard API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/** 게시판 목록 조회 */
export async function getPostList(
  boardId: string,
  params: {
    page?: number;
    per_page?: number;
    search_field?: string;
    search_keyword?: string;
    category?: string;
  } = {}
) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined) searchParams.set(key, String(val));
  });

  const query = searchParams.toString() ? `?${searchParams}` : "";
  return gnuFetch<GnuboardPost[]>(`/board/${boardId}${query}`);
}

/** 게시물 단건 조회 */
export async function getPost(boardId: string, postId: number) {
  return gnuFetch<GnuboardPost>(`/board/${boardId}/${postId}`);
}

/** 게시물 작성 */
export async function createPost(
  boardId: string,
  data: Partial<GnuboardPost>
) {
  return gnuFetch<GnuboardPost>(`/board/${boardId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** 게시물 수정 */
export async function updatePost(
  boardId: string,
  postId: number,
  data: Partial<GnuboardPost>
) {
  return gnuFetch<GnuboardPost>(`/board/${boardId}/${postId}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/** 게시물 삭제 */
export async function deletePost(boardId: string, postId: number) {
  return gnuFetch<{ deleted: boolean }>(`/board/${boardId}/${postId}`, {
    method: "DELETE",
  });
}

/** 댓글 목록 조회 */
export async function getComments(boardId: string, postId: number) {
  return gnuFetch<GnuboardComment[]>(`/board/${boardId}/${postId}/comments`);
}

/** 댓글 작성 */
export async function createComment(
  boardId: string,
  postId: number,
  content: string
) {
  return gnuFetch<GnuboardComment>(`/board/${boardId}/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ co_content: content }),
  });
}

/** 파일 업로드 */
export async function uploadFile(boardId: string, postId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const url = `${GNUBOARD_API_BASE}/board/${boardId}/${postId}/files`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GNUBOARD_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) throw new Error("파일 업로드 실패");
  return response.json() as Promise<GnuboardResponse<GnuboardFile>>;
}

/** 사건 관련 메모 조회 (wr_1 = case_id 필터) */
export async function getCaseMemos(caseId: string) {
  return getPostList("case_memo", {
    search_field: "wr_1",
    search_keyword: caseId,
    per_page: 50,
  });
}

/** 회원 정보 조회 */
export async function getMemberInfo(userId: string) {
  return gnuFetch<{
    mb_id: string;
    mb_name: string;
    mb_email: string;
    mb_level: number;
    mb_1?: string; // 직급
    mb_2?: string; // 부서
    mb_3?: string; // 소속
  }>(`/member/${userId}`);
}

/** 파일 크기를 읽기 쉬운 형식으로 변환 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}K`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}M`;
}

/** 파일 MIME 타입에서 아이콘 종류 반환 */
export function getFileIconType(mimeType: string): "pdf" | "excel" | "word" | "image" | "file" {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "excel";
  if (mimeType.includes("word") || mimeType.includes("document")) return "word";
  if (mimeType.startsWith("image/")) return "image";
  return "file";
}
