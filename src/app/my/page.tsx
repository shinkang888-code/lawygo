"use client";

import { useState, useEffect } from "react";
import { User, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "", label: "선택" },
  { value: "임원", label: "임원" },
  { value: "변호사", label: "변호사" },
  { value: "사무장", label: "사무장" },
  { value: "국장", label: "국장" },
  { value: "직원", label: "직원" },
  { value: "사무원", label: "사무원" },
  { value: "인턴", label: "인턴" },
];

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<{ loginId: string; name: string; role: string; managementNumberMasked?: string } | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Unauthorized");
        return r.json();
      })
      .then((d) => {
        if (d?.user) {
          setProfile(d.user);
          setName(d.user.name || "");
          setRole(d.user.role || "");
        }
      })
      .catch(() => toast.error("로그인이 필요합니다."))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("이름을 입력하세요.");
      return;
    }
    if (newPassword || newPasswordConfirm) {
      if (newPassword !== newPasswordConfirm) {
        toast.error("새 비밀번호가 일치하지 않습니다.");
        return;
      }
      if (newPassword.length < 4) {
        toast.error("새 비밀번호는 4자 이상이어야 합니다.");
        return;
      }
      if (!currentPassword) {
        toast.error("비밀번호 변경 시 현재 비밀번호를 입력하세요.");
        return;
      }
    }

    setSaving(true);
    try {
      const body: { name?: string; role?: string; currentPassword?: string; newPassword?: string } = {
        name: name.trim(),
        role: role || undefined,
      };
      if (newPassword) {
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "저장에 실패했습니다.");
        return;
      }
      toast.success("저장되었습니다. 사이드바·헤더에 반영됩니다.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      if (data?.user) {
        setProfile((p) => (p ? { ...p, name: data.user.name, role: data.user.role } : p));
      }
    } catch {
      toast.error("저장 요청 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="animate-pulse rounded-xl bg-slate-100 h-64" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 max-w-md mx-auto text-center text-slate-600">
        로그인한 회원 정보를 불러올 수 없습니다.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-slate-900 mb-1 flex items-center gap-2">
        <User size={22} className="text-primary-600" />
        마이페이지
      </h1>
      <p className="text-sm text-slate-600 mb-6">
        이름·직급·비밀번호를 수정하면 로그인 계정과 직원 정보에 동일하게 반영됩니다.
      </p>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">로그인 아이디</label>
            <div className="px-3 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm">{profile.loginId}</div>
          </div>
          {profile.managementNumberMasked && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">관리번호</label>
              <div className="px-3 py-2 rounded-lg bg-slate-50 text-slate-700 text-sm">{profile.managementNumberMasked}</div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름"
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              )}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">직급</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              )}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value || "empty"} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
              <Lock size={16} />
              비밀번호 변경 (선택)
            </div>
            <div className="space-y-3">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                )}
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (4자 이상)"
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                )}
              />
              <input
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="새 비밀번호 확인"
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                )}
              />
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            leftIcon={<Save size={16} />}
            disabled={saving}
            loading={saving}
          >
            저장
          </Button>
        </form>
      </div>
    </div>
  );
}
