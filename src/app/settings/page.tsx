"use client";

import Link from "next/link";
import { Settings, Bell, Shield, Database, Palette, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <h1 className="text-xl font-bold text-slate-900">시스템 설정</h1>

      <Link href="/admin">
        <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5 flex items-center justify-between hover:bg-primary-100/80 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-primary-900">프론트엔드 관리자</div>
              <div className="text-xs text-primary-700">메뉴 등록·편집·삭제, 전체 시스템 관리</div>
            </div>
          </div>
          <Button size="sm">관리자 페이지</Button>
        </div>
      </Link>

      {[
        {
          icon: <Palette size={16} className="text-primary-600" />,
          title: "테마 및 표시",
          desc: "다크모드, 폰트 크기, 색상 테마를 설정합니다.",
          action: "설정"
        },
        {
          icon: <Bell size={16} className="text-warning-500" />,
          title: "알림 설정",
          desc: "기일 알림 기준일, 이메일/SMS 알림 연동을 설정합니다.",
          action: "설정"
        },
        {
          icon: <Database size={16} className="text-success-500" />,
          title: "그누보드 연동",
          desc: "그누보드 6 API 엔드포인트 및 인증 키를 설정합니다.",
          action: "연동 설정"
        },
        {
          icon: <Shield size={16} className="text-violet-500" />,
          title: "권한 관리",
          desc: "역할별 메뉴 접근 권한과 데이터 접근 범위를 설정합니다.",
          action: "관리"
        },
      ].map((item) => (
        <div key={item.title} className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
              {item.icon}
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-800">{item.title}</div>
              <div className="text-xs text-text-muted mt-0.5">{item.desc}</div>
            </div>
          </div>
          <Button variant="outline" size="sm">{item.action}</Button>
        </div>
      ))}
    </div>
  );
}
