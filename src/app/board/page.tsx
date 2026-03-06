"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutList, MessageSquare, Bell, FileText, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { BOARD_LIST } from "@/lib/boardConfig";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  case_memo: <MessageSquare size={20} className="text-primary-600" />,
  notice: <Bell size={20} className="text-warning-500" />,
  general: <FileText size={20} className="text-slate-600" />,
};

export default function BoardListPage() {
  const [g6Connected, setG6Connected] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((res) => res.json())
      .then((data) => setG6Connected(data.g6Connected ?? false))
      .catch(() => setG6Connected(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutList size={24} className="text-primary-600" />
              전문 게시판
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              그누보드6(G6)와 연동된 게시판입니다. 사건 메모, 공지, 자유게시판을 이용할 수 있습니다.
            </p>
          </div>
          {g6Connected !== null && (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                g6Connected ? "bg-success-50 text-success-700" : "bg-slate-100 text-text-muted"
              )}
            >
              {g6Connected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {g6Connected ? "G6 연동됨" : "G6 미연동 (목록만 표시)"}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BOARD_LIST.map((board, i) => (
            <motion.div
              key={board.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
            >
              <Link href={`/board/${board.id}`}>
                <div
                  className={cn(
                    "rounded-2xl border border-slate-100 bg-white shadow-card p-5",
                    "hover:shadow-card-hover hover:border-primary-200 transition-all duration-200",
                    "flex items-start gap-4 group"
                  )}
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-50 transition-colors">
                    {iconMap[board.id] ?? <LayoutList size={20} className="text-slate-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                      {board.name}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-text-muted mt-0.5">{board.description}</p>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-primary-600 flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-text-muted">
          <p className="font-medium text-slate-700 mb-1">하이브리드 연동 안내</p>
          <p>
            LawGo는 <strong>중간 관리자(API 브릿지)</strong>를 통해 G6와 통신합니다. G6가 꺼져 있어도 게시판 목록은
            표시되며, 글 목록은 G6 연동 후 이용할 수 있습니다. 설정은 <code className="bg-white px-1 rounded">.env.local</code>의{" "}
            <code className="bg-white px-1 rounded">NEXT_PUBLIC_GNUBOARD_API_URL</code>에서 확인하세요.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
