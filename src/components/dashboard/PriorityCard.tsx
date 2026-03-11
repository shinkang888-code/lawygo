"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { getDDay, getDDayLabel, formatDate } from "@/lib/utils";
import type { CaseItem } from "@/lib/types";
import { Eye, UserCheck, CalendarClock, AlertTriangle, Zap } from "lucide-react";

interface PriorityCardProps {
  cases: CaseItem[];
  type: "today" | "3days" | "7days";
}

const cardConfig = {
  today: {
    title: "오늘 기일",
    subtitle: "D-Day",
    bgClass: "bg-gradient-to-br from-danger-600 to-danger-700",
    borderClass: "border-danger-500/30",
    textClass: "text-white",
    subtitleClass: "text-danger-100",
    countBg: "bg-white/20",
    isGlow: true,
  },
  "3days": {
    title: "3일 이내",
    subtitle: "D-3",
    bgClass: "bg-gradient-to-br from-warning-500 to-warning-600",
    borderClass: "border-warning-400/30",
    textClass: "text-white",
    subtitleClass: "text-warning-100",
    countBg: "bg-white/20",
    isGlow: false,
  },
  "7days": {
    title: "7일 이내",
    subtitle: "D-7",
    bgClass: "bg-gradient-to-br from-primary-600 to-primary-700",
    borderClass: "border-primary-500/30",
    textClass: "text-white",
    subtitleClass: "text-primary-100",
    countBg: "bg-white/20",
    isGlow: false,
  },
};

export function PriorityCard({ cases, type }: PriorityCardProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const config = cardConfig[type];

  const filteredCases = cases.filter((c) => {
    if (!c.nextDate) return false;
    const dday = getDDay(c.nextDate);
    if (type === "today") return dday === 0;
    if (type === "3days") return dday > 0 && dday <= 3;
    return dday > 3 && dday <= 7;
  });

  const openDeadlineManage = (c: CaseItem) => {
    if (!c.nextDate || typeof window === "undefined") return;
    const url = `/calendar/manage?date=${encodeURIComponent(c.nextDate)}`;
    const w = 520;
    const h = 720;
    const left = Math.max(0, (window.screen.width - w) / 2);
    const top = Math.max(0, (window.screen.height - h) / 2);
    window.open(
      url,
      "calendar-manage",
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl p-5 border relative overflow-hidden",
        config.bgClass,
        config.borderClass,
        config.isGlow && filteredCases.length > 0 && "danger-pulse"
      )}
    >
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full bg-white/30" />
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/20" />
      </div>

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className={cn("text-xs font-medium uppercase tracking-wider mb-0.5", config.subtitleClass)}>
              {config.subtitle}
            </div>
            <div className={cn("text-2xl font-bold", config.textClass)}>
              {filteredCases.length}
              <span className={cn("text-sm font-normal ml-1", config.subtitleClass)}>건</span>
            </div>
            <div className={cn("text-sm font-semibold mt-0.5", config.textClass)}>{config.title}</div>
          </div>
          {type === "today" && filteredCases.length > 0 && (
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <AlertTriangle size={18} className="text-white" />
            </div>
          )}
        </div>

        {/* Cases list */}
        <div className="space-y-2">
          {filteredCases.length === 0 ? (
            <div className={cn("text-sm text-center py-3", config.subtitleClass)}>
              해당 기일 없음
            </div>
          ) : (
            filteredCases.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="relative"
                onMouseEnter={() => setHoveredId(c.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className={cn(
                  "bg-white/15 backdrop-blur-sm rounded-lg px-3 py-2.5 cursor-pointer",
                  "transition-all duration-200 hover:bg-white/25"
                )}
                  onClick={() => openDeadlineManage(c)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {c.isElectronic && <Zap size={12} className="text-yellow-200 flex-shrink-0" />}
                      <span className={cn("text-sm font-semibold truncate", config.textClass)}>
                        {c.caseNumber}
                      </span>
                    </div>
                    <span className={cn("text-xs flex-shrink-0 ml-2", config.subtitleClass)}>
                      {c.nextDateType}
                    </span>
                  </div>
                  <div className={cn("text-xs truncate mt-0.5", config.subtitleClass)}>
                    {c.clientName} · {c.court}
                  </div>
                </div>

                {/* Quick Action Bar (hover) */}
                <AnimatePresence>
                  {hoveredId === c.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-sm rounded-b-lg px-2 py-1.5 flex items-center gap-1"
                    >
                      <button
                        className="flex-1 flex items-center justify-center gap-1 text-xs text-white/80 hover:text-white py-0.5 rounded hover:bg-white/10 transition-colors"
                        onClick={() => openDeadlineManage(c)}
                      >
                        <Eye size={11} /> 상세
                      </button>
                      <div className="w-px h-3 bg-white/20" />
                      <button className="flex-1 flex items-center justify-center gap-1 text-xs text-white/80 hover:text-white py-0.5 rounded hover:bg-white/10 transition-colors">
                        <UserCheck size={11} /> 호출
                      </button>
                      <div className="w-px h-3 bg-white/20" />
                      <button className="flex-1 flex items-center justify-center gap-1 text-xs text-white/80 hover:text-white py-0.5 rounded hover:bg-white/10 transition-colors">
                        <CalendarClock size={11} /> 변경
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {filteredCases.length > 3 && (
          <div className={cn("text-xs text-center mt-2 cursor-pointer hover:underline", config.subtitleClass)}>
            +{filteredCases.length - 3}건 더 보기
          </div>
        )}
      </div>
    </div>
  );
}
