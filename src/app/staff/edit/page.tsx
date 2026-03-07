"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { User, Building2, Smartphone, Save, Trash2 } from "lucide-react";
import type { StaffMember, StaffRoleOption, JobTitleOption } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const ROLE_OPTIONS: StaffRoleOption[] = ["임원", "변호사", "사무장", "국장", "직원"];
const JOB_TITLE_OPTIONS: JobTitleOption[] = ["부장", "팀장", "과장", "대리", "주임", "인턴"];

export default function StaffEditPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [form, setForm] = useState<Partial<StaffMember>>({});
  const [saving, setSaving] = useState(false);

  const setField = useCallback(<K extends keyof StaffMember>(key: K, value: StaffMember[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  useEffect(() => {
    if (!id || typeof window === "undefined" || !window.opener) return;
    window.opener.postMessage({ type: "STAFF_EDIT_GET_DATA" }, window.location.origin);
  }, [id]);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === "STAFF_DATA" && Array.isArray(e.data?.payload)) {
        const list = e.data.payload as StaffMember[];
        const found = id ? list.find((s) => s.id === id) : null;
        if (found) {
          setStaff(found);
          setForm({
            id: found.id,
            name: found.name,
            role: found.role,
            department: found.department,
            email: found.email,
            phone: found.phone,
            level: found.level ?? 1,
            jobTitle: found.jobTitle,
            companyPhone: found.companyPhone,
            personalPhone: found.personalPhone,
          });
        } else {
          toast.error("해당 직원을 찾을 수 없습니다.");
        }
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [id]);

  const handleSave = () => {
    if (!form.name?.trim()) {
      toast.error("이름을 입력하세요.");
      return;
    }
    if (!window.opener) {
      toast.error("부모 창이 없습니다.");
      return;
    }
    setSaving(true);
    const updated: StaffMember = {
      id: form.id!,
      name: form.name!,
      role: form.role!,
      department: form.department ?? "",
      email: form.email ?? "",
      phone: form.phone ?? form.companyPhone ?? form.personalPhone ?? "",
      level: form.level ?? 1,
      jobTitle: form.jobTitle,
      companyPhone: form.companyPhone,
      personalPhone: form.personalPhone,
    };
    window.opener.postMessage({ type: "STAFF_UPDATE", payload: updated }, window.location.origin);
    toast.success("저장되었습니다.");
    setSaving(false);
  };

  const handleDelete = () => {
    if (!confirm("이 직원 정보를 삭제하시겠습니까?")) return;
    if (!window.opener) return;
    window.opener.postMessage({ type: "STAFF_DELETE", payload: form.id }, window.location.origin);
    toast.success("삭제되었습니다.");
    window.close();
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">직원을 선택해 주세요.</p>
      </div>
    );
  }

  if (!staff && !form.id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <p className="text-slate-600">직원 정보를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-lg font-bold text-slate-900 mb-4">직원 정보</h1>

        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <User size={14} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">편집</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">이름 *</label>
              <input
                type="text"
                value={form.name ?? ""}
                onChange={(e) => setField("name", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">역할</label>
                <select
                  value={form.role ?? ""}
                  onChange={(e) => setField("role", e.target.value as StaffMember["role"])}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                  <option value="사무원">사무원</option>
                  <option value="인턴">인턴</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">직급</label>
                <select
                  value={form.jobTitle ?? ""}
                  onChange={(e) => setField("jobTitle", (e.target.value || undefined) as JobTitleOption | undefined)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                >
                  <option value="">선택</option>
                  {JOB_TITLE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">부서</label>
              <input
                type="text"
                value={form.department ?? ""}
                onChange={(e) => setField("department", e.target.value)}
                placeholder="예: 형사부, 민사부, 행정팀"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
              <input
                type="email"
                value={form.email ?? ""}
                onChange={(e) => setField("email", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                  <Building2 size={12} /> 회사폰
                </label>
                <input
                  type="tel"
                  value={form.companyPhone ?? ""}
                  onChange={(e) => setField("companyPhone", e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
              </div>
              <div>
                <label className="flex items-center gap-1 text-xs font-medium text-slate-600 mb-1">
                  <Smartphone size={12} /> 개인폰
                </label>
                <input
                  type="tel"
                  value={form.personalPhone ?? ""}
                  onChange={(e) => setField("personalPhone", e.target.value)}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="flex gap-3 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.close()}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-danger-600 flex-1"
            leftIcon={<Trash2 size={14} />}
            onClick={handleDelete}
          >
            삭제
          </Button>
          <Button
            type="button"
            leftIcon={<Save size={14} />}
            onClick={handleSave}
            disabled={saving}
            className="flex-1"
          >
            저장
          </Button>
        </div>
      </div>
    </div>
  );
}
