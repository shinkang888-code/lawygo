"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings2, ChevronRight, Copy, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const STEP_SUPABASE_URL = 1;
const STEP_SERVICE_ROLE_KEY = 2;
const STEP_DONE = 3;

export default function SetupEnvPage() {
  const [step, setStep] = useState(1);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [loading, setLoading] = useState(false);

  const canNextStep1 = supabaseUrl.trim().length > 0;
  const canNextStep2 = serviceRoleKey.trim().length > 0;

  const handleNext = () => {
    if (step === STEP_SUPABASE_URL && canNextStep1) setStep(STEP_SERVICE_ROLE_KEY);
    else if (step === STEP_SERVICE_ROLE_KEY && canNextStep2) setStep(STEP_DONE);
  };

  const handleBack = () => {
    if (step === STEP_SERVICE_ROLE_KEY) setStep(STEP_SUPABASE_URL);
    else if (step === STEP_DONE) setStep(STEP_SERVICE_ROLE_KEY);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/setup-env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: supabaseUrl.trim(),
          SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "저장에 실패했습니다.");
        return;
      }
      toast.success("환경 변수가 .env.local에 저장되었습니다. 개발 서버를 재시작하세요.");
    } catch {
      toast.error("저장 요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const lines = [
      `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl.trim()}`,
      `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey.trim()}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast.success(".env.local에 넣을 내용이 클립보드에 복사되었습니다.");
    } catch {
      toast.error("복사에 실패했습니다.");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">LawyGo</h1>
        <p className="text-sm text-slate-600 mt-1">Supabase 키 설정</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-6">
        <div className="flex items-center gap-2 text-slate-600 mb-6">
          <Settings2 size={18} />
          <span className="text-sm font-medium">
            {step === STEP_SUPABASE_URL && "1. Supabase URL 입력"}
            {step === STEP_SERVICE_ROLE_KEY && "2. Service Role Key 입력"}
            {step === STEP_DONE && "저장 또는 복사"}
          </span>
        </div>

        {step === STEP_SUPABASE_URL && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                NEXT_PUBLIC_SUPABASE_URL
              </label>
              <input
                type="url"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                placeholder="https://xxxxx.supabase.co"
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono",
                  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                )}
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              className="w-full"
              rightIcon={<ChevronRight size={16} />}
              onClick={handleNext}
              disabled={!canNextStep1}
            >
              다음
            </Button>
          </div>
        )}

        {step === STEP_SERVICE_ROLE_KEY && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                SUPABASE_SERVICE_ROLE_KEY
              </label>
              <input
                type="password"
                value={serviceRoleKey}
                onChange={(e) => setServiceRoleKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className={cn(
                  "w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm font-mono",
                  "focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none"
                )}
                autoComplete="off"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                leftIcon={<ArrowLeft size={16} />}
                onClick={handleBack}
              >
                이전
              </Button>
              <Button
                type="button"
                className="flex-1"
                rightIcon={<ChevronRight size={16} />}
                onClick={handleNext}
                disabled={!canNextStep2}
              >
                다음
              </Button>
            </div>
          </div>
        )}

        {step === STEP_DONE && (
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">입력한 값</p>
              <p className="font-mono truncate">NEXT_PUBLIC_SUPABASE_URL: {supabaseUrl ? "설정됨" : "—"}</p>
              <p className="font-mono truncate">SUPABASE_SERVICE_ROLE_KEY: {serviceRoleKey ? "설정됨" : "—"}</p>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleSave}
              disabled={loading}
              loading={loading}
            >
              .env.local에 저장 (로컬 개발용)
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              leftIcon={<Copy size={16} />}
              onClick={handleCopy}
            >
              클립보드에 복사
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="flex-1"
                leftIcon={<ArrowLeft size={14} />}
                onClick={handleBack}
              >
                이전
              </Button>
              <Link href="/login" className="flex-1">
                <Button type="button" variant="outline" size="sm" className="w-full">
                  로그인으로
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        Vercel 배포 시에는 대시보드의 Environment Variables에 입력하세요.
      </p>
    </div>
  );
}
