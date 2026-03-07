"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Save, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { mockCases } from "@/lib/mockData";
import type { CaseItem } from "@/lib/types";
import { applyOverrides, saveCaseOverride, getCaseOverride } from "@/lib/caseOverridesStorage";
import { appendCaseHistory } from "@/lib/caseHistoryStorage";

const caseTypes = ["형사", "민사", "행정", "헌법", "가사", "파산/회생", "기타"];
const positions = ["피고인", "원고", "피고", "신청인", "피신청인", "채권자", "채무자", "청구인", "피청구인", "고소인"];
const statuses: CaseItem["status"][] = ["진행중", "완료", "보류", "취하", "종결"];

function getCurrentAccount(): string {
  if (typeof window === "undefined") return "관리자";
  try {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("lawygo_session="));
    if (!cookie) return "관리자";
    const payload = cookie.split(".")[0];
    if (!payload) return "관리자";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.name ?? decoded.loginId ?? "관리자";
  } catch {
    return "관리자";
  }
}

export default function CaseEditPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const baseCase = mockCases.find((c) => c.id === id);
  const [form, setForm] = useState({
    caseNumber: "",
    caseType: "",
    caseName: "",
    court: "",
    clientName: "",
    clientPosition: "",
    assignedStaff: "",
    assistants: "",
    nextDate: "",
    nextDateType: "",
    status: "진행중" as CaseItem["status"],
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!baseCase) return;
    const merged = applyOverrides(baseCase);
    const overrides = getCaseOverride(id);
    setForm({
      caseNumber: merged.caseNumber,
      caseType: merged.caseType,
      caseName: merged.caseName,
      court: merged.court,
      clientName: merged.clientName,
      clientPosition: merged.clientPosition,
      assignedStaff: merged.assignedStaff ?? "",
      assistants: merged.assistants ?? "",
      nextDate: merged.nextDate ?? "",
      nextDateType: merged.nextDateType ?? "",
      status: merged.status ?? "진행중",
      notes: merged.notes ?? "",
    });
  }, [id, baseCase]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.caseNumber.trim()) errs.caseNumber = "사건번호를 입력하세요.";
    if (!form.caseType.trim()) errs.caseType = "사건종류를 선택하세요.";
    if (!form.caseName.trim()) errs.caseName = "사건명을 입력하세요.";
    if (!form.court.trim()) errs.court = "기관을 입력하세요.";
    if (!form.clientName.trim()) errs.clientName = "의뢰인을 입력하세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseCase || !validate()) {
      toast.error("필수 항목을 입력해 주세요.");
      return;
    }
    saveCaseOverride(id, {
      caseNumber: form.caseNumber.trim(),
      caseType: form.caseType.trim(),
      caseName: form.caseName.trim(),
      court: form.court.trim(),
      clientName: form.clientName.trim(),
      clientPosition: form.clientPosition.trim() || undefined,
      assignedStaff: form.assignedStaff.trim() || undefined,
      assistants: form.assistants.trim() || undefined,
      nextDate: form.nextDate.trim() || null,
      nextDateType: form.nextDateType.trim() || undefined,
      status: form.status,
      notes: form.notes.trim() || undefined,
    });
    appendCaseHistory({
      caseId: id,
      caseNumber: form.caseNumber.trim(),
      clientName: form.clientName.trim(),
      action: "수정",
      accountName: getCurrentAccount(),
      timestamp: new Date().toISOString(),
      details: "사건 편집 저장",
    });
    toast.success("저장되었습니다.");
    if (window.opener) {
      window.opener.postMessage?.({ type: "case-edited", caseId: id }, "*");
      window.opener.focus();
    }
    window.close();
  };

  if (!baseCase) {
    return (
      <div className="p-6 text-center text-slate-500">
        사건을 찾을 수 없습니다.
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    cn(
      "w-full px-3 py-2 text-sm border rounded-lg bg-white outline-none",
      "focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20",
      hasError ? "border-danger-400 bg-danger-50" : "border-slate-200"
    );

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-slate-900">사건 편집</h1>
        <button
          type="button"
          onClick={() => window.close()}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-700">기본 정보</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">사건번호 *</label>
                <input
                  type="text"
                  value={form.caseNumber}
                  onChange={(e) => update("caseNumber", e.target.value)}
                  className={inputClass(!!errors.caseNumber)}
                />
                {errors.caseNumber && (
                  <p className="mt-1 text-xs text-danger-600 flex items-center gap-1">
                    <AlertCircle size={11} /> {errors.caseNumber}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">사건종류 *</label>
                <select
                  value={form.caseType}
                  onChange={(e) => update("caseType", e.target.value)}
                  className={inputClass(!!errors.caseType)}
                >
                  <option value="">선택</option>
                  {caseTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {errors.caseType && <p className="mt-1 text-xs text-danger-600">{errors.caseType}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">사건명 *</label>
              <input
                type="text"
                value={form.caseName}
                onChange={(e) => update("caseName", e.target.value)}
                className={inputClass(!!errors.caseName)}
              />
              {errors.caseName && <p className="mt-1 text-xs text-danger-600">{errors.caseName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">기관 *</label>
              <input
                type="text"
                value={form.court}
                onChange={(e) => update("court", e.target.value)}
                placeholder="예: 서울중앙지방법원"
                className={inputClass(!!errors.court)}
              />
              {errors.court && <p className="mt-1 text-xs text-danger-600">{errors.court}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">의뢰인 *</label>
                <input
                  type="text"
                  value={form.clientName}
                  onChange={(e) => update("clientName", e.target.value)}
                  className={inputClass(!!errors.clientName)}
                />
                {errors.clientName && <p className="mt-1 text-xs text-danger-600">{errors.clientName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">지위</label>
                <select
                  value={form.clientPosition}
                  onChange={(e) => update("clientPosition", e.target.value)}
                  className={inputClass(false)}
                >
                  <option value="">선택</option>
                  {positions.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">담당</label>
                <input
                  type="text"
                  value={form.assignedStaff}
                  onChange={(e) => update("assignedStaff", e.target.value)}
                  placeholder="담당 변호사"
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">보조</label>
                <input
                  type="text"
                  value={form.assistants}
                  onChange={(e) => update("assistants", e.target.value)}
                  placeholder="쉼표 구분"
                  className={inputClass(false)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">다음 기일</label>
                <input
                  type="date"
                  value={form.nextDate}
                  onChange={(e) => update("nextDate", e.target.value)}
                  className={inputClass(false)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">기일 종류</label>
                <input
                  type="text"
                  value={form.nextDateType}
                  onChange={(e) => update("nextDateType", e.target.value)}
                  placeholder="예: 선고기일"
                  className={inputClass(false)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">진행상태</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value as CaseItem["status"])}
                className={inputClass(false)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">비고</label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                className={cn(inputClass(false), "resize-none")}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" leftIcon={<Save size={14} />}>
            저장
          </Button>
          <Button type="button" variant="outline" onClick={() => window.close()}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
