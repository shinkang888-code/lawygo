"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, KeyRound, Settings2, Play, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type DbStatus = { ok: boolean; connected?: boolean; missing?: string[]; hint?: string } | null;

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [managementNumber, setManagementNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [dbStatus, setDbStatus] = useState<DbStatus>(null);

  useEffect(() => {
    fetch("/api/auth/status", { credentials: "include" })
      .then((r) => r.json().catch(() => ({ ok: false })))
      .then((data: DbStatus) => setDbStatus(data));
  }, []);

  const dbNotConfigured = dbStatus && !dbStatus.ok;

  const handleDemoLogin = async () => {
    setDemoLoading(true);
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 503 && data.hint
          ? `${data.error} ${data.hint}`
          : data.error ?? "데모 로그인에 실패했습니다.";
        toast.error(msg);
        if (data.missing?.length) setDbStatus((s) => (s ? { ...s, ok: false, missing: data.missing, hint: data.hint } : s));
        return;
      }
      toast.success("데모 계정으로 로그인되었습니다.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("데모 로그인 요청 중 오류가 발생했습니다.");
    } finally {
      setDemoLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim() || !password || !managementNumber.trim()) {
      toast.error("아이디, 비밀번호, 관리번호를 모두 입력하세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginId: loginId.trim(),
          password,
          managementNumber: managementNumber.trim(),
        }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = res.status === 503 && data.hint
          ? `${data.error} ${data.hint}`
          : data.error ?? "로그인에 실패했습니다.";
        toast.error(msg);
        if (data.missing?.length) setDbStatus((s) => (s ? { ...s, ok: false, missing: data.missing, hint: data.hint } : s));
        return;
      }
      toast.success("로그인되었습니다.");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("로그인 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {dbNotConfigured && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <div className="flex gap-2">
            <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">DB가 연결되지 않았습니다</p>
              <p className="text-amber-700 mt-1">{dbStatus?.hint ?? "환경 변수를 확인해 주세요."}</p>
              {dbStatus?.missing?.length ? (
                <p className="text-amber-600 mt-1">누락: {dbStatus.missing.join(", ")}</p>
              ) : null}
              <Link href="/login/setup-env" className="inline-block mt-2 text-primary-600 font-medium hover:underline">
                Supabase 키 설정 →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">LawyGo</h1>
        <p className="text-sm text-slate-600 mt-1">법무 관리 시스템 로그인</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">아이디</label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="아이디 입력"
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              )}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              )}
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">관리번호</label>
            <input
              type="text"
              value={managementNumber}
              onChange={(e) => setManagementNumber(e.target.value)}
              placeholder="관리번호 입력"
              className={cn(
                "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm",
                "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
              )}
              autoComplete="off"
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            leftIcon={<LogIn size={16} />}
            disabled={loading}
            loading={loading}
          >
            로그인
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-center flex-wrap">
          <Link href="/login/setup-env">
            <Button type="button" variant="outline" size="sm" leftIcon={<Settings2 size={14} />} className="w-full sm:w-auto">
              Supabase 키 설정
            </Button>
          </Link>
          <Link href="/login/signup">
            <Button type="button" variant="outline" size="sm" leftIcon={<UserPlus size={14} />} className="w-full sm:w-auto">
              회원가입
            </Button>
          </Link>
          <Link href="/login/password">
            <Button type="button" variant="outline" size="sm" leftIcon={<KeyRound size={14} />} className="w-full sm:w-auto">
              비밀번호 확인
            </Button>
          </Link>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            className="w-full"
            leftIcon={<Play size={16} />}
            disabled={demoLoading}
            loading={demoLoading}
            onClick={handleDemoLogin}
          >
            DEMO
          </Button>
          <p className="text-center text-xs text-slate-500 mt-2">
            관리자 권한으로 체험 로그인
          </p>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        관리자 승인 후 로그인할 수 있습니다.
      </p>
    </div>
  );
}
