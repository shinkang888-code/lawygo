"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { copyAndOpenScourtSearch } from "@/lib/scourtLinks";
import { ExternalLink } from "lucide-react";

/**
 * 나의사건검색 연동 모듈 (팝업)
 * - 사건번호·당사자명 입력 후 클립보드 복사 + 대법원 나의사건검색 새 탭 열기
 */
export default function ScourtSearchPage() {
  const searchParams = useSearchParams();
  const [caseNumber, setCaseNumber] = useState("");
  const [partyName, setPartyName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const cn = searchParams.get("caseNumber");
    const pn = searchParams.get("partyName");
    if (cn) setCaseNumber(decodeURIComponent(cn));
    if (pn) setPartyName(decodeURIComponent(pn));
  }, [searchParams]);

  const handleOpenScourt = async () => {
    await copyAndOpenScourtSearch(caseNumber, partyName);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-sm mx-auto">
        <h1 className="text-lg font-semibold text-slate-800 mb-1">나의사건검색 연동</h1>
        <p className="text-xs text-text-muted mb-4">
          사건번호·당사자명을 입력한 뒤 버튼을 누르면 클립보드에 복사되고 대법원 나의사건검색이 새 탭에서 열립니다.
        </p>
        <div className="space-y-4 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">사건번호</label>
            <input
              type="text"
              value={caseNumber}
              onChange={(e) => setCaseNumber(e.target.value)}
              placeholder="예: 2026노107"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">당사자(의뢰인 등)</label>
            <input
              type="text"
              value={partyName}
              onChange={(e) => setPartyName(e.target.value)}
              placeholder="당사자명 입력"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
            />
          </div>
          <Button
            type="button"
            onClick={handleOpenScourt}
            className="w-full"
            leftIcon={<ExternalLink size={14} />}
          >
            {copied ? "복사됨 · 새 탭에서 열림" : "복사 후 나의사건검색 열기"}
          </Button>
        </div>
      </div>
    </div>
  );
}
