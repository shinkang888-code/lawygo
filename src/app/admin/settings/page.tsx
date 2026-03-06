"use client";

import { Settings, Palette, Bell, Database, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Settings size={26} className="text-primary-600" />
          시스템 설정
        </h1>
        <p className="text-sm text-text-muted mt-1">
          테마, 알림, DB·API 연동, 권한 등 전체 시스템을 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { icon: Palette, title: "테마 및 표시", desc: "다크모드, 폰트, 색상 테마" },
          { icon: Bell, title: "알림 설정", desc: "기일 알림 기준일, 이메일/SMS" },
          { icon: Database, title: "DB·API 연동", desc: "Supabase, 그누보드 G6 URL·키" },
          { icon: Shield, title: "권한 관리", desc: "역할별 메뉴·데이터 접근 범위" },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
                <item.icon size={22} className="text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="text-sm text-text-muted">{item.desc}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">준비 중</Button>
          </div>
        ))}
      </div>
    </div>
  );
}
