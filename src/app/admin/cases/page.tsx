"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  FolderOpen,
  Upload,
  Search,
  CheckSquare,
  Square,
  Trash2,
  FileCheck,
  Plus,
  Loader2,
  SlidersHorizontal,
  FileDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { downloadCaseExcelTemplate } from "@/lib/caseExcel";

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "진행중", label: "현행사건(진행중)" },
  { value: "종결", label: "종결사건" },
  { value: "완료", label: "완료" },
  { value: "보류", label: "보류" },
  { value: "취하", label: "취하" },
];

const CASE_TYPE_OPTIONS = [
  { value: "", label: "사건종류" },
  { value: "형사", label: "형사" },
  { value: "민사", label: "민사" },
  { value: "헌법", label: "헌법" },
  { value: "행정", label: "행정" },
  { value: "가사", label: "가사" },
];

const COURT_OPTIONS = [
  { value: "", label: "법원" },
  { value: "서울고등법원", label: "서울고등법원" },
  { value: "서울중앙지방법원", label: "서울중앙지방법원" },
  { value: "서울동부지방법원", label: "서울동부지방법원" },
  { value: "인천지방법원", label: "인천지방법원" },
  { value: "수원지방법원", label: "수원지방법원" },
  { value: "헌법재판소", label: "헌법재판소" },
];

const STAFF_OPTIONS = [
  { value: "", label: "담당 변호사" },
  { value: "김민준", label: "김민준" },
  { value: "이서연", label: "이서연" },
  { value: "박지훈", label: "박지훈" },
  { value: "미배정", label: "미배정" },
];

const EXCEL_COLUMN_MAP: Record<string, string> = {
  사건번호: "caseNumber",
  "사건 번호": "caseNumber",
  case_number: "caseNumber",
  사건종류: "caseType",
  종류: "caseType",
  소분류: "caseType",
  case_type: "caseType",
  사건명: "caseName",
  "사건 명": "caseName",
  case_name: "caseName",
  법원: "court",
  court: "court",
  계속기관: "court",
  의뢰인: "clientName",
  당사자: "clientName",
  client_name: "clientName",
  지위: "clientPosition",
  "의)지위": "clientPosition",
  client_position: "clientPosition",
  상대방: "opponentName",
  opponent_name: "opponentName",
  상태: "status",
  status: "status",
  담당자: "assignedStaff",
  수행변호사: "assignedStaff",
  수행: "assignedStaff",
  assigned_staff_name: "assignedStaff",
  보조: "assistants",
  assistants: "assistants",
  수임일: "receivedDate",
  received_date: "receivedDate",
  수임료: "amount",
  amount: "amount",
  수납액: "receivedAmount",
  received_amount: "receivedAmount",
  미수금: "pendingAmount",
  pending_amount: "pendingAmount",
  전자소송: "isElectronic",
  전자: "isElectronic",
  긴급: "isUrgent",
  기일고정: "isImmutable",
  is_electronic: "isElectronic",
  is_urgent: "isUrgent",
  is_immutable_deadline: "isImmutable",
  비고: "notes",
  notes: "notes",
};

type CaseRow = Record<string, string | number>;

function toBool(v: string | number | boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = String(v).trim().toUpperCase();
  return s === "Y" || s === "YES" || s === "O" || s === "1" || s === "TRUE" || s === "예";
}

function parseExcelToCases(file: File): Promise<CaseRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) return reject(new Error("파일을 읽을 수 없습니다."));
        const wb = XLSX.read(data, { type: "binary" });
        const firstSheet = wb.SheetNames[0];
        const ws = wb.Sheets[firstSheet];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];
        if (rows.length < 2) {
          resolve([]);
          return;
        }
        const headers = (rows[0] as unknown[]).map((h) => String(h ?? "").trim());
        const out: CaseRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          const obj: CaseRow = {};
          headers.forEach((h, j) => {
            const key = EXCEL_COLUMN_MAP[h] ?? h;
            const val = row[j];
            if (val !== undefined && val !== null && String(val).trim() !== "") {
              obj[key] = typeof val === "number" ? val : String(val).trim();
            }
          });
          if (Object.keys(obj).length > 0 && (obj.caseNumber || obj.case_number || obj["사건번호"])) {
            const normalized: CaseRow = {};
            Object.entries(obj).forEach(([k, v]) => {
              const nk = EXCEL_COLUMN_MAP[k] ?? k;
              normalized[nk] = v;
            });
            if (!normalized.status) normalized.status = "진행중";
            if (!normalized.caseType) normalized.caseType = "민사";
            if (normalized.isElectronic !== undefined) normalized.isElectronic = toBool(normalized.isElectronic);
            if (normalized.isUrgent !== undefined) normalized.isUrgent = toBool(normalized.isUrgent);
            if (normalized.isImmutable !== undefined) normalized.isImmutable = toBool(normalized.isImmutable);
            out.push(normalized);
          }
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("파일 읽기 실패"));
    reader.readAsBinaryString(file);
  });
}

export default function AdminCasesPage() {
  const [list, setList] = useState<CaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [caseTypeFilter, setCaseTypeFilter] = useState("");
  const [courtFilter, setCourtFilter] = useState("");
  const [assignedStaffFilter, setAssignedStaffFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      if (caseTypeFilter) params.set("case_type", caseTypeFilter);
      if (courtFilter) params.set("court", courtFilter);
      if (assignedStaffFilter) params.set("assigned_staff", assignedStaffFilter);
      const res = await fetch(`/api/admin/cases?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "목록 조회 실패");
      setList(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "목록을 불러올 수 없습니다.";
      setLastError(msg);
      toast.error(msg);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, caseTypeFilter, courtFilter, assignedStaffFilter]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const items = await parseExcelToCases(file);
      if (items.length === 0) {
        toast.error("엑셀에서 사건 데이터를 찾을 수 없습니다. 첫 행에 헤더(사건번호, 의뢰인 등)가 있어야 합니다.");
        return;
      }
      const res = await fetch("/api/admin/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "등록 실패");
      toast.success(data.message || `${items.length}건 등록되었습니다.`);
      fetchList();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "엑셀 등록 실패");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === list.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(list.map((c) => String((c as { id?: string }).id ?? "")).filter(Boolean)));
  };

  const handleCloseCases = async () => {
    if (selectedIds.size === 0) {
      toast.error("종결할 사건을 선택하세요.");
      return;
    }
    setActioning(true);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: "종결" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "종결 처리 실패");
      toast.success(data.message);
      setSelectedIds(new Set());
      fetchList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "종결 처리 실패");
    } finally {
      setActioning(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      toast.error("삭제할 사건을 선택하세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    setActioning(true);
    try {
      const res = await fetch("/api/admin/cases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "삭제 실패");
      toast.success(data.message);
      setSelectedIds(new Set());
      fetchList();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setActioning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="관리 대시보드로"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FolderOpen size={26} className="text-primary-600" />
            사건관리
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            대량 엑셀 등록, 사건 목록 검색·필터, 종결·일괄 삭제
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            disabled={uploading}
            asChild
          >
            <span>대량사건엑셀등록</span>
          </Button>
        </label>
        <Link href="/cases/new">
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={14} />}>
            사건 1건 등록
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          leftIcon={<FileDown size={14} />}
          onClick={downloadCaseExcelTemplate}
        >
          양식 다운로드
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="당사자(의뢰인)·사건번호·사건명 검색"
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
              />
            </div>
            <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleCloseCases}
              disabled={selectedIds.size === 0 || actioning}
              leftIcon={actioning ? <Loader2 size={14} className="animate-spin" /> : <FileCheck size={14} />}
            >
              사건종결
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={handleDelete}
              disabled={selectedIds.size === 0 || actioning}
              leftIcon={<Trash2 size={14} />}
            >
              일괄 삭제
            </Button>
          </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <SlidersHorizontal size={13} />
              필터:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value || "all"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {CASE_TYPE_OPTIONS.map((o) => (
                <option key={o.value || "ct"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={assignedStaffFilter}
              onChange={(e) => setAssignedStaffFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {STAFF_OPTIONS.map((o) => (
                <option key={o.value || "st"} value={o.value}>{o.label}</option>
              ))}
            </select>
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            >
              {COURT_OPTIONS.map((o) => (
                <option key={o.value || "co"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-text-muted">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <div className="py-16 px-4 text-center">
              {lastError && (lastError.includes("table") || lastError.includes("schema") || lastError.includes("cases")) ? (
                <div className="max-w-lg mx-auto text-left space-y-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                  <p className="text-sm font-semibold text-amber-800">DB 연동 오류 — public.cases 테이블 없음</p>
                  <p className="text-xs text-slate-600">{lastError}</p>
                  <div className="text-xs text-slate-700 space-y-1.5">
                    <p className="font-medium text-slate-800">해결 방법:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-1">
                      <li>Supabase 대시보드 → SQL Editor 열기</li>
                      <li>프로젝트 루트의 <code className="bg-white px-1 rounded border border-slate-200">supabase/migrations/20260306000001_cases_standalone.sql</code> 파일 내용을 복사</li>
                      <li>SQL Editor에 붙여넣은 뒤 Run 실행</li>
                      <li>이 페이지 새로고침</li>
                    </ol>
                    <p className="pt-1 text-slate-600">
                      상세 SQL 및 설명은 <code className="bg-white px-1 rounded border border-slate-200">docs/db/cases-table-setup.md</code> 참고.
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-muted">사건이 없습니다. 대량사건엑셀등록 또는 사건 1건 등록을 이용하세요.</p>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="w-10 px-3 py-3 text-left">
                    <button type="button" onClick={toggleSelectAll} className="p-1 rounded hover:bg-slate-200" aria-label="전체 선택">
                      {selectedIds.size === list.length && list.length > 0 ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-slate-400" />}
                    </button>
                  </th>
                  <th className="text-left px-3 py-3 min-w-[100px]">사건번호</th>
                  <th className="text-left px-3 py-3 w-14">종류</th>
                  <th className="text-left px-3 py-3 min-w-[120px]">사건명</th>
                  <th className="text-left px-3 py-3 min-w-[100px] hidden md:table-cell">법원</th>
                  <th className="text-left px-3 py-3 min-w-[80px]">의뢰인</th>
                  <th className="text-left px-3 py-3 w-14 hidden sm:table-cell">지위</th>
                  <th className="text-left px-3 py-3 w-16">담당</th>
                  <th className="text-left px-3 py-3 min-w-[80px] hidden lg:table-cell">보조</th>
                  <th className="text-left px-3 py-3 w-24 hidden md:table-cell">다음 기일</th>
                  <th className="text-left px-3 py-3 w-16">상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const id = String((c as { id?: string }).id ?? "");
                  const isSelected = selectedIds.has(id);
                  const row = c as CaseRow & { id?: string; nextDate?: string | null };
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50/50",
                        isSelected && "bg-primary-50/50"
                      )}
                    >
                      <td className="px-3 py-2">
                        <button type="button" onClick={() => toggleSelect(id)} className="p-1 rounded hover:bg-slate-200">
                          {isSelected ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} className="text-slate-400" />}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">
                        <Link href={`/cases/${id}`} className="hover:text-primary-600 hover:underline">
                          {row.caseNumber ?? row.case_number ?? "-"}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.caseType ?? row.case_type ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{row.caseName ?? row.case_name ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{row.court ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-700">{row.clientName ?? row.client_name ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600 hidden sm:table-cell">{row.clientPosition ?? row.client_position ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{row.assignedStaff ?? row.assigned_staff_name ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600 hidden lg:table-cell truncate max-w-[120px]">{row.assistants ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-600 hidden md:table-cell">{row.nextDate ?? "-"}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded text-xs font-medium",
                            row.status === "종결" ? "bg-slate-100 text-slate-600" : "bg-primary-100 text-primary-700"
                          )}
                        >
                          {row.status ?? "진행중"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {list.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-100 text-xs text-text-muted">
            전체 {list.length}건 {statusFilter && `(상태: ${STATUS_OPTIONS.find((o) => o.value === statusFilter)?.label ?? statusFilter})`}
          </div>
        )}
      </div>
    </div>
  );
}
