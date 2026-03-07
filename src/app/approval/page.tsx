"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  FileCheck, Plus, Check, X, FileText, Download, Send, ExternalLink, RotateCcw
} from "lucide-react";
import { mockApprovals } from "@/lib/mockData";
import { cn, formatDate, formatAmount } from "@/lib/utils";
import type { ApprovalDoc, ApprovalStep, Notification } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";

const PENDING_NOTIFICATIONS_KEY = "lawygo:pending-notifications";
const CURRENT_USER_ID_KEY = "lawygo:userId";

function getCurrentUserId(): string {
  if (typeof window === "undefined") return "s4";
  return localStorage.getItem(CURRENT_USER_ID_KEY) || "s4";
}

const statusConfig = {
  임시저장: { color: "text-slate-500 bg-slate-100", dot: "bg-slate-400" },
  결재요청: { color: "text-primary-700 bg-primary-100", dot: "bg-primary-500" },
  결재중: { color: "text-warning-700 bg-warning-100", dot: "bg-warning-500" },
  결재완료: { color: "text-success-700 bg-success-100", dot: "bg-success-500" },
  반려: { color: "text-danger-700 bg-danger-100", dot: "bg-danger-500" },
};

export default function ApprovalPage() {
  const searchParams = useSearchParams();
  const docIdFromUrl = searchParams.get("doc");

  const [approvals, setApprovals] = useState(mockApprovals);
  const [selected, setSelected] = useState<ApprovalDoc | null>(approvals[0] ?? null);
  const [approvalLine, setApprovalLine] = useState<ApprovalStep[]>(
    approvals[0]?.approvalLine ?? []
  );
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageToDrafter, setMessageToDrafter] = useState("");

  const currentUserId = typeof window !== "undefined" ? getCurrentUserId() : "s4";
  const approvalsRef = useRef(approvals);
  useEffect(() => {
    approvalsRef.current = approvals;
  }, [approvals]);

  useEffect(() => {
    if (!docIdFromUrl) return;
    const doc = approvals.find((a) => a.id === docIdFromUrl);
    if (doc) {
      setSelected(doc);
      setApprovalLine(doc.approvalLine);
    }
  }, [docIdFromUrl, approvals]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "APPROVAL_DRAFT_SUBMIT" && e.data?.payload) {
        const newDoc = e.data.payload as ApprovalDoc;
        setApprovals((prev) => [newDoc, ...prev]);
        setSelected(newDoc);
        setApprovalLine(newDoc.approvalLine);

        const notifications: Notification[] = newDoc.approvalLine.map((step, i) => ({
          id: `n-${newDoc.id}-${step.staffId}-${i}-${Date.now()}`,
          type: "approval_request",
          title: "결재 요청",
          message: `${newDoc.requesterName}님이 "${newDoc.title}" 결재를 요청했습니다.`,
          isRead: false,
          createdAt: new Date().toISOString(),
          link: `/approval?doc=${newDoc.id}`,
          approvalDocId: newDoc.id,
        }));

        try {
          const pending = JSON.parse(localStorage.getItem(PENDING_NOTIFICATIONS_KEY) || "[]") as Notification[];
          localStorage.setItem(PENDING_NOTIFICATIONS_KEY, JSON.stringify([...notifications, ...pending]));
        } catch {}
        window.dispatchEvent(new CustomEvent("lawygo:add-notifications", { detail: notifications }));

        toast.success("새 결재 문서가 추가되었습니다. 결재자에게 알림이 발송됩니다.");
      }
      if (e.data?.type === "APPROVAL_REJECT" && e.data?.payload?.docId) {
        const { docId: id } = e.data.payload as { docId: string };
        const doc = approvalsRef.current.find((a) => a.id === id);
        if (doc) {
          const now = new Date().toISOString();
          const nextLine: ApprovalStep[] = doc.approvalLine.map((s) =>
            s.staffId === currentUserId ? { ...s, status: "반려" as const, signedAt: now } : s
          );
          const updated: ApprovalDoc = {
            ...doc,
            approvalLine: nextLine,
            status: "반려",
            completedAt: now,
          };
          setApprovals((prev) => prev.map((d) => (d.id === id ? updated : d)));
          setSelected(updated);
          setApprovalLine(updated.approvalLine);
          toast.error("결재를 반려했습니다.");
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [approvals]);

  const openDraftWindow = () => {
    const w = 520;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      "/approval/draft",
      "approval-draft",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`
    );
  };

  const myStep = useMemo(
    () => selected?.approvalLine.find((s) => s.staffId === currentUserId),
    [selected, currentUserId]
  );
  const canAct = selected?.status === "결재요청" && myStep?.status === "대기";
  const canRevert =
    selected &&
    (myStep?.status === "승인" || myStep?.status === "반려") &&
    (selected.status === "결재완료" || selected.status === "반려" || selected.status === "결재중");

  const openNewWindowPreview = () => {
    if (!selected) return;
    const title = selected.title;
    const attachmentLabel = secondAttachmentName ?? "첨부.pdf";
    const body = selected.notes
      ? selected.notes
      : `[첨부: ${attachmentLabel}]\n\n실제 파일은 서버에 저장된 문서로 조회됩니다.`;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body style="font-family: sans-serif; padding: 1.5rem; max-width: 48rem; margin: 0 auto;"><h1 style="font-size: 1.25rem;">${title}</h1><pre style="white-space: pre-wrap; background: #f8fafc; padding: 1rem; border-radius: 0.5rem;">${body.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const handleApprove = () => {
    if (!selected) return;
    const now = new Date().toISOString();
    const nextLine: ApprovalStep[] = selected.approvalLine.map((s) =>
      s.staffId === currentUserId ? { ...s, status: "승인" as const, signedAt: now } : s
    );
    const allApproved = nextLine.every((s) => s.status === "승인");
    const anyRejected = nextLine.some((s) => s.status === "반려");
    const nextStatus: ApprovalDoc["status"] = anyRejected ? "반려" : allApproved ? "결재완료" : "결재중";

    const updated: ApprovalDoc = {
      ...selected,
      approvalLine: nextLine,
      status: nextStatus,
      ...(allApproved || anyRejected ? { completedAt: now } : {}),
    };
    setApprovals((prev) => prev.map((d) => (d.id === selected.id ? updated : d)));
    setSelected(updated);
    setApprovalLine(updated.approvalLine);
    toast.success("결재를 승인했습니다.");
  };

  const openRejectPopup = () => {
    if (!selected) return;
    const params = new URLSearchParams({
      doc: selected.id,
      requesterId: selected.requesterId,
      requesterName: selected.requesterName,
      senderId: currentUserId,
    });
    const w = 440;
    const h = 420;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      `/approval/reject?${params.toString()}`,
      "approval-reject",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  const handleRevert = () => {
    if (!selected || !myStep) return;
    const nextLine: ApprovalStep[] = selected.approvalLine.map((s) =>
      s.staffId === currentUserId ? { ...s, status: "대기" as const, signedAt: undefined } : s
    );
    const allWaiting = nextLine.every((s) => s.status === "대기");
    const anyRejected = nextLine.some((s) => s.status === "반려");
    const nextStatus: ApprovalDoc["status"] = allWaiting ? "결재요청" : anyRejected ? "반려" : "결재중";
    const updated: ApprovalDoc = {
      ...selected,
      approvalLine: nextLine,
      status: nextStatus,
      ...(nextStatus === "결재요청" || nextStatus === "결재중" ? { completedAt: undefined } : {}),
    };
    setApprovals((prev) => prev.map((d) => (d.id === selected.id ? updated : d)));
    setSelected(updated);
    setApprovalLine(updated.approvalLine);
    toast.success("결재를 대기 상태로 되돌렸습니다.");
  };

  const handleSendMessage = () => {
    const msg = messageToDrafter.trim();
    if (!msg) {
      toast.error("메시지 내용을 입력하세요.");
      return;
    }
    toast.success("기안자에게 수정·보완 요청 메시지를 발송했습니다.", {
      description: `${selected?.requesterName}님에게 전달됩니다.`,
    });
    setMessageToDrafter("");
    setMessageModalOpen(false);
  };

  const secondAttachmentName = selected?.attachmentNames?.[1] ?? selected?.attachmentNames?.[0];
  const handleDownloadAttachment = () => {
    const name = secondAttachmentName || "제출문서.pdf";
    const content = selected?.notes
      ? `[결재 문서]\n${selected.title}\n\n${selected.notes}`
      : `[결재 문서] ${selected?.title}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name.endsWith(".pdf") ? name : `${name.replace(/\.[^.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("첨부파일을 다운로드했습니다.");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: 기안창 (전자결재함) - 절반 */}
      <aside className="w-1/2 min-w-0 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">전자결재함</h2>
            <p className="text-xs text-text-muted mt-0.5">대기 {approvals.length}건</p>
          </div>
          <Button size="sm" leftIcon={<Plus size={13} />} onClick={openDraftWindow}>
            기안
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 text-xs font-medium">
          {["결재요청", "결재중", "완료"].map((tab) => (
            <button
              key={tab}
              className={cn(
                "flex-1 py-2.5 transition-colors",
                tab === "결재요청"
                  ? "text-primary-600 border-b-2 border-primary-600"
                  : "text-text-muted hover:text-slate-700"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
          {approvals.map((ap) => {
            const sc = statusConfig[ap.status];
            return (
              <div
                key={ap.id}
                onClick={() => { setSelected(ap); setApprovalLine(ap.approvalLine); }}
                className={cn(
                  "px-4 py-3 cursor-pointer transition-colors",
                  selected?.id === ap.id
                    ? "bg-primary-50 border-l-2 border-primary-600"
                    : "hover:bg-slate-50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{ap.title}</div>
                    <div className="text-xs text-text-muted mt-0.5">{ap.caseNumber}</div>
                  </div>
                  <span className={cn("text-xs font-medium rounded-full px-2 py-0.5 shrink-0 flex items-center gap-1", sc.color)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", sc.dot)} />
                    {ap.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar name={ap.requesterName} size="xs" />
                  <span className="text-xs text-text-muted">{ap.requesterName} · {formatDate(ap.createdAt)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* Right: 결재 문서 상세 - 절반 */}
      {selected ? (
        <main className="w-1/2 min-w-0 overflow-y-auto bg-background flex flex-col">
          <div className="max-w-3xl mx-auto p-6 space-y-6">
            {/* Header */}
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-card p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5 font-medium">
                      {selected.type}
                    </span>
                    <span className={cn("text-xs font-medium rounded-full px-2 py-0.5 flex items-center gap-1", statusConfig[selected.status].color)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig[selected.status].dot)} />
                      {selected.status}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">{selected.title}</h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-text-muted">
                    <span>{selected.caseNumber}</span>
                    <span>·</span>
                    <span>{formatDate(selected.createdAt)} 기안</span>
                  </div>
                </div>
                {selected.amount && (
                  <div className="text-right">
                    <div className="text-xs text-text-muted mb-1">금액</div>
                    <div className="text-xl font-bold text-slate-900 tabular-nums">
                      {formatAmount(selected.amount)}
                    </div>
                  </div>
                )}
              </div>

              {selected.notes && (
                <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                  {selected.notes}
                </div>
              )}

              {selected.status === "결재요청" && !canAct && myStep?.status !== "대기" && (
                <p className="text-sm text-text-muted mt-5 pt-5 border-t border-slate-100">
                  다른 결재자가 처리할 때까지 대기 중입니다.
                </p>
              )}
            </motion.div>

            {/* 결재확인: 제출 문서 미리보기 + 다운로드 + 결재/반려/메시지발송 */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileCheck size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-800">결재확인</h3>
              </div>

              <div className="p-5 space-y-4">
                {/* 두 번째 첨부파일 미리보기 */}
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    제출된 문서 미리보기 {secondAttachmentName && `· ${secondAttachmentName}`}
                  </div>
                  <div className="border border-slate-200 rounded-xl bg-slate-50/50 overflow-hidden">
                    <div className="max-h-[280px] overflow-y-auto p-4 text-sm text-slate-700 whitespace-pre-wrap">
                      {selected.notes
                        ? selected.notes
                        : secondAttachmentName
                          ? `[첨부: ${secondAttachmentName}]\n\n실제 파일은 서버에 저장된 문서로 조회됩니다.`
                          : "첨부된 문서가 없습니다. 기안 내용은 상단 요약에서 확인할 수 있습니다."}
                    </div>
                    <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between">
                      <span className="text-xs text-text-muted">
                        두 번째 첨부파일로 제출된 문서
                        {secondAttachmentName && ` (${secondAttachmentName})`}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        leftIcon={<Download size={12} />}
                        onClick={handleDownloadAttachment}
                      >
                        다운로드
                      </Button>
                    </div>
                  </div>
                </div>

                {/* 하단: 새창보기 / 승인 / 반려 / 취소 / 메시지발송 */}
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<ExternalLink size={14} />}
                    onClick={openNewWindowPreview}
                  >
                    새창보기
                  </Button>
                  {canAct && (
                    <>
                      <Button
                        type="button"
                        variant="success"
                        size="sm"
                        leftIcon={<Check size={14} />}
                        onClick={handleApprove}
                      >
                        승인
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        leftIcon={<X size={14} />}
                        onClick={openRejectPopup}
                      >
                        반려
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Send size={14} />}
                        onClick={() => setMessageModalOpen(true)}
                      >
                        메시지발송
                      </Button>
                    </>
                  )}
                  {canRevert && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<RotateCcw size={14} />}
                      onClick={handleRevert}
                      className="text-warning-600 border-warning-200 hover:bg-warning-50"
                    >
                      취소
                    </Button>
                  )}
                  {selected.status !== "결재요청" && !canRevert && (
                    <p className="text-xs text-text-muted">
                      {selected.status === "결재완료" && "결재가 완료되었습니다."}
                      {selected.status === "반려" && "반려된 문서입니다."}
                      {selected.status === "결재중" && "다른 결재자가 처리할 때까지 대기 중입니다."}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-text-muted">
            <FileText size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">결재 문서를 선택하세요</p>
          </div>
        </div>
      )}

      {/* 메시지발송 모달: 기안자에게 수정·보완 요청 */}
      {messageModalOpen && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">메시지 발송</h3>
              <p className="text-xs text-text-muted mt-0.5">
                기안자({selected.requesterName})에게 수정·보완 요청 메시지를 보냅니다.
              </p>
            </div>
            <div className="p-5">
              <textarea
                value={messageToDrafter}
                onChange={(e) => setMessageToDrafter(e.target.value)}
                placeholder="수정·보완이 필요한 내용을 입력하세요. 예: 2차 착수금 산정 근거 서류를 보완해 주세요."
                rows={4}
                className={cn(
                  "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none",
                  "focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                )}
              />
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setMessageModalOpen(false); setMessageToDrafter(""); }}
              >
                취소
              </Button>
              <Button
                type="button"
                className="flex-1"
                leftIcon={<Send size={14} />}
                onClick={handleSendMessage}
              >
                발송
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
