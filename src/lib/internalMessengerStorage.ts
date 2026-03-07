/**
 * 사내 메신저 메시지 저장소 (직원 간 문자·첨부 송수신)
 * localStorage 키: lawygo_internal_messages
 */

import type { InternalMessage } from "@/lib/types";

const STORAGE_KEY = "lawygo_internal_messages";

function loadRaw(): InternalMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return [];
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRaw(items: InternalMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** 내가 보낸 메시지 목록 (최신순) */
export function loadSentMessages(senderId: string): InternalMessage[] {
  return loadRaw()
    .filter((m) => m.senderId === senderId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** 내가 받은 메시지 목록 (최신순) */
export function loadReceivedMessages(recipientId: string): InternalMessage[] {
  return loadRaw()
    .filter((m) => m.recipientId === recipientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/** 메시지 저장 (발송) */
export function saveMessage(message: Omit<InternalMessage, "id" | "createdAt">): InternalMessage {
  const raw = loadRaw();
  const now = new Date().toISOString();
  const newMsg: InternalMessage = {
    ...message,
    id: `im-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: now,
  };
  saveRaw([...raw, newMsg]);
  return newMsg;
}

/** 수신 메시지 읽음 처리 */
export function markAsRead(messageId: string): void {
  const raw = loadRaw();
  const now = new Date().toISOString();
  saveRaw(
    raw.map((m) => (m.id === messageId ? { ...m, readAt: m.readAt ?? now } : m))
  );
}

/** id로 메시지 조회 */
export function getMessageById(id: string): InternalMessage | undefined {
  return loadRaw().find((m) => m.id === id);
}
