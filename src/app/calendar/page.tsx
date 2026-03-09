"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Scale } from "lucide-react";
import Link from "next/link";
import { mockCases, mockConsultations } from "@/lib/mockData";
import { getDDay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { getDeadlinesForDate } from "@/lib/deadlineStorage";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

/** API 기일 항목 (달력 셀 표시용) */
type ApiDeadlineItem = { id: string; date: string; caseNumber: string; type?: string };

export default function CalendarPage() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [apiDeadlines, setApiDeadlines] = useState<ApiDeadlineItem[]>([]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const dateFrom = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const dateTo = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const fetchDeadlines = useCallback(() => {
    fetch(`/api/deadlines?dateFrom=${dateFrom}&dateTo=${dateTo}`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setApiDeadlines((json.data ?? []).map((d: { id: string; date: string; caseNumber?: string; type?: string }) => ({
        id: d.id,
        date: d.date,
        caseNumber: d.caseNumber ?? "",
        type: d.type,
      }))))
      .catch(() => setApiDeadlines([]));
  }, [dateFrom, dateTo]);
  useEffect(() => {
    fetchDeadlines();
  }, [fetchDeadlines]);
  useEffect(() => {
    const onFocus = () => fetchDeadlines();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDeadlines]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = lastDay;
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let i = 1; i <= daysInMonth; i++) cells.push(i);

  const getDateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getCasesForDay = (day: number) => {
    const dateStr = getDateStr(day);
    return mockCases.filter((c) => c.nextDate === dateStr);
  };
  const getConsultationsForDay = (day: number) => {
    const dateStr = getDateStr(day);
    return mockConsultations.filter((c) => c.consultationDate === dateStr && c.status !== "cancelled");
  };

  const getDeadlinesForDay = (day: number) => {
    const dateStr = getDateStr(day);
    const local = getDeadlinesForDate(dateStr);
    const fromApi = apiDeadlines.filter((d) => d.date === dateStr).map((d) => ({
      id: d.id,
      date: d.date,
      caseNumber: d.caseNumber || d.type || "기일",
      type: d.type,
      status: "active" as const,
      createdAt: "",
      updatedAt: "",
    }));
    return [...fromApi, ...local];
  };

  const openManagePopup = (date: string) => {
    const url = `/calendar/manage?date=${date}`;
    window.open(url, "calendar-manage", "width=520,height=680,scrollbars=yes,resizable=yes");
  };
  const openManagePopupToday = () => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    openManagePopup(`${y}-${m}-${d}`);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">기일 달력</h1>
          <p className="text-sm text-text-muted mt-0.5">{year}년 {MONTHS[month]}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openManagePopupToday}
            className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1"
          >
            <Scale size={14} /> 기일관리
          </button>
          <Link href="/consultation" className="text-sm font-medium text-primary-600 hover:underline flex items-center gap-1">
            <CalendarDays size={14} /> 상담 일정
          </Link>
          <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="text-sm font-medium text-primary-600 hover:underline px-2"
          >
            오늘
          </button>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-600 transition-colors">
            <ChevronRight size={16} />
          </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        {/* Weekday header */}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={cn(
                "text-center py-3 text-xs font-semibold uppercase tracking-wide",
                i === 0 ? "text-danger-500" : i === 6 ? "text-primary-500" : "text-slate-500"
              )}
            >
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const isWeekend = idx % 7 === 0 || idx % 7 === 6;
            const cases = day ? getCasesForDay(day) : [];
            const consultations = day ? getConsultationsForDay(day) : [];
            const deadlines = day ? getDeadlinesForDay(day) : [];
            const dateStr = day ? getDateStr(day) : "";
            const hasUrgent = cases.some((c) => c.nextDate && getDDay(c.nextDate) <= 0);
            const totalCount = cases.length + deadlines.length;

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-24 p-2 border-b border-r border-slate-100 transition-colors",
                  day ? "hover:bg-slate-50" : "bg-slate-50/50",
                  isToday && "bg-primary-50/60",
                  hasUrgent && "bg-danger-50/30"
                )}
              >
                {day ? (
                  <>
                    <div className={cn(
                      "w-6 h-6 flex items-center justify-center text-sm font-medium rounded-full mb-1",
                      isToday ? "bg-primary-600 text-white" :
                      isWeekend ? (idx % 7 === 0 ? "text-danger-500" : "text-primary-500") : "text-slate-700"
                    )}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {cases.slice(0, 3).map((c) => {
                        const dday = getDDay(c.nextDate!);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={(e) => { e.preventDefault(); openManagePopup(dateStr); }}
                            className={cn(
                              "w-full text-left text-xs rounded px-1.5 py-0.5 truncate font-medium block",
                              dday <= 0 ? "bg-danger-100 text-danger-700 hover:bg-danger-200" :
                              dday <= 3 ? "bg-warning-100 text-warning-700 hover:bg-warning-200" :
                              "bg-primary-100 text-primary-700 hover:bg-primary-200"
                            )}
                          >
                            {c.caseNumber}
                          </button>
                        );
                      })}
                      {deadlines.slice(0, Math.max(0, 3 - cases.length)).map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={(e) => { e.preventDefault(); openManagePopup(dateStr); }}
                          className="w-full text-left text-xs rounded px-1.5 py-0.5 truncate font-medium block bg-slate-100 text-slate-700 hover:bg-slate-200"
                        >
                          {d.caseNumber}
                        </button>
                      ))}
                      {cases.length + deadlines.length > 3 && (
                        <button
                          type="button"
                          onClick={() => openManagePopup(dateStr)}
                          className="text-xs text-text-muted pl-1 hover:underline"
                        >
                          +{totalCount - 3}건
                        </button>
                      )}
                      {totalCount === 0 && (
                        <button
                          type="button"
                          onClick={() => openManagePopup(dateStr)}
                          className="text-xs text-slate-400 hover:text-primary-600 hover:underline"
                        >
                          기일 보기/등록
                        </button>
                      )}
                      {consultations.length > 0 && (
                        <Link
                          href={`/consultation?date=${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`}
                          className="text-xs text-warning-600 hover:underline block truncate"
                        >
                          상담 {consultations.length}건
                        </Link>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-slate-300 font-medium">
                    {daysInPrevMonth - firstDay + idx + 1}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
