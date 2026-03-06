"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNav = [
  { label: "관리 대시보드", href: "/admin", icon: LayoutDashboard },
  { label: "메뉴 관리", href: "/admin/menus", icon: Menu },
  { label: "시스템 설정", href: "/admin/settings", icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2 font-semibold text-slate-900">
              <Shield size={20} className="text-primary-600" />
              프론트엔드 관리자
            </Link>
            <nav className="hidden sm:flex items-center gap-1">
              {adminNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive ? "bg-primary-50 text-primary-700" : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link href="/" className="text-sm text-text-muted hover:text-primary-600">
            이용자 화면으로
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
