/**
 * 사건 편집/등록/삭제 이력 (localStorage)
 */

export interface CaseHistoryEntry {
  id: string;
  caseId: string;
  caseNumber: string;
  clientName: string;
  action: "등록" | "수정" | "삭제" | "소프트삭제" | "영구삭제";
  accountName: string;
  timestamp: string;
  details?: string;
}

const KEY = "lawygo_case_history";
const MAX_ENTRIES = 500;

function load(): CaseHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function save(entries: CaseHistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    const slice = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(slice));
  } catch {}
}

export function appendCaseHistory(entry: Omit<CaseHistoryEntry, "id">): void {
  const list = load();
  const newEntry: CaseHistoryEntry = {
    ...entry,
    id: `ch-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  };
  save([...list, newEntry]);
}

export function getCaseHistory(): CaseHistoryEntry[] {
  return load().reverse();
}

export function searchCaseHistory(opts: {
  caseNumber?: string;
  clientName?: string;
}): CaseHistoryEntry[] {
  const list = getCaseHistory();
  if (!opts.caseNumber?.trim() && !opts.clientName?.trim()) return list;
  const num = (opts.caseNumber ?? "").trim().toLowerCase();
  const client = (opts.clientName ?? "").trim().toLowerCase();
  return list.filter((e) => {
    if (num && !e.caseNumber.toLowerCase().includes(num)) return false;
    if (client && !e.clientName.toLowerCase().includes(client)) return false;
    return true;
  });
}
