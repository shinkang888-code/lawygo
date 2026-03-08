/**
 * 사건별 독립 데이터(메모, 자료실 파일·폴더) 저장/로드
 * localStorage 기반으로 새로고침 후에도 유지
 */

import type { Timeline, TimelineAttachment } from "./types";

const STORAGE_KEYS = {
  memos: "lawygo_case_memos",
  files: "lawygo_case_files",
  folders: "lawygo_case_folders",
} as const;

export interface CaseFile extends TimelineAttachment {
  local?: boolean;
  folderId?: string | null;
  /** Drive 저장 시 파일 ID (메타만 localStorage) */
  driveFileId?: string;
}

export interface CaseFolder {
  id: string;
  name: string;
  caseId: string;
  createdAt: string;
}

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("caseScopedStorage save failed", key, e);
  }
}

export type CaseMemosMap = Record<string, Timeline[]>;
export type CaseFilesMap = Record<string, CaseFile[]>;
export type CaseFoldersMap = Record<string, CaseFolder[]>;

/** mockTimeline에서 사건별 메모만 추출 */
export function getInitialMemosFromMock(mockTimeline: Timeline[]): CaseMemosMap {
  const map: CaseMemosMap = {};
  mockTimeline
    .filter((t) => t.type === "memo")
    .forEach((t) => {
      if (!map[t.caseId]) map[t.caseId] = [];
      map[t.caseId].push({ ...t });
    });
  return map;
}

/** mockTimeline에서 사건별 첨부파일만 추출 (flat) */
export function getInitialFilesFromMock(mockTimeline: Timeline[]): CaseFilesMap {
  const map: CaseFilesMap = {};
  mockTimeline.forEach((t) => {
    if (!t.attachments?.length) return;
    if (!map[t.caseId]) map[t.caseId] = [];
    t.attachments.forEach((a) => {
      map[t.caseId].push({
        id: a.id,
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        url: a.url,
      });
    });
  });
  return map;
}

export function loadCaseMemos(initialFromMock: CaseMemosMap): CaseMemosMap {
  const stored = loadJson<CaseMemosMap>(STORAGE_KEYS.memos, {});
  return { ...initialFromMock, ...stored };
}

export function loadCaseFiles(initialFromMock: CaseFilesMap): CaseFilesMap {
  const stored = loadJson<CaseFilesMap>(STORAGE_KEYS.files, {});
  return { ...initialFromMock, ...stored };
}

export function loadCaseFolders(): CaseFoldersMap {
  return loadJson<CaseFoldersMap>(STORAGE_KEYS.folders, {});
}

export function saveCaseMemos(map: CaseMemosMap) {
  saveJson(STORAGE_KEYS.memos, map);
}

export function saveCaseFiles(map: CaseFilesMap) {
  saveJson(STORAGE_KEYS.files, map);
}

export function saveCaseFolders(map: CaseFoldersMap) {
  saveJson(STORAGE_KEYS.folders, map);
}
