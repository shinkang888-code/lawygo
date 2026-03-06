"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MessageSquare, FileText, DollarSign, GitBranch,
  Paperclip, Send, Scale, Sparkles, X,
  FileIcon, Download, Eye, AlertCircle, MoreVertical, Trash2, Edit
} from "lucide-react";
import { mockCases, mockTimeline } from "@/lib/mockData";
import { cn, formatDate, getDDay, formatAmount, formatFileSize } from "@/lib/utils";
import { StatusBadge, DDayBadge, ElectronicBadge, ImmutableBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { StaffChips } from "@/components/cases/StaffChips";
import { ConfirmDeleteModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";
import type { Timeline } from "@/lib/types";

type TabId = "timeline" | "dates" | "documents" | "finance";

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "timeline", label: "타임라인", icon: <GitBranch size={14} /> },
  { id: "dates", label: "기일 목록", icon: <Scale size={14} /> },
  { id: "documents", label: "문서함", icon: <FileIcon size={14} /> },
  { id: "finance", label: "수임료", icon: <DollarSign size={14} /> },
];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const caseItem = mockCases.find((c) => c.id === id) ?? mockCases[0];
  const timeline = mockTimeline.filter((t) => t.caseId === caseItem.id);

  const [activeTab, setActiveTab] = useState<TabId>("timeline");
  const [memoText, setMemoText] = useState("");
  const [memoFocused, setMemoFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<"ai" | "doc" | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dday = caseItem.nextDate ? getDDay(caseItem.nextDate) : null;

  const handleMemoSubmit = () => {
    if (!memoText.trim()) return;
    toast.success("메모가 저장되었습니다.");
    setMemoText("");
    setMemoFocused(false);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    toast.success(`${files[0].name} 파일 업로드가 시작됩니다.`);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Case Context Pane ── */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-slate-200 bg-white overflow-y-auto">
        <div className="p-5 space-y-5">
          {/* Back */}
          <Link href="/cases" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-600 transition-colors">
            <ArrowLeft size={13} /> 사건 목록
          </Link>

          {/* Title */}
          <div>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {caseItem.isElectronic && <ElectronicBadge />}
              {caseItem.isImmutable && <ImmutableBadge />}
              <StatusBadge status={caseItem.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{caseItem.caseNumber}</h1>
            <p className="text-sm text-slate-600 mt-0.5 leading-snug">{caseItem.caseName}</p>
          </div>

          {/* Next Deadline */}
          {caseItem.nextDate && (
            <div className={cn(
              "rounded-xl p-3.5 border",
              dday !== null && dday <= 0 ? "bg-danger-50 border-danger-200 danger-pulse" :
              dday !== null && dday <= 3 ? "bg-warning-50 border-warning-200" :
              "bg-primary-50 border-primary-200"
            )}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-text-muted">다음 기일</span>
                {dday !== null && <DDayBadge dday={dday} />}
              </div>
              <div className="text-base font-bold text-slate-900">{formatDate(caseItem.nextDate)}</div>
              <div className="text-xs text-slate-600 mt-0.5">{caseItem.nextDateType}</div>
            </div>
          )}

          {/* Info */}
          <div className="space-y-3">
            <SectionTitle>당사자 정보</SectionTitle>
            <InfoItem icon="👤" label="의뢰인" value={`${caseItem.clientName} (${caseItem.clientPosition})`} />
            <InfoItem icon="⚔️" label="상대방" value={caseItem.opponentName} />
            <InfoItem icon="🏛️" label="법원" value={caseItem.court} />

            <SectionTitle>수임 정보</SectionTitle>
            <InfoItem icon="📅" label="수임일" value={formatDate(caseItem.receivedDate)} />
            <InfoItem icon="⚖️" label="담당" value={caseItem.assignedStaff} />
            <div>
              <div className="text-xs text-text-muted mb-1.5">담당 직원</div>
              <StaffChips staffStr={caseItem.assistants} max={4} />
            </div>

            <SectionTitle>수임료 현황</SectionTitle>
            <FinanceItem label="수임료" value={formatAmount(caseItem.amount)} />
            <FinanceItem label="수납액" value={formatAmount(caseItem.receivedAmount)} positive />
            {caseItem.pendingAmount > 0 && (
              <FinanceItem label="미수금" value={formatAmount(caseItem.pendingAmount)} danger />
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">

        {/* Top toolbar with tabs */}
        <div className="bg-white border-b border-slate-200 flex-shrink-0">
          {/* Mobile breadcrumb */}
          <div className="lg:hidden flex items-center gap-2 px-4 pt-3 pb-1">
            <Link href="/cases" className="flex items-center gap-1 text-xs text-text-muted hover:text-primary-600">
              <ArrowLeft size={12} /> 목록
            </Link>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-medium text-slate-700 truncate">{caseItem.caseNumber}</span>
          </div>

          {/* Case title row */}
          <div className="flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-slate-900">{caseItem.caseNumber}</span>
                  {caseItem.isElectronic && <ElectronicBadge />}
                </div>
                <div className="text-xs text-text-muted truncate">{caseItem.caseName} · {caseItem.court}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                variant={drawerOpen === "ai" ? "primary" : "outline"}
                size="sm"
                leftIcon={<Sparkles size={13} />}
                onClick={() => setDrawerOpen(drawerOpen === "ai" ? null : "ai")}
                className="hidden sm:flex"
              >
                AI 요약
              </Button>
              <Button
                variant={drawerOpen === "doc" ? "primary" : "outline"}
                size="sm"
                leftIcon={<FileText size={13} />}
                onClick={() => setDrawerOpen(drawerOpen === "doc" ? null : "doc")}
                className="hidden sm:flex"
              >
                문서함
              </Button>
              {/* More menu */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 w-44 overflow-hidden"
                    >
                      <Link href={`/cases/${caseItem.id}/edit`} className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50" onClick={() => setMenuOpen(false)}>
                        <Edit size={14} /> 사건 수정
                      </Link>
                      <button
                        className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-danger-600 hover:bg-danger-50 w-full text-left"
                        onClick={() => { setDeleteModalOpen(true); setMenuOpen(false); }}
                      >
                        <Trash2 size={14} /> 사건 삭제
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-t border-slate-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                  activeTab === tab.id
                    ? "text-primary-600 border-primary-600"
                    : "text-text-muted border-transparent hover:text-slate-700 hover:border-slate-300"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="h-full"
            >
              {activeTab === "timeline" && (
                <TimelineTab
                  timeline={timeline}
                  memoText={memoText}
                  setMemoText={setMemoText}
                  memoFocused={memoFocused}
                  setMemoFocused={setMemoFocused}
                  isDragOver={isDragOver}
                  setIsDragOver={setIsDragOver}
                  fileInputRef={fileInputRef}
                  handleMemoSubmit={handleMemoSubmit}
                  handleFileDrop={handleFileDrop}
                />
              )}
              {activeTab === "dates" && <DatesTab caseItem={caseItem} />}
              {activeTab === "documents" && <DocumentsTab timeline={timeline} />}
              {activeTab === "finance" && <FinanceTab caseItem={caseItem} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Right: Smart Drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="flex-shrink-0 border-l border-slate-200 bg-white overflow-hidden hidden lg:flex"
          >
            <div className="w-80 h-full flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">
                  {drawerOpen === "ai" ? "AI 사건 요약" : "문서함"}
                </span>
                <button onClick={() => setDrawerOpen(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {drawerOpen === "ai" ? <AIDrawer caseItem={caseItem} /> : <DocDrawer timeline={timeline} />}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <ConfirmDeleteModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => toast.error(`사건 ${caseItem.caseNumber}이 삭제되었습니다.`)}
        caseNumber={caseItem.caseNumber}
        title={`"${caseItem.caseName}" 사건을 삭제하시겠습니까?`}
      />
    </div>
  );
}

/* ────────────── Tab Components ────────────── */

function TimelineTab({
  timeline, memoText, setMemoText, memoFocused, setMemoFocused,
  isDragOver, setIsDragOver, fileInputRef, handleMemoSubmit, handleFileDrop
}: {
  timeline: Timeline[];
  memoText: string; setMemoText: (v: string) => void;
  memoFocused: boolean; setMemoFocused: (v: boolean) => void;
  isDragOver: boolean; setIsDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleMemoSubmit: () => void;
  handleFileDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-5 py-5 space-y-5">
      {/* Quick Input */}
      <div
        className={cn(
          "bg-white rounded-2xl border transition-all duration-200",
          memoFocused ? "border-primary-300 shadow-primary-glow" : "border-slate-200 shadow-card",
          isDragOver && "border-primary-400 bg-primary-50"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleFileDrop}
      >
        <div className="p-4">
          <div className="flex gap-3">
            <Avatar name="김민준" size="md" />
            <div className="flex-1">
              <textarea
                value={memoText}
                onChange={(e) => setMemoText(e.target.value)}
                onFocus={() => setMemoFocused(true)}
                onBlur={() => !memoText && setMemoFocused(false)}
                placeholder="메모를 입력하거나 파일을 드래그해서 업로드하세요..."
                rows={memoFocused ? 3 : 1}
                className="w-full resize-none text-sm text-slate-800 placeholder:text-slate-400 bg-transparent outline-none transition-all duration-200 leading-relaxed"
              />
            </div>
          </div>
          <AnimatePresence>
            {memoFocused && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100 overflow-hidden"
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-primary-600 transition-colors"
                >
                  <Paperclip size={13} /> 파일 첨부
                </button>
                <input ref={fileInputRef} type="file" multiple hidden />
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => { setMemoFocused(false); setMemoText(""); }}>취소</Button>
                  <Button size="sm" leftIcon={<Send size={12} />} disabled={!memoText.trim()} onClick={handleMemoSubmit}>저장</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Timeline feed */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent" />
        <div className="space-y-4">
          {timeline.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DatesTab({ caseItem }: { caseItem: (typeof mockCases)[0] }) {
  const mockDates = [
    { date: caseItem.nextDate ?? "2026-03-05", type: caseItem.nextDateType || "기일", court: caseItem.court, status: "예정" },
    { date: "2026-01-20", type: "변론기일", court: caseItem.court, status: "완료" },
    { date: "2025-12-05", type: "준비기일", court: caseItem.court, status: "완료" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">기일 목록</h3>
        <Button size="sm" variant="outline" leftIcon={<Scale size={13} />}>기일 추가</Button>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 text-xs text-text-muted font-medium border-b border-slate-100">
              <th className="text-left px-4 py-3">기일</th>
              <th className="text-left px-4 py-3">종류</th>
              <th className="text-left px-4 py-3">법원</th>
              <th className="text-left px-4 py-3">D-Day</th>
              <th className="text-left px-4 py-3">상태</th>
            </tr>
          </thead>
          <tbody>
            {mockDates.map((d, i) => {
              const dday = getDDay(d.date);
              return (
                <tr key={i} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800 tabular-nums">{formatDate(d.date)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.type}</td>
                  <td className="px-4 py-3 text-xs text-text-muted">{d.court}</td>
                  <td className="px-4 py-3">
                    {d.status === "예정" && <DDayBadge dday={dday} />}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs font-medium rounded-full px-2 py-0.5",
                      d.status === "완료" ? "bg-success-100 text-success-700" : "bg-primary-100 text-primary-700"
                    )}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DocumentsTab({ timeline }: { timeline: Timeline[] }) {
  const allFiles = timeline.flatMap((t) => t.attachments ?? []);

  return (
    <div className="max-w-2xl mx-auto px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-800">문서함 ({allFiles.length}개)</h3>
        <Button size="sm" variant="outline" leftIcon={<Paperclip size={13} />}>파일 업로드</Button>
      </div>
      <div className="space-y-2">
        {allFiles.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <FileIcon size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm">등록된 문서가 없습니다.</p>
          </div>
        ) : (
          allFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-card hover:shadow-card-hover transition-all group">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0",
                file.mimeType.includes("pdf") ? "bg-danger-100 text-danger-700" :
                file.mimeType.includes("excel") ? "bg-success-100 text-success-700" :
                "bg-primary-100 text-primary-700"
              )}>
                {file.mimeType.includes("pdf") ? "PDF" : file.mimeType.includes("excel") ? "XLS" : "FILE"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{file.fileName}</div>
                <div className="text-xs text-text-muted">{formatFileSize(file.fileSize)}</div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button className="p-1.5 hover:bg-slate-100 rounded-lg"><Eye size={14} className="text-slate-500" /></button>
                <button className="p-1.5 hover:bg-slate-100 rounded-lg"><Download size={14} className="text-slate-500" /></button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FinanceTab({ caseItem }: { caseItem: (typeof mockCases)[0] }) {
  return (
    <div className="max-w-2xl mx-auto px-5 py-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">수임료 현황</h3>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        {/* Progress bar */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-slate-700">수납 진행률</span>
            <span className="font-bold text-slate-900">
              {Math.round((caseItem.receivedAmount / caseItem.amount) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(caseItem.receivedAmount / caseItem.amount) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="h-full bg-success-500 rounded-full"
            />
          </div>
        </div>
        <div className="p-5 space-y-3">
          {[
            { label: "총 수임료", value: formatAmount(caseItem.amount), color: "text-slate-900" },
            { label: "수납 완료액", value: formatAmount(caseItem.receivedAmount), color: "text-success-700" },
            { label: "미수금", value: formatAmount(caseItem.pendingAmount), color: caseItem.pendingAmount > 0 ? "text-danger-700" : "text-success-600" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm text-text-muted">{row.label}</span>
              <span className={cn("text-sm font-bold tabular-nums", row.color)}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      {caseItem.pendingAmount > 0 && (
        <div className="bg-danger-50 border border-danger-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-danger-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-danger-800">미수금 {formatAmount(caseItem.pendingAmount)} 미처리</div>
            <p className="text-xs text-danger-600 mt-0.5">의뢰인에게 납부 안내를 발송하시겠습니까?</p>
            <div className="flex gap-2 mt-2">
              <Button size="xs" variant="danger" onClick={() => toast.success("납부 안내 문자가 발송되었습니다.")}>
                문자 발송
              </Button>
              <Button size="xs" variant="outline" onClick={() => toast.success("회계 담당자에게 알림이 전송되었습니다.")}>
                담당자 알림
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ item }: { item: Timeline }) {
  const typeConfig = {
    memo: { icon: <MessageSquare size={14} />, color: "bg-primary-100 text-primary-600", label: "메모" },
    court_update: { icon: <Scale size={14} />, color: "bg-emerald-100 text-emerald-600", label: "법원 업데이트" },
    document: { icon: <FileIcon size={14} />, color: "bg-violet-100 text-violet-600", label: "문서" },
    finance: { icon: <DollarSign size={14} />, color: "bg-warning-100 text-warning-600", label: "수납/재무" },
    status_change: { icon: <GitBranch size={14} />, color: "bg-slate-100 text-slate-600", label: "상태 변경" },
  };
  const config = typeConfig[item.type];

  return (
    <div className="flex gap-4 group">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10 ring-4 ring-background", config.color)}>
        {config.icon}
      </div>
      <div className="flex-1 bg-white rounded-xl border border-slate-100 p-4 shadow-card mb-1 transition-all duration-200 hover:shadow-card-hover">
        <div className="flex items-start justify-between mb-2">
          <div>
            <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md", config.color)}>{config.label}</span>
            <h4 className="text-sm font-semibold text-slate-800 mt-1.5">{item.title}</h4>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <Avatar name={item.authorName} size="sm" />
            <div className="text-xs text-text-muted mt-1">{formatDate(item.date, "time")}</div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">{item.content}</p>

        {item.attachments && item.attachments.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {item.attachments.map((file) => (
              <div key={file.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer group/file">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0",
                  file.mimeType.includes("pdf") ? "bg-danger-100 text-danger-600" :
                  file.mimeType.includes("excel") ? "bg-success-100 text-success-600" :
                  "bg-primary-100 text-primary-600"
                )}>
                  {file.mimeType.includes("pdf") ? "PDF" : "XLS"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 truncate">{file.fileName}</div>
                  <div className="text-xs text-text-muted">{formatFileSize(file.fileSize)}</div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover/file:opacity-100 transition-opacity">
                  <button className="p-1 hover:bg-slate-200 rounded"><Eye size={13} className="text-slate-500" /></button>
                  <button className="p-1 hover:bg-slate-200 rounded"><Download size={13} className="text-slate-500" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {item.type === "finance" && item.metadata?.amount && (
          <div className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-success-600 bg-success-50 rounded-lg px-2.5 py-1">
            <DollarSign size={13} />
            +{formatAmount(Number(item.metadata.amount))}
          </div>
        )}

        <div className="flex items-center gap-1 mt-2.5 text-xs text-text-muted">
          <Avatar name={item.authorName} size="xs" />
          {item.authorName}
        </div>
      </div>
    </div>
  );
}

function AIDrawer({ caseItem }: { caseItem: (typeof mockCases)[0] }) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-primary-50 to-violet-50 rounded-xl p-4 border border-primary-100">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-primary-600" />
          <span className="text-sm font-semibold text-primary-800">AI 사건 요약</span>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">
          {caseItem.caseName} 사건으로 현재 진행 중입니다.
          {caseItem.nextDate && ` ${formatDate(caseItem.nextDate)} ${caseItem.nextDateType}이 예정되어 있습니다.`}
          {caseItem.pendingAmount > 0 && ` 미수금 ${formatAmount(caseItem.pendingAmount)} 처리가 필요합니다.`}
        </p>
      </div>
      <div className="space-y-2">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">주요 이슈</div>
        {caseItem.nextDate && getDDay(caseItem.nextDate) <= 3 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium text-danger-600 bg-danger-50 border-danger-200">
            <AlertCircle size={13} /> 기일 임박 — {caseItem.nextDateType} D-{getDDay(caseItem.nextDate)}
          </div>
        )}
        {caseItem.pendingAmount > 0 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium text-warning-600 bg-warning-50 border-warning-200">
            <DollarSign size={13} /> 미수금 {formatAmount(caseItem.pendingAmount)} 미처리
          </div>
        )}
        {caseItem.isElectronic && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium text-violet-600 bg-violet-50 border-violet-200">
            <Scale size={13} /> 전자사건 — 전자제출 시스템 확인 필요
          </div>
        )}
      </div>
    </div>
  );
}

function DocDrawer({ timeline }: { timeline: Timeline[] }) {
  const allFiles = timeline.flatMap((t) => t.attachments ?? []);
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">문서 {allFiles.length}개</div>
      {allFiles.map((file) => (
        <div key={file.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold", file.mimeType.includes("pdf") ? "bg-danger-100 text-danger-600" : "bg-success-100 text-success-600")}>
            {file.mimeType.includes("pdf") ? "PDF" : "XLS"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-700 truncate">{file.fileName}</div>
            <div className="text-xs text-text-muted">{formatFileSize(file.fileSize)}</div>
          </div>
          <Download size={14} className="text-slate-400 hover:text-primary-600 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pt-1 border-t border-slate-100">{children}</div>;
}
function InfoItem({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div>
        <div className="text-xs text-text-muted">{label}</div>
        <div className="text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  );
}
function FinanceItem({ label, value, positive, danger }: { label: string; value: string; positive?: boolean; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={cn("font-semibold tabular-nums", positive ? "text-success-600" : danger ? "text-danger-600" : "text-slate-800")}>{value}</span>
    </div>
  );
}
