"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Download,
  LayoutGrid,
  List,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  MessageSquare,
  FileIcon,
  Eye,
  Trash2,
  FolderPlus,
  Upload,
} from "lucide-react";
import { mockCases, mockTimeline } from "@/lib/mockData";
import { cn, formatDate, getDDay, formatAmount } from "@/lib/utils";
import type { CaseItem, FilterConfig, SortConfig, Timeline, TimelineAttachment } from "@/lib/types";
import { StatusBadge, DDayBadge, ElectronicBadge, ImmutableBadge } from "@/components/ui/badge";
import { StaffChips } from "@/components/cases/StaffChips";
import { FilterTray } from "@/components/cases/FilterTray";
import { CaseDrawer } from "@/components/cases/CaseDrawer";
import { Button } from "@/components/ui/button";
import { CaseRowSkeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "@/components/ui/toast";

const columns: { key: keyof CaseItem; label: string; width?: string; sortable?: boolean }[] = [
  { key: "caseNumber", label: "사건번호", width: "140px", sortable: true },
  { key: "caseType", label: "종류", width: "60px" },
  { key: "caseName", label: "사건명", sortable: true },
  { key: "court", label: "법원", width: "160px" },
  { key: "clientName", label: "의뢰인", width: "100px", sortable: true },
  { key: "clientPosition", label: "지위", width: "70px" },
  { key: "assignedStaff", label: "담당", width: "80px" },
  { key: "assistants", label: "보조", width: "160px" },
  { key: "nextDate", label: "다음 기일", width: "110px", sortable: true },
  { key: "status", label: "상태", width: "80px" },
  { key: "pendingAmount", label: "미수금", width: "110px", sortable: true },
];

export default function CasesPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [staffSearch, setStaffSearch] = useState("");

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);
  const [filters, setFilters] = useState<FilterConfig[]>([]);
  const [sort, setSort] = useState<SortConfig>({ field: "nextDate", direction: "asc" });
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [isLoading] = useState(false);

  const filtered = useMemo(() => {
    let result = [...mockCases];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.caseNumber.toLowerCase().includes(q) ||
          c.caseName.toLowerCase().includes(q) ||
          c.clientName.toLowerCase().includes(q) ||
          c.court.toLowerCase().includes(q)
      );
    }

    filters.forEach((f) => {
      result = result.filter((c) => {
        const val = c[f.field];
        if (f.operator === "equals") return String(val) === String(f.value);
        if (f.operator === "contains") return String(val).includes(String(f.value));
        return true;
      });
    });

    if (staffSearch.trim()) {
      const q = staffSearch.trim().toLowerCase();
      result = result.filter((c) => {
        const main = c.assignedStaff?.toLowerCase() ?? "";
        const assistants = (c.assistants ?? "").toLowerCase();
        return main.includes(q) || assistants.includes(q);
      });
    }

    result.sort((a, b) => {
      const av = a[sort.field] ?? "";
      const bv = b[sort.field] ?? "";
      const cmp = String(av).localeCompare(String(bv), "ko");
      return sort.direction === "asc" ? cmp : -cmp;
    });

    return result;
  }, [search, filters, sort]);

  const toggleSort = (field: keyof CaseItem) => {
    setSort((prev) =>
      prev.field === field
        ? { field, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { field, direction: "asc" }
    );
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllRows = () => {
    if (selectedRows.size === filtered.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(filtered.map((c) => c.id)));
    }
  };

  const SortIcon = ({ field }: { field: keyof CaseItem }) => {
    if (sort.field !== field) return <ChevronsUpDown size={12} className="text-slate-300" />;
    return sort.direction === "asc"
      ? <ChevronUp size={12} className="text-primary-600" />
      : <ChevronDown size={12} className="text-primary-600" />;
  };

  const handleExport = () => {
    if (filtered.length === 0) return;
    const headers = [
      "사건번호",
      "사건종류",
      "사건명",
      "법원",
      "의뢰인",
      "의뢰인지위",
      "담당",
      "보조",
      "다음기일",
      "기일종류",
      "상태",
      "미수금",
    ];
    const rows = filtered.map((c) => [
      c.caseNumber,
      c.caseType,
      c.caseName,
      c.court,
      c.clientName,
      c.clientPosition,
      c.assignedStaff,
      c.assistants,
      c.nextDate ?? "",
      c.nextDateType,
      c.status,
      String(c.pendingAmount),
    ]);

    const escape = (value: string) => {
      if (value == null) return "";
      const v = String(value);
      if (/[",\n]/.test(v)) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => escape(v ?? "")).join(",")),
    ].join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cases_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">사건 관리</h1>
            <p className="text-sm text-text-muted mt-0.5">
              전체 <span className="text-primary-600 font-semibold">{filtered.length}</span>건
              {selectedRows.size > 0 && (
                <span className="ml-2 text-primary-600 font-semibold">{selectedRows.size}건 선택됨</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.size > 0 && (
              <Button variant="secondary" size="sm">
                일괄 처리 ({selectedRows.size})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Download size={13} />}
              onClick={handleExport}
            >
              엑셀(CSV) 다운로드
            </Button>
            <Button variant="outline" size="sm" leftIcon={<RefreshCw size={13} />}>
              새로고침
            </Button>
            <Link href="/cases/new">
              <Button size="sm" leftIcon={<Plus size={14} />}>
                사건 등록
              </Button>
            </Link>
          </div>
        </div>

        {/* Search + Filter tray */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="사건번호, 의뢰인, 사건명..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 focus:bg-white transition-all"
              />
            </div>
            <div className="relative w-full sm:w-60">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="담당 변호사/보조 직원 이름 검색"
                className="w-full pl-3 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 focus:bg-white transition-all"
              />
            </div>
            <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("table")}
                className={cn(
                  "px-2.5 py-2 transition-colors",
                  viewMode === "table" ? "bg-primary-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={cn(
                  "px-2.5 py-2 transition-colors",
                  viewMode === "card" ? "bg-primary-600 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
                )}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
          </div>

          <FilterTray
            filters={filters}
            onFilterAdd={(f) => setFilters((prev) => [...prev.filter((p) => p.field !== f.field), f])}
            onFilterRemove={(field) => setFilters((prev) => prev.filter((f) => f.field !== field))}
            onFilterClear={() => setFilters([])}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "table" ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filtered.length && filtered.length > 0}
                    onChange={toggleAllRows}
                    className="rounded border-slate-300 text-primary-600"
                  />
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{ minWidth: col.width }}
                    className={cn(
                      "text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide",
                      col.sortable && "cursor-pointer hover:text-slate-800 select-none"
                    )}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon field={col.key} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => <CaseRowSkeleton key={i} />)
                : filtered.map((c) => {
                    const dday = c.nextDate ? getDDay(c.nextDate) : null;
                    const isSelected = selectedRows.has(c.id);
                    const isUrgent = dday !== null && dday <= 0;

                    return (
                      <motion.tr
                        key={c.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={cn(
                          "border-b border-slate-100 text-sm transition-all duration-150 group",
                          isSelected ? "bg-primary-50" : isUrgent ? "bg-danger-50/40 hover:bg-danger-50/70" : "hover:bg-primary-50/40",
                          "cursor-pointer"
                        )}
                        onClick={() => setSelectedCase(c)}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); toggleRow(c.id); }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(c.id)}
                            className="rounded border-slate-300 text-primary-600"
                          />
                        </td>

                        {/* 사건번호 */}
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1.5">
                            {c.isElectronic && <ElectronicBadge />}
                            {c.isImmutable && <ImmutableBadge />}
                            <span
                              className="text-primary-600 font-semibold hover:underline"
                              onClick={(e) => { e.stopPropagation(); setSelectedCase(c); }}
                            >
                              {c.caseNumber}
                            </span>
                          </div>
                        </td>

                        {/* 종류 */}
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">{c.caseType}</span>
                        </td>

                        {/* 사건명 */}
                        <td className="px-3 py-2.5">
                          <div className="font-medium text-slate-800">{c.caseName}</div>
                        </td>

                        {/* 법원 */}
                        <td className="px-3 py-2.5 text-slate-600 text-xs">{c.court}</td>

                        {/* 의뢰인 */}
                        <td className="px-3 py-2.5 font-medium text-slate-800">{c.clientName}</td>

                        {/* 지위 */}
                        <td className="px-3 py-2.5">
                          <span className="text-xs bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                            {c.clientPosition}
                          </span>
                        </td>

                        {/* 담당 */}
                        <td className="px-3 py-2.5 text-sm text-slate-700">{c.assignedStaff}</td>

                        {/* 보조 */}
                        <td className="px-3 py-2.5">
                          <StaffChips staffStr={c.assistants} max={2} />
                        </td>

                        {/* 다음 기일 */}
                        <td className="px-3 py-2.5">
                          {c.nextDate ? (
                            <div>
                              <div className={cn("text-sm font-medium tabular-nums", dday !== null && dday <= 0 ? "text-danger-600" : "text-slate-800")}>
                                {formatDate(c.nextDate)}
                              </div>
                              <div className="text-xs text-text-muted">{c.nextDateType}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">미정</span>
                          )}
                        </td>

                        {/* 상태 */}
                        <td className="px-3 py-2.5">
                          <StatusBadge status={c.status} />
                        </td>

                        {/* 미수금 */}
                        <td className="px-3 py-2.5">
                          {c.pendingAmount > 0 ? (
                            <span className="text-danger-600 font-semibold tabular-nums text-sm">
                              {formatAmount(c.pendingAmount)}
                            </span>
                          ) : (
                            <span className="text-success-600 text-sm font-medium">완납</span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
            </tbody>
          </table>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((c) => {
              const dday = c.nextDate ? getDDay(c.nextDate) : null;
              return (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedCase(c)}
                  className={cn(
                    "bg-white rounded-xl border p-4 cursor-pointer shadow-card",
                    "transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5",
                    dday !== null && dday <= 0 ? "border-danger-200" : "border-slate-100"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        {c.isElectronic && <ElectronicBadge />}
                        <span className="text-primary-600 font-bold text-sm">{c.caseNumber}</span>
                      </div>
                      <div className="font-semibold text-slate-800">{c.caseName}</div>
                      <div className="text-xs text-text-muted mt-0.5">{c.clientName} · {c.court}</div>
                    </div>
                    {dday !== null && <DDayBadge dday={dday} />}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <StatusBadge status={c.status} />
                    <div className="text-xs text-text-muted">{c.assignedStaff}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {filtered.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Search size={24} className="text-slate-400" />
            </div>
            <div className="text-lg font-semibold text-slate-600">검색 결과가 없습니다</div>
            <div className="text-sm text-text-muted mt-1">다른 검색어나 필터를 시도해보세요</div>
          </div>
        )}
      </div>

      {selectedCase && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[260px]">
          <CaseMemoPanel caseItem={selectedCase} />
          <CaseDocumentsPanel caseItem={selectedCase} />
        </div>
      )}

      <CaseDrawer caseItem={selectedCase} onClose={() => setSelectedCase(null)} />
    </div>
  );
}

function CaseMemoPanel({ caseItem }: { caseItem: CaseItem }) {
  const initialMemos = useMemo(
    () => mockTimeline.filter((t) => t.caseId === caseItem.id && t.type === "memo"),
    [caseItem.id]
  );
  const [memos, setMemos] = useState<Timeline[]>(initialMemos);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("10:00");
  const [text, setText] = useState("");

  useEffect(() => {
    setMemos(initialMemos);
    setSelectedId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:00");
    setText("");
  }, [initialMemos]);

  const handleSelect = (item: Timeline) => {
    setSelectedId(item.id);
    setDate(item.date.slice(0, 10));
    setTime(new Date(item.date).toISOString().slice(11, 16));
    setText(item.content);
  };

  const handleReset = () => {
    setSelectedId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setTime("10:00");
    setText("");
  };

  const handleSave = () => {
    if (!text.trim()) return;
    const iso = `${date}T${time}:00Z`;
    if (selectedId) {
      setMemos((prev) =>
        prev.map((m) =>
          m.id === selectedId ? { ...m, content: text, date: iso } : m
        )
      );
      toast.success("메모가 수정되었습니다.");
    } else {
      const newItem: Timeline = {
        id: `memo-${Date.now()}`,
        caseId: caseItem.id,
        type: "memo",
        title: "상담/업무 메모",
        content: text,
        authorId: "me",
        authorName: "담당자",
        date: iso,
      };
      setMemos((prev) => [newItem, ...prev]);
      toast.success("메모가 등록되었습니다.");
    }
    handleReset();
  };

  const handleDelete = () => {
    if (!selectedId) return;
    if (!confirm("선택한 메모를 삭제하시겠습니까?")) return;
    setMemos((prev) => prev.filter((m) => m.id !== selectedId));
    toast.success("메모가 삭제되었습니다.");
    handleReset();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col min-h-[240px]">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MessageSquare size={16} className="text-primary-600" />
          사건 메모 / 히스토리
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="w-1/2 border-r border-slate-100 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left w-28">일시</th>
                <th className="px-3 py-2 text-left">내용</th>
              </tr>
            </thead>
            <tbody>
              {memos.map((m) => (
                <tr
                  key={m.id}
                  className={cn(
                    "border-b border-slate-50 hover:bg-slate-50 cursor-pointer",
                    selectedId === m.id && "bg-primary-50"
                  )}
                  onClick={() => handleSelect(m)}
                >
                  <td className="px-3 py-1.5 tabular-nums align-top">
                    {formatDate(m.date)}{" "}
                    <span className="text-[10px] text-text-muted">
                      {formatDate(m.date, "time")}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-slate-700 truncate">
                    {m.content}
                  </td>
                </tr>
              ))}
              {memos.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-6 text-center text-xs text-text-muted"
                  >
                    등록된 메모가 없습니다. 아래 입력창에서 새 메모를 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex-1 flex flex-col p-3 space-y-2">
          <div className="grid grid-cols-[auto,1fr] gap-2 items-center text-xs">
            <span className="text-slate-500">날짜</span>
            <div className="flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
              />
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="px-2 py-1 border border-slate-200 rounded-lg text-xs w-24"
              />
            </div>
          </div>
          <div className="flex-1 min-h-[80px]">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-full min-h-[80px] max-h-[150px] text-sm border border-slate-200 rounded-lg px-2.5 py-2 resize-none"
              placeholder="사건 진행 메모를 입력하세요."
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              size="xs"
              variant="outline"
              onClick={handleReset}
            >
              리셋
            </Button>
            {selectedId && (
              <Button
                size="xs"
                variant="danger"
                leftIcon={<Trash2 size={12} />}
                onClick={handleDelete}
              >
                삭제
              </Button>
            )}
            <Button
              size="xs"
              onClick={handleSave}
              disabled={!text.trim()}
            >
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

type CaseFile = TimelineAttachment & { local?: boolean };

function CaseDocumentsPanel({ caseItem }: { caseItem: CaseItem }) {
  const initialFiles = useMemo<CaseFile[]>(() => {
    const base = mockTimeline
      .filter((t) => t.caseId === caseItem.id)
      .flatMap((t) => t.attachments ?? []);
    return base as CaseFile[];
  }, [caseItem.id]);

  const [files, setFiles] = useState<CaseFile[]>(initialFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const [preview, setPreview] = useState<CaseFile | null>(null);

  useEffect(() => {
    setFiles(initialFiles);
    setIsDragOver(false);
    setPreview(null);
  }, [initialFiles]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length === 0) return;
    const mapped: CaseFile[] = dropped.map((f) => ({
      id: `file-${Date.now()}-${f.name}`,
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type || "application/octet-stream",
      url: URL.createObjectURL(f),
      local: true,
    }));
    setFiles((prev) => [...mapped, ...prev]);
    toast.success(`${dropped.length}개 파일이 추가되었습니다.`);
  };

  const handleBrowse = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;
    const mapped: CaseFile[] = selected.map((f) => ({
      id: `file-${Date.now()}-${f.name}`,
      fileName: f.name,
      fileSize: f.size,
      mimeType: f.type || "application/octet-stream",
      url: URL.createObjectURL(f),
      local: true,
    }));
    setFiles((prev) => [...mapped, ...prev]);
    toast.success(`${selected.length}개 파일이 추가되었습니다.`);
    e.target.value = "";
  };

  const handleDelete = (file: CaseFile) => {
    if (!confirm("선택한 파일을 삭제하시겠습니까?")) return;
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    if (file.local) URL.revokeObjectURL(file.url);
    if (preview?.id === file.id) setPreview(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card flex flex-col min-h-[240px]">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <FileIcon size={16} className="text-primary-600" />
          사건문서함
        </div>
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <FolderPlus size={14} className="text-slate-400" />
          <span>폴더 생성은 추후 연동</span>
        </div>
      </div>
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 border-r border-slate-100 flex flex-col">
          <div
            className={cn(
              "px-4 py-2 text-xs border-b border-slate-100 flex items-center justify-between",
              isDragOver ? "bg-primary-50 border-primary-200" : "bg-slate-50"
            )}
          >
            <span className="text-slate-600">
              파일을 이 영역으로 끌어오거나, 오른쪽 버튼으로 선택해 업로드하세요.
            </span>
            <label className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs cursor-pointer hover:bg-slate-50">
              <Upload size={13} className="text-slate-500" />
              파일 선택
              <input type="file" multiple className="hidden" onChange={handleBrowse} />
            </label>
          </div>
          <div
            className={cn(
              "flex-1 overflow-y-auto text-xs",
              isDragOver && "bg-primary-50"
            )}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-left w-6" />
                  <th className="px-3 py-2 text-left">문서명</th>
                  <th className="px-3 py-2 text-left w-24">크기</th>
                  <th className="px-3 py-2 text-left w-28">유형</th>
                  <th className="px-3 py-2 text-right w-20">작업</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer"
                    onDoubleClick={() => setPreview(file)}
                  >
                    <td className="px-3 py-1.5 align-top">
                      <FileIcon size={14} className="text-slate-400" />
                    </td>
                    <td className="px-3 py-1.5 text-slate-800 truncate">
                      {file.fileName}
                    </td>
                    <td className="px-3 py-1.5 text-text-muted tabular-nums">
                      {Math.round(file.fileSize / 1024)} KB
                    </td>
                    <td className="px-3 py-1.5 text-text-muted">
                      {file.mimeType || "파일"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-slate-100 text-slate-500 mr-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreview(file);
                        }}
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-danger-50 text-danger-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(file);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {files.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-3 py-6 text-center text-xs text-text-muted"
                    >
                      등록된 문서가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="w-64 hidden md:flex flex-col">
          <div className="px-3 py-2 border-b border-slate-100 text-xs font-semibold text-slate-700">
            미리보기
          </div>
          <div className="flex-1 flex items-center justify-center bg-slate-50 text-[11px] text-text-muted px-2">
            {preview ? (
              preview.mimeType.includes("pdf") ? (
                <iframe
                  src={preview.url}
                  title={preview.fileName}
                  className="w-full h-full rounded-md border border-slate-200 bg-white"
                />
              ) : (
                <div className="text-center">
                  <p className="font-medium mb-1">{preview.fileName}</p>
                  <p>이 유형의 파일은 브라우저 미리보기가 제한될 수 있습니다.</p>
                </div>
              )
            ) : (
              <div className="text-center px-2">
                문서를 더블클릭하면 이 영역에 미리보기가 표시됩니다.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
