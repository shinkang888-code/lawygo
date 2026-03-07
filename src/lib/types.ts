/** LawGo 핵심 데이터 타입 정의 */

export interface CaseItem {
  id: string;
  caseNumber: string;       // 사건번호 (예: 2026노107)
  caseType: string;         // 사건종류
  caseName: string;         // 사건명
  court: string;            // 계속기관 (법원명)
  clientName: string;       // 의뢰인
  clientPosition: string;   // 의뢰인 지위 (원고/피고/피고인 등)
  opponentName: string;     // 상대방
  status: CaseStatus;       // 진행상태
  assignedStaff: string;    // 수행 변호사
  assistants: string;       // 보조 직원 (쉼표 구분)
  nextDate: string | null;  // 다음 기일
  nextDateType: string;     // 기일 종류
  isElectronic: boolean;    // 전자사건 여부
  isUrgent: boolean;        // 긴급 여부
  isImmutable: boolean;     // 불변기일 여부
  receivedDate: string;     // 수임일
  amount: number;           // 수임료
  receivedAmount: number;   // 수납액
  pendingAmount: number;    // 미수금
  notes: string;            // 비고
  createdAt: string;
  updatedAt: string;
}

export type CaseStatus =
  | "진행중"
  | "완료"
  | "보류"
  | "취하"
  | "종결";

/** 직원 역할 (폼 선택용) */
export type StaffRoleOption = "임원" | "변호사" | "사무장" | "국장" | "직원";
/** 직급 (폼 선택용) */
export type JobTitleOption = "부장" | "팀장" | "과장" | "대리" | "주임" | "인턴";

export interface StaffMember {
  id: string;
  name: string;
  role: "임원" | "변호사" | "사무장" | "국장" | "직원" | "사무원" | "인턴"; // 기존 호환 포함
  department: string;
  email: string;
  phone: string;
  level: number; // 결재 레벨
  avatarUrl?: string;
  /** 직급 (부장, 팀장 등) */
  jobTitle?: JobTitleOption;
  /** 회사 전화 */
  companyPhone?: string;
  /** 개인 전화 */
  personalPhone?: string;
}

export interface ApprovalDoc {
  id: string;
  title: string;
  type: "청구서" | "보고서" | "위임장" | "계약서" | "기타";
  status: ApprovalStatus;
  caseId: string;
  caseNumber: string;
  requesterId: string;
  requesterName: string;
  approvalLine: ApprovalStep[];
  createdAt: string;
  completedAt?: string;
  amount?: number;
  notes?: string;
  /** 기안 시 첨부 파일 목록 (파일명) */
  attachmentNames?: string[];
}

export type ApprovalStatus =
  | "임시저장"
  | "결재요청"
  | "결재중"
  | "결재완료"
  | "반려";

export interface ApprovalStep {
  order: number;
  staffId: string;
  staffName: string;
  role: string;
  status: "대기" | "승인" | "반려";
  signedAt?: string;
  comment?: string;
}

export interface FinanceEntry {
  id: string;
  type: "수납" | "지출" | "미수금";
  caseId: string;
  caseNumber: string;
  clientName: string;
  amount: number;
  date: string;
  description: string;
  status: "확인" | "미확인" | "매칭완료";
  bankTransactionId?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  depositorName: string;
  amount: number;
  bankName: string;
  memo: string;
  matchedTo?: string; // FinanceEntry id
}

export interface Timeline {
  id: string;
  caseId: string;
  type: "memo" | "court_update" | "document" | "status_change" | "finance";
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  date: string;
  attachments?: TimelineAttachment[];
  metadata?: Record<string, string | number | boolean>;
}

export interface TimelineAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface Notification {
  id: string;
  type: "urgent_date" | "approval_request" | "memo" | "finance";
  title: string;
  message: string;
  isRead: boolean;
  caseId?: string;
  createdAt: string;
  link?: string;
  /** 결재 요청 알림일 때 결재 문서 ID */
  approvalDocId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  role: "변호사" | "사무장" | "사무원" | "인턴" | "관리자";
  department: string;
  permissions: string[];
  avatarUrl?: string;
}

export interface DashboardStats {
  todayDeadlines: number;
  urgentCases: number;
  pendingApprovals: number;
  pendingPayments: number;
  totalActiveCases: number;
  totalMonthlyIncome: number;
}

/** 상담실/상담 유형 (회의실 등록·편집에 대응) */
export interface ConsultationRoom {
  id: string;
  name: string;
  sortOrder: number;
  remarks?: string;
}

/** 상담 담당자 1명 (다중 선택용) */
export interface ConsultationConsultant {
  id: string;
  name: string;
}

/** 상담 일정·기록 (캘린더 연동, 매치사건으로 관련기록 연결) */
export interface ConsultationItem {
  id: string;
  consultationDate: string;      // YYYY-MM-DD
  startTime: string;             // HH:mm
  endTime: string;               // HH:mm
  roomId: string;
  roomName: string;
  consultantId: string;           // 하위 호환: 첫 담당자
  consultantName: string;         // 하위 호환: 첫 담당자명
  /** 상담 담당자 여러 명 (문자 발송 시 복수 입력 형태) */
  consultants?: ConsultationConsultant[];
  clientName: string;             // 하위 호환: 첫 내담자
  /** 방문자(내담자) 여러 명 */
  clientNames?: string[];
  purpose: string;               // 용건
  importance: "high" | "medium" | "low";
  status: ConsultationStatus;
  caseId?: string;               // 매치사건
  caseNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConsultationStatus =
  | "scheduled"    // 예약
  | "notified"     // 통지완료
  | "completed"    // 상담완료
  | "cancelled";   // 예약취소

export type FilterOperator = "equals" | "contains" | "in" | "gte" | "lte";

export interface FilterConfig {
  field: keyof CaseItem;
  operator: FilterOperator;
  value: string | string[] | number;
  label: string;
}

export interface SortConfig {
  field: keyof CaseItem;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
}

/** 기일(달력용) - 사건 nextDate와 별도로 등록·관리하는 기일 */
export interface DeadlineItem {
  id: string;
  date: string;                 // YYYY-MM-DD
  caseId?: string;
  caseNumber: string;            // 표시용 사건번호
  type: string;                  // 변론기일, 선고기일, 서면제출 등
  court?: string;
  assignedStaff?: string;
  memo?: string;
  status: "active" | "deleted";  // 소프트 삭제
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** 기일 등록 폼 필드 정의 (폼 양식 수정용) */
export interface DeadlineFormFieldConfig {
  key: string;
  label: string;
  type: "text" | "date" | "select" | "textarea";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
}
