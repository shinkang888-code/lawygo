"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Bell, ChevronDown, X, LogOut, User } from "lucide-react";
import { mockCases, mockNotifications } from "@/lib/mockData";
import { formatDate, getDDay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { DDayBadge } from "@/components/ui/badge";
import { useGlobalShortcuts } from "@/hooks/useKeyboardShortcuts";

export function Header() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bellRinging, setBellRinging] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [user, setUser] = useState<{ loginId: string; name: string; role?: string } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) setUser({ loginId: d.user.loginId, name: d.user.name, role: d.user.role });
        else {
          fetch("/api/auth/session", { credentials: "include" })
            .then((r) => r.json())
            .then((s) => s?.user && setUser({ loginId: s.user.loginId, name: s.user.name }));
        }
      })
      .catch(() => {
        fetch("/api/auth/session", { credentials: "include" })
          .then((r) => r.json())
          .then((s) => s?.user && setUser({ loginId: s.user.loginId, name: s.user.name }));
      });
  }, []);

  useGlobalShortcuts({
    onSearchFocus: () => searchRef.current?.focus(),
  });

  const unreadCount = mockNotifications.filter((n) => !n.isRead).length;

  const searchResults = searchQuery.trim()
    ? mockCases.filter(
        (c) =>
          c.caseNumber.includes(searchQuery) ||
          c.clientName.includes(searchQuery) ||
          c.caseName.includes(searchQuery)
      ).slice(0, 6)
    : [];

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setSearchQuery("");
        setSearchFocused(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUserOpen(false);
    router.replace("/login");
    router.refresh();
  };

  const handleBellClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen) {
      setBellRinging(true);
      setTimeout(() => setBellRinging(false), 600);
    }
  };

  return (
    <header className="h-[60px] bg-white border-b border-slate-200 flex items-center px-4 gap-4 sticky top-0 z-30">
      {/* Omnibar */}
      <div className="flex-1 max-w-xl relative">
        <div
          className={cn(
            "flex items-center gap-2 bg-slate-50 border rounded-lg px-3 py-1.5 transition-all duration-200",
            searchFocused ? "border-primary-400 bg-white shadow-sm ring-2 ring-primary-600/20" : "border-slate-200 hover:border-slate-300"
          )}
        >
          <Search size={15} className="text-slate-400 flex-shrink-0" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
            placeholder="사건번호, 의뢰인, 사건명 검색..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
          />
          {searchQuery ? (
            <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex text-xs text-slate-400 bg-slate-200 rounded px-1 py-0.5">/</kbd>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {searchFocused && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
            <div className="py-1">
              {searchResults.map((c) => {
                const dday = c.nextDate ? getDDay(c.nextDate) : null;
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      router.push(`/cases/${c.id}`);
                      setSearchQuery("");
                      setSearchFocused(false);
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary-600">{c.caseNumber}</span>
                        <span className="text-xs text-slate-400">{c.caseType}</span>
                      </div>
                      <div className="text-sm text-slate-700 truncate">{c.caseName}</div>
                      <div className="text-xs text-text-muted">{c.clientName} · {c.court}</div>
                    </div>
                    {c.nextDate && dday !== null && (
                      <DDayBadge dday={dday} />
                    )}
                  </div>
                );
              })}
            </div>
            <div
              className="border-t border-slate-100 px-3 py-2 text-xs text-text-muted bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => { router.push(`/cases?q=${encodeURIComponent(searchQuery)}`); setSearchQuery(""); setSearchFocused(false); }}
            >
              검색 결과 {searchResults.length}건 · <span className="text-primary-600 font-medium">전체 목록에서 보기 →</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={handleBellClick}
            className={cn(
              "relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500",
              "hover:bg-slate-100 transition-colors",
              bellRinging && "animate-[bellRing_0.5s_ease-in-out]"
            )}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute top-full right-0 mt-1 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-800">알림</span>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary-600 font-medium">{unreadCount}개 미읽음</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {mockNotifications.map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "flex gap-3 px-4 py-3 border-b border-slate-50 cursor-pointer transition-colors",
                      n.isRead ? "hover:bg-slate-50" : "bg-primary-50/50 hover:bg-primary-50"
                    )}
                  >
                    <div className={cn(
                      "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                      n.type === "urgent_date" ? "bg-danger-500" :
                      n.type === "approval_request" ? "bg-primary-500" :
                      "bg-warning-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800">{n.title}</div>
                      <div className="text-xs text-text-muted mt-0.5 truncate">{n.message}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {formatDate(n.createdAt, "time")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-slate-50 text-center">
                <button className="text-xs text-primary-600 font-medium hover:underline">
                  모든 알림 보기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile + logout */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-7 h-7 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.slice(0, 1) ?? user?.loginId?.slice(0, 1) ?? "?"}
            </div>
            <div className="text-left hidden sm:block">
              <div className="text-sm font-medium text-slate-800 leading-tight">{user?.name || user?.loginId || "사용자"}</div>
              <div className="text-xs text-text-muted leading-tight">{user?.loginId ?? ""}</div>
            </div>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
          {userOpen && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
              <Link
                href="/my"
                onClick={() => setUserOpen(false)}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <User size={14} />
                마이페이지
              </Link>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <LogOut size={14} />
                로그아웃
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
