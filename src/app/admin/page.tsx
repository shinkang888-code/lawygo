"use client";

import Link from "next/link";
import { LayoutDashboard, Menu, Settings, ExternalLink, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

const cards = [
  {
    title: "메뉴 관리",
    desc: "법무관리시스템 이용자 화면의 LNB·모바일 메뉴를 등록·편집·삭제하고 순서를 변경합니다.",
    href: "/admin/menus",
    icon: Menu,
    cta: "메뉴 관리하기",
  },
  {
    title: "시스템 설정",
    desc: "테마, 알림, 그누보드 연동, 권한 등 전체 시스템 설정을 관리합니다.",
    href: "/admin/settings",
    icon: Settings,
    cta: "설정하기",
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">관리 대시보드</h1>
        <p className="text-sm text-text-muted mt-1">
          프론트엔드(법무관리시스템) 메뉴와 전체 시스템을 관리합니다.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link key={card.href} href={card.href}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5 hover:shadow-card-hover hover:border-primary-200 transition-all">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <card.icon size={22} className="text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900">{card.title}</h3>
                  <p className="text-sm text-text-muted mt-0.5">{card.desc}</p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <span>{card.cta}</span>
                  </Button>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200">
        <LayoutDashboard size={20} className="text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-700">이용자 대시보드</p>
          <p className="text-xs text-text-muted">메뉴 변경 사항은 이용자 화면의 사이드바·하단 네비에 반영됩니다.</p>
        </div>
        <Link href="/" className="ml-auto">
          <Button variant="ghost" size="sm" rightIcon={<ExternalLink size={14} />}>
            미리보기
          </Button>
        </Link>
      </div>
    </div>
  );
}
