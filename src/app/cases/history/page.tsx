"use client";

import { useState, useEffect, useCallback } from "react";
import { History, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCaseHistory, searchCaseHistory, type CaseHistoryEntry } from "@/lib/caseHistoryStorage";
import { cn } from "@/lib/utils";

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function CaseHistoryPage() {
  const [list, setList] = useState<CaseHistoryEntry[]>([]);
  const [caseNumberQuery, setCaseNumberQuery] = useState("");
  const [clientNameQuery, setClientNameQuery] = useState("");

  const refresh = useCallback(() => {
    if (caseNumberQuery.trim() || clientNameQuery.trim()) {
      setList(
        searchCaseHistory({
          caseNumber: caseNumberQuery.trim() || undefined,
          clientName: clientNameQuery.trim() || undefined,
        })
      );
    } else {
      setList(getCaseHistory());
    }
  }, [caseNumberQuery, clientNameQuery]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto min-h-screen bg-white">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <History size={22} className="text-primary-600" />
          이력관리
        </h1>
        <button
          type="button"
          onClick={() => window.close()}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-text-muted mb-4">
        사건관리에서 어떤 계정으로, 언제, 어떤 편집을 했는지 목록입니다.
      </p>

      {/* 검색 */}
      <div className="flex flex-wrap items-center gap-2 mb-4 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
        <input
          type="text"
          value={caseNumberQuery}
          onChange={(e) => setCaseNumberQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh()}
          placeholder="사건번호"
          className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-slate-200 rounded-lg"
        />
        <input
          type="text"
          value={clientNameQuery}
          onChange={(e) => setClientNameQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh()}
          placeholder="당사자(의뢰인)명"
          className="flex-1 min-w-[120px] px-3 py-2 text-sm border border-slate-200 rounded-lg"
        />
        <Button size="sm" onClick={refresh} leftIcon={<Search size={14} />}>
          검색
        </Button>
      </div>

      {/* 목록 */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">일시</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">계정</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">구분</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">사건번호</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">당사자(의뢰인)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">내용</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                  이력이 없습니다.
                </td>
              </tr>
            ) : (
              list.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">
                    {formatDateTime(entry.timestamp)}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-800">{entry.accountName}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "text-xs font-medium rounded-full px-2 py-0.5",
                        entry.action === "수정" && "bg-primary-100 text-primary-700",
                        entry.action === "등록" && "bg-success-100 text-success-700",
                        (entry.action === "삭제" || entry.action === "소프트삭제") && "bg-warning-100 text-warning-700",
                        entry.action === "영구삭제" && "bg-danger-100 text-danger-700"
                      )}
                    >
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-800">{entry.caseNumber}</td>
                  <td className="px-4 py-2.5 text-slate-700">{entry.clientName}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{entry.details ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
