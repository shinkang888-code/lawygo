"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { mockStaff } from "@/lib/mockData";

const caseTypes = ["형사", "민사", "행정", "헌법", "가사", "파산/회생", "기타"];
const positions = ["피고인", "원고", "피고", "신청인", "피신청인", "채권자", "채무자", "청구인", "피청구인", "고소인"];

export default function NewCasePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    caseNumber: "",
    caseType: "",
    caseName: "",
    court: "",
    clientName: "",
    clientPosition: "",
    opponentName: "",
    clientPhone: "",
    clientMobile: "",
    clientAddress: "",
    clientIdNumber: "",
    clientBizNumber: "",
    assignedStaff: "김민준",
    assistants: "",
    receivedDate: new Date().toISOString().split("T")[0],
    amount: "",
    isElectronic: false,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedLawyers, setSelectedLawyers] = useState<string[]>(["김민준"]);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [lawyerSearch, setLawyerSearch] = useState("");
  const [staffSearch, setStaffSearch] = useState("");

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.caseNumber) errs.caseNumber = "사건번호를 입력하세요.";
    if (!form.caseType) errs.caseType = "사건종류를 선택하세요.";
    if (!form.caseName) errs.caseName = "사건명을 입력하세요.";
    if (!form.court) errs.court = "기관을 입력하세요.";
    if (!form.clientName) errs.clientName = "의뢰인을 입력하세요.";
    if (selectedLawyers.length === 0) errs.assignedStaff = "담당 변호사를 1명 이상 선택하세요.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }
    const assignedStr = [...selectedLawyers, ...selectedStaff].join(", ");

    toast.success("사건이 성공적으로 등록되었습니다.", {
      description: `${form.caseNumber} · ${form.caseName} / 담당: ${assignedStr}`,
    });
    setTimeout(() => router.push("/cases"), 800);
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const toggleLawyer = (name: string) => {
    setSelectedLawyers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
    if (errors.assignedStaff) setErrors((prev) => ({ ...prev, assignedStaff: "" }));
  };

  const toggleStaffMember = (name: string) => {
    setSelectedStaff((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const openScourtSearchPopup = () => {
    const w = 520;
    const h = 560;
    const left = typeof window !== "undefined" ? (window.screen.width - w) / 2 : 0;
    const top = typeof window !== "undefined" ? (window.screen.height - h) / 2 : 0;
    const url = `/cases/scourt-search?caseNumber=${encodeURIComponent(form.caseNumber)}&partyName=${encodeURIComponent(form.clientName)}`;
    window.open(url, "scourt-search", `width=${w},height=${h},left=${left},top=${top},scrollbars=yes`);
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/cases" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary-600 transition-colors">
          <ArrowLeft size={15} /> 사건 목록
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-sm font-medium text-slate-700">새 사건 등록</span>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        <FormSection title="기본 정보">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="사건번호 *" error={errors.caseNumber}>
              <input
                type="text"
                value={form.caseNumber}
                onChange={(e) => update("caseNumber", e.target.value)}
                placeholder="예: 2026노107"
                className={inputClass(!!errors.caseNumber)}
              />
            </FormField>
            <FormField label="사건종류 *" error={errors.caseType}>
              <select
                value={form.caseType}
                onChange={(e) => update("caseType", e.target.value)}
                className={inputClass(!!errors.caseType)}
              >
                <option value="">선택</option>
                {caseTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="사건명 *" error={errors.caseName}>
            <input
              type="text"
              value={form.caseName}
              onChange={(e) => update("caseName", e.target.value)}
              placeholder="예: 특수상해"
              className={inputClass(!!errors.caseName)}
            />
          </FormField>
          <FormField label="기관 *" error={errors.court}>
            <input
              type="text"
              value={form.court}
              onChange={(e) => update("court", e.target.value)}
              placeholder="예: 인천지방법원"
              className={inputClass(!!errors.court)}
            />
          </FormField>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="checkbox"
              id="isElectronic"
              checked={form.isElectronic}
              onChange={(e) => update("isElectronic", e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-600"
            />
            <label htmlFor="isElectronic" className="text-sm text-slate-700 cursor-pointer">
              전자사건 (ELEC)
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openScourtSearchPopup}
              className="text-xs"
            >
              나의사건검색 연동
            </Button>
          </div>
        </FormSection>

        <FormSection title="가. 의뢰인 정보">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="의뢰인 *" error={errors.clientName}>
              <input
                type="text"
                value={form.clientName}
                onChange={(e) => update("clientName", e.target.value)}
                placeholder="이름 또는 법인명"
                className={inputClass(!!errors.clientName)}
              />
            </FormField>
            <FormField label="지위">
              <select
                value={form.clientPosition}
                onChange={(e) => update("clientPosition", e.target.value)}
                className={inputClass(false)}
              >
                <option value="">선택</option>
                {positions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="연락처(휴대폰)">
              <input
                type="tel"
                value={form.clientMobile}
                onChange={(e) => update("clientMobile", e.target.value)}
                placeholder="010-0000-0000"
                className={inputClass(false)}
              />
            </FormField>
            <FormField label="연락처(일반전화)">
              <input
                type="tel"
                value={form.clientPhone}
                onChange={(e) => update("clientPhone", e.target.value)}
                placeholder="02-000-0000"
                className={inputClass(false)}
              />
            </FormField>
          </div>
          <FormField label="주소">
            <input
              type="text"
              value={form.clientAddress}
              onChange={(e) => update("clientAddress", e.target.value)}
              placeholder="도로명 주소"
              className={inputClass(false)}
            />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="주민/고유번호">
              <input
                type="text"
                value={form.clientIdNumber}
                onChange={(e) => update("clientIdNumber", e.target.value)}
                className={inputClass(false)}
              />
            </FormField>
            <FormField label="사업자등록번호">
              <input
                type="text"
                value={form.clientBizNumber}
                onChange={(e) => update("clientBizNumber", e.target.value)}
                className={inputClass(false)}
              />
            </FormField>
          </div>
          <FormField label="상대방">
            <input
              type="text"
              value={form.opponentName}
              onChange={(e) => update("opponentName", e.target.value)}
              placeholder="상대방 이름 또는 법인명"
              className={inputClass(false)}
            />
          </FormField>
        </FormSection>

        <FormSection title="나. 담당자">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="변호사 *" error={errors.assignedStaff}>
              <input
                type="text"
                value={lawyerSearch}
                onChange={(e) => setLawyerSearch(e.target.value)}
                placeholder="이름 검색 후 선택"
                className={cn(inputClass(false), "mb-2")}
              />
              <div className="border border-slate-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto text-xs">
                {mockStaff
                  .filter((s) => s.role === "변호사")
                  .filter(
                    (s) =>
                      !lawyerSearch.trim() ||
                      s.name.includes(lawyerSearch.trim()) ||
                      s.department.includes(lawyerSearch.trim())
                  )
                  .map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLawyers.includes(s.name)}
                        onChange={() => toggleLawyer(s.name)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600"
                      />
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-[10px] text-text-muted">{s.department}</span>
                    </label>
                  ))}
              </div>
              {selectedLawyers.length > 0 && (
                <p className="mt-1.5 text-xs text-text-muted">
                  선택: {selectedLawyers.join(", ")}
                </p>
              )}
            </FormField>
            <FormField label="직원">
              <input
                type="text"
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                placeholder="이름 검색 후 선택"
                className={cn(inputClass(false), "mb-2")}
              />
              <div className="border border-slate-200 rounded-lg p-2 space-y-1 max-h-40 overflow-y-auto text-xs">
                {mockStaff
                  .filter((s) => s.role !== "변호사")
                  .filter(
                    (s) =>
                      !staffSearch.trim() ||
                      s.name.includes(staffSearch.trim()) ||
                      s.department.includes(staffSearch.trim())
                  )
                  .map((s) => (
                    <label
                      key={s.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 rounded px-1 py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaff.includes(s.name)}
                        onChange={() => toggleStaffMember(s.name)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-primary-600"
                      />
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-[10px] text-text-muted">{s.department}</span>
                    </label>
                  ))}
              </div>
              {selectedStaff.length > 0 && (
                <p className="mt-1.5 text-xs text-text-muted">
                  선택: {selectedStaff.join(", ")}
                </p>
              )}
            </FormField>
          </div>
          <FormField label="수임일">
            <input
              type="date"
              value={form.receivedDate}
              onChange={(e) => update("receivedDate", e.target.value)}
              className={inputClass(false)}
            />
          </FormField>
        </FormSection>

        <FormSection title="비고">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="추가 메모나 특이사항을 입력하세요..."
            rows={3}
            className={cn(inputClass(false), "resize-none")}
          />
        </FormSection>

        <div className="flex gap-3 pt-2">
          <Button type="submit" leftIcon={<Save size={14} />} className="flex-1 sm:flex-none">
            사건 등록
          </Button>
          <Link href="/cases">
            <Button type="button" variant="outline">취소</Button>
          </Link>
        </div>
      </motion.form>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1.5">{label}</label>
      {children}
      {error && (
        <div className="flex items-center gap-1 mt-1 text-xs text-danger-600">
          <AlertCircle size={11} />
          {error}
        </div>
      )}
    </div>
  );
}

function inputClass(hasError: boolean): string {
  return cn(
    "w-full px-3 py-2 text-sm border rounded-lg bg-white transition-all outline-none",
    "focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20",
    hasError ? "border-danger-400 bg-danger-50" : "border-slate-200 hover:border-slate-300"
  );
}
