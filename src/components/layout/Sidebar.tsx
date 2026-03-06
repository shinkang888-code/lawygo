"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  FileText,
  CreditCard,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Scale,
  BarChart3,
  Calendar,
  Bell,
  MoreHorizontal,
  LayoutList,
  CalendarDays,
  Shield,
  MessageSquare,
  TrendingUp,
  Home,
  Search,
  Send,
} from "lucide-react";
import { getMenuForRoles } from "@/lib/menuConfig";
import { useMenus } from "@/hooks/useMenus";

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  LayoutDashboard,
  FolderOpen,
  FileText,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  Calendar,
  CalendarDays,
  Bell,
  MoreHorizontal,
  LayoutList,
  Scale,
  Shield,
  MessageSquare,
  TrendingUp,
  Home,
  Search,
  Send,
};

const currentUser = { name: "김민준", role: "변호사", permissions: ["관리자", "변호사"] };

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { lnb } = useMenus();

  const filteredNav = getMenuForRoles(lnb, currentUser.permissions).filter((item) => item.href !== "#more");

  return (
    <aside
      className={cn(
        "flex flex-col bg-slate-900 text-white h-full relative z-20",
        "transition-all duration-300 ease-in-out flex-shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center h-15 border-b border-slate-700/50 flex-shrink-0",
        collapsed ? "justify-center px-4 py-4" : "px-5 py-4 gap-2.5"
      )}>
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Scale size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-lg leading-tight tracking-tight">LawGo</div>
            <div className="text-slate-400 text-xs">법무 관리 시스템</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        <ul className="space-y-0.5 px-2">
          {filteredNav.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            const IconComponent = iconMap[item.icon] ?? FileText;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium",
                    "transition-all duration-150 relative group",
                    "hover:bg-slate-700/60",
                    collapsed && "justify-center",
                    isActive
                      ? "bg-primary-600/20 text-primary-400 border border-primary-600/30"
                      : "text-slate-400 hover:text-white"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <span className={cn("flex-shrink-0", isActive ? "text-primary-400" : "text-slate-400 group-hover:text-white")}>
                    <IconComponent size={18} />
                  </span>

                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>
                      {item.badge ? (
                        <span className="ml-auto bg-danger-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">
                          {item.badge}
                        </span>
                      ) : null}
                    </>
                  )}

                  {collapsed && item.badge ? (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full" />
                  ) : null}

                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary-400 rounded-r-full" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User info + Collapse toggle */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-slate-700/40 cursor-pointer">
            <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {currentUser.name[0]}
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-medium text-white truncate">{currentUser.name}</div>
              <div className="text-xs text-slate-400 truncate">{currentUser.role}</div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "flex items-center gap-2 w-full rounded-lg px-2 py-2 text-slate-400 hover:bg-slate-700/60 hover:text-white",
            "text-xs font-medium transition-colors",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>메뉴 접기</span></>}
        </button>
      </div>
    </aside>
  );
}
