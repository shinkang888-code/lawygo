"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileCheck, Plus, Check, X, Clock, ChevronRight, GripVertical,
  FileText, ArrowRight, User, AlertCircle
} from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { mockApprovals, mockStaff } from "@/lib/mockData";
import { cn, formatDate, formatAmount } from "@/lib/utils";
import type { ApprovalDoc, ApprovalStep, StaffMember } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";

const statusConfig = {
  임시저장: { color: "text-slate-500 bg-slate-100", dot: "bg-slate-400" },
  결재요청: { color: "text-primary-700 bg-primary-100", dot: "bg-primary-500" },
  결재중: { color: "text-warning-700 bg-warning-100", dot: "bg-warning-500" },
  결재완료: { color: "text-success-700 bg-success-100", dot: "bg-success-500" },
  반려: { color: "text-danger-700 bg-danger-100", dot: "bg-danger-500" },
};

export default function ApprovalPage() {
  const [approvals, setApprovals] = useState(mockApprovals);
  const [selected, setSelected] = useState<ApprovalDoc | null>(approvals[0] ?? null);
  const [approvalLine, setApprovalLine] = useState<ApprovalStep[]>(
    approvals[0]?.approvalLine ?? []
  );

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "APPROVAL_DRAFT_SUBMIT" && e.data?.payload) {
        const newDoc = e.data.payload as ApprovalDoc;
        setApprovals((prev) => [newDoc, ...prev]);
        setSelected(newDoc);
        setApprovalLine(newDoc.approvalLine);
        toast.success("새 결재 문서가 추가되었습니다.");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(approvalLine);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const reordered = items.map((item, idx) => ({ ...item, order: idx + 1 }));
    setApprovalLine(reordered);
  };

  const handleAddToLine = (staff: StaffMember) => {
    if (approvalLine.find((a) => a.staffId === staff.id)) {
      toast.error("이미 결재선에 추가된 직원입니다.");
      return;
    }
    setApprovalLine((prev) => [
      ...prev,
      {
        order: prev.length + 1,
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role,
        status: "대기",
      },
    ]);
  };

  const handleRemoveFromLine = (staffId: string) => {
    setApprovalLine((prev) =>
      prev.filter((a) => a.staffId !== staffId).map((a, i) => ({ ...a, order: i + 1 }))
    );
  };

  const handleApprove = () => {
    toast.success("결재를 승인했습니다.");
  };

  const handleReject = () => {
    toast.error("결재를 반려했습니다.");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: 기안창 (전자결재함) - 절반 */}
      <aside className="w-1/2 min-w-0 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
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
                  <span className={cn("text-xs font-medium rounded-full px-2 py-0.5 flex-shrink-0 flex items-center gap-1", sc.color)}>
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

              {/* Action buttons */}
              {selected.status === "결재요청" && (
                <div className="flex gap-3 mt-5 pt-5 border-t border-slate-100">
                  <Button
                    variant="success"
                    leftIcon={<Check size={14} />}
                    onClick={handleApprove}
                    className="flex-1"
                  >
                    승인
                  </Button>
                  <Button
                    variant="danger"
                    leftIcon={<X size={14} />}
                    onClick={handleReject}
                  >
                    반려
                  </Button>
                  <Button variant="outline" leftIcon={<AlertCircle size={14} />}>
                    보완 요청
                  </Button>
                </div>
              )}
            </motion.div>

            {/* Approval Line */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                <FileCheck size={16} className="text-primary-600" />
                <h3 className="text-sm font-semibold text-slate-800">결재선 관리</h3>
                <span className="text-xs text-text-muted bg-slate-100 rounded-full px-2 py-0.5">
                  드래그로 순서 변경 가능
                </span>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-2 gap-5">
                  {/* Staff list (left) */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      직원 목록
                    </div>
                    <div className="space-y-1.5">
                      {mockStaff.map((staff) => {
                        const inLine = approvalLine.some((a) => a.staffId === staff.id);
                        return (
                          <div
                            key={staff.id}
                            className={cn(
                              "flex items-center gap-2.5 p-2.5 rounded-lg border transition-all",
                              inLine
                                ? "border-primary-200 bg-primary-50 opacity-50"
                                : "border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50 cursor-pointer"
                            )}
                            onClick={() => !inLine && handleAddToLine(staff)}
                          >
                            <Avatar name={staff.name} size="sm" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-slate-800">{staff.name}</div>
                              <div className="text-xs text-text-muted">{staff.role} · {staff.department}</div>
                            </div>
                            {!inLine && (
                              <ArrowRight size={14} className="text-primary-400 flex-shrink-0" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Approval line (right, DnD) */}
                  <div>
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      결재선 ({approvalLine.length}명)
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="approvalLine">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={cn(
                              "min-h-20 space-y-2 p-3 border-2 border-dashed rounded-xl transition-colors",
                              approvalLine.length === 0
                                ? "border-slate-200 bg-slate-50"
                                : "border-transparent bg-transparent p-0"
                            )}
                          >
                            {approvalLine.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-4 text-text-muted">
                                <User size={20} className="mb-1.5 text-slate-300" />
                                <span className="text-xs">좌측에서 결재자를 클릭하세요</span>
                              </div>
                            )}
                            {approvalLine.map((step, index) => (
                              <Draggable key={step.staffId} draggableId={step.staffId} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={cn(
                                      "flex items-center gap-2.5 p-2.5 bg-white rounded-lg border transition-all",
                                      snapshot.isDragging
                                        ? "shadow-xl border-primary-300 rotate-1"
                                        : "border-slate-200 hover:border-slate-300"
                                    )}
                                  >
                                    <div {...provided.dragHandleProps} className="text-slate-300 hover:text-slate-500 cursor-grab">
                                      <GripVertical size={14} />
                                    </div>
                                    <div className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                                      step.status === "승인" ? "bg-success-100 text-success-700" :
                                      step.status === "반려" ? "bg-danger-100 text-danger-700" :
                                      "bg-slate-100 text-slate-600"
                                    )}>
                                      {step.status === "승인" ? "✓" : step.status === "반려" ? "✗" : step.order}
                                    </div>
                                    <Avatar name={step.staffName} size="sm" />
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-medium text-slate-800">{step.staffName}</div>
                                      <div className="text-xs text-text-muted">{step.role}</div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      {step.status === "승인" && <span className="text-xs text-success-600 font-medium">승인</span>}
                                      {step.status === "반려" && <span className="text-xs text-danger-600 font-medium">반려</span>}
                                      {step.status === "대기" && <Clock size={12} className="text-slate-400" />}
                                      <button
                                        onClick={() => handleRemoveFromLine(step.staffId)}
                                        className="text-slate-300 hover:text-danger-500 transition-colors"
                                      >
                                        <X size={13} />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>

                    {approvalLine.length > 0 && (
                      <Button
                        className="w-full mt-3"
                        leftIcon={<FileCheck size={14} />}
                        onClick={() => toast.success("결재 요청을 전송했습니다.")}
                      >
                        결재 요청
                      </Button>
                    )}
                  </div>
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
    </div>
  );
}
