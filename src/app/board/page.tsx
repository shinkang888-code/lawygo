"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  LayoutList,
  MessageSquare,
  Bell,
  FileText,
  ChevronRight,
  Wifi,
  WifiOff,
  Sparkles,
  Search,
  Scale,
  FileStack,
  PenLine,
  Bot,
} from "lucide-react";
import { BOARD_LIST, AI_FEATURES } from "@/lib/boardConfig";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ReactNode> = {
  case_memo: <MessageSquare size={20} className="text-primary-600" />,
  notice: <Bell size={20} className="text-warning-500" />,
  general: <FileText size={20} className="text-slate-600" />,
};

const aiIconMap: Record<string, React.ReactNode> = {
  case_search: <Scale size={20} className="text-primary-600" />,
  law_search: <Search size={20} className="text-primary-600" />,
  doc_summary: <FileStack size={20} className="text-primary-600" />,
  doc_draft: <PenLine size={20} className="text-primary-600" />,
  ai_search: <Bot size={20} className="text-primary-600" />,
};

export default function BoardListPage() {
  const [g6Connected, setG6Connected] = useState<boolean | null>(null);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((res) => res.json())
      .then((data) => setG6Connected(data.g6Connected ?? false))
      .catch(() => setG6Connected(false));
  }, []);
  useEffect(() => {
    fetch("/api/ai/gemini")
      .then((res) => res.json())
      .then((data) => setGeminiConfigured(data.configured ?? false))
      .catch(() => setGeminiConfigured(false));
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-8"
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              <LayoutList size={24} className="text-primary-600" />
              전문 게시판
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              그누보드6(G6) 연동 게시판과 AI·문서 엔진(Gemini)을 함께 이용할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {g6Connected !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  g6Connected ? "bg-success-50 text-success-700" : "bg-slate-100 text-text-muted"
                )}
              >
                {g6Connected ? <Wifi size={14} /> : <WifiOff size={14} />}
                {g6Connected ? "G6 연동됨" : "G6 미연동"}
              </div>
            )}
            {geminiConfigured !== null && (
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  geminiConfigured ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-text-muted"
                )}
              >
                <Sparkles size={14} />
                {geminiConfigured ? "Gemini 연동됨" : "Gemini 미설정"}
              </div>
            )}
          </div>
        </div>

        {/* G6 게시판 */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3">G6 게시판</h2>
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
        </section>

        {/* AI·문서 엔진 (Gemini) */}
        <section>
          <h2 className="text-sm font-semibold text-slate-600 mb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-primary-500" />
            AI·문서 엔진 (Gemini)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {AI_FEATURES.map((feat, i) => (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.15 + i * 0.05 }}
              >
                <Link href={`/board/ai/${feat.id}`}>
                  <div
                    className={cn(
                      "rounded-2xl border border-slate-100 bg-white shadow-card p-5",
                      "hover:shadow-card-hover hover:border-primary-200 transition-all duration-200",
                      "flex items-start gap-4 group"
                    )}
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                      {aiIconMap[feat.id] ?? <Sparkles size={20} className="text-primary-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-slate-900 group-hover:text-primary-600 transition-colors">
                        {feat.name}
                      </h3>
                      <p className="text-sm text-text-muted mt-0.5">{feat.description}</p>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 group-hover:text-primary-600 flex-shrink-0 mt-0.5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-text-muted space-y-3">
          <p className="font-medium text-slate-700">하이브리드 연동 안내</p>
          <p>
            <strong>G6:</strong> LawGo는 중간 관리자(API 브릿지)를 통해 G6와 통신합니다. 설정은{" "}
            <code className="bg-white px-1 rounded">.env.local</code>의{" "}
            <code className="bg-white px-1 rounded">NEXT_PUBLIC_GNUBOARD_API_URL</code>에서 확인하세요.
          </p>
          <p>
            <strong>Gemini:</strong> AI·문서 엔진은 Google Gemini와 연동됩니다.{" "}
            <code className="bg-white px-1 rounded">GOOGLE_GEMINI_API_KEY</code> 또는{" "}
            <code className="bg-white px-1 rounded">GEMINI_API_KEY</code>를 env에 설정하세요.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
