"use client";

import { motion } from "framer-motion";
import { mockCases } from "@/lib/mockData";
import { cn, formatAmount } from "@/lib/utils";
import { BarChart3, TrendingUp, FolderOpen, DollarSign, Award, Target } from "lucide-react";

const monthlyRevenue = [
  { month: "10월", value: 8500000 },
  { month: "11월", value: 10200000 },
  { month: "12월", value: 7800000 },
  { month: "1월",  value: 9100000 },
  { month: "2월",  value: 11400000 },
  { month: "3월",  value: 12500000 },
];

export default function StatsPage() {
  const byType = mockCases.reduce<Record<string, number>>((acc, c) => {
    acc[c.caseType] = (acc[c.caseType] ?? 0) + 1;
    return acc;
  }, {});

  const byStatus = mockCases.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {});

  const byStaff = mockCases.reduce<Record<string, number>>((acc, c) => {
    acc[c.assignedStaff] = (acc[c.assignedStaff] ?? 0) + 1;
    return acc;
  }, {});

  const totalAmount = mockCases.reduce((sum, c) => sum + c.amount, 0);
  const totalPending = mockCases.reduce((sum, c) => sum + c.pendingAmount, 0);
  const totalReceived = mockCases.reduce((sum, c) => sum + c.receivedAmount, 0);
  const maxTypeVal = Math.max(...Object.values(byType));
  const maxRevenue = Math.max(...monthlyRevenue.map((d) => d.value));

  const statusColors: Record<string, string> = {
    진행중: "bg-primary-500",
    종결: "bg-slate-300",
    사임: "bg-slate-400",
  };

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">통계 / 분석</h1>
        <p className="text-sm text-text-muted mt-0.5">사건 현황 및 수임료 분석 대시보드</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "전체 사건", value: mockCases.length + "건", icon: <FolderOpen size={16} />, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "진행 중", value: (byStatus["진행중"] ?? 0) + "건", icon: <TrendingUp size={16} />, color: "text-success-600", bg: "bg-success-50" },
          { label: "총 수임료", value: formatAmount(totalAmount), icon: <DollarSign size={16} />, color: "text-slate-700", bg: "bg-slate-100" },
          { label: "미수금 총액", value: formatAmount(totalPending), icon: <BarChart3 size={16} />, color: "text-danger-600", bg: "bg-danger-50" },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-card p-5"
          >
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", stat.bg)}>
              <span className={stat.color}>{stat.icon}</span>
            </div>
            <div className={cn("text-2xl font-bold tabular-nums", stat.color)}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Monthly Revenue Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-5">월별 수임료 추이</h3>
        <div className="flex items-end gap-3 h-40">
          {monthlyRevenue.map((d, i) => {
            const heightPct = (d.value / maxRevenue) * 100;
            const isCurrent = i === monthlyRevenue.length - 1;
            return (
              <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5 group">
                <div className="text-xs text-text-muted tabular-nums opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  {(d.value / 1000000).toFixed(1)}M
                </div>
                <div className="w-full relative" style={{ height: "120px" }}>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: "easeOut" }}
                    className={cn(
                      "absolute bottom-0 w-full rounded-t-lg",
                      isCurrent ? "bg-primary-600" : "bg-primary-200 group-hover:bg-primary-300 transition-colors"
                    )}
                  />
                </div>
                <div className={cn("text-xs font-medium", isCurrent ? "text-primary-600 font-bold" : "text-text-muted")}>
                  {d.month}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 text-sm">
          <div>
            <span className="text-text-muted">이번 달 수납</span>
            <span className="font-bold text-success-600 ml-2 tabular-nums">{formatAmount(totalReceived)}</span>
          </div>
          <div>
            <span className="text-text-muted">미수금</span>
            <span className="font-bold text-danger-600 ml-2 tabular-nums">{formatAmount(totalPending)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Case by type */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">사건 종류별</h3>
          <div className="space-y-3">
            {Object.entries(byType).sort(([, a], [, b]) => b - a).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-slate-600 w-12 flex-shrink-0">{type}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxTypeVal) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="h-full bg-primary-500 rounded-full"
                  />
                </div>
                <span className="text-sm font-bold text-slate-800 w-4 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">진행 상태별</h3>
          <div className="space-y-3">
            {["진행중", "종결", "사임"].map((status) => {
              const count = byStatus[status] ?? 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full flex-shrink-0", statusColors[status])} />
                    <span className="text-sm text-slate-700">{status}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / mockCases.length) * 100}%` }}
                        transition={{ duration: 0.5 }}
                        className={cn("h-full rounded-full", statusColors[status])}
                      />
                    </div>
                    <span className="text-sm font-bold text-slate-800 tabular-nums w-4">{count}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff leaderboard */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">담당자별 사건 수</h3>
          <div className="space-y-3">
            {Object.entries(byStaff)
              .sort(([, a], [, b]) => b - a)
              .map(([staff, count], i) => (
                <div key={staff} className="flex items-center gap-3">
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    i === 0 ? "bg-warning-400 text-white" :
                    i === 1 ? "bg-slate-300 text-white" :
                    "bg-slate-200 text-slate-600"
                  )}>
                    {i === 0 ? <Award size={11} /> : i + 1}
                  </div>
                  <span className="flex-1 text-sm text-slate-700">{staff}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(count / Math.max(...Object.values(byStaff))) * 100}%` }}
                        transition={{ duration: 0.5, delay: i * 0.1 }}
                        className="h-full bg-primary-400 rounded-full"
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums text-slate-800 w-4">{count}</span>
                  </div>
                </div>
              ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Target size={12} />
              월 목표: 5건 · 달성률 {Math.round((Object.values(byStaff)[0] / 5) * 100)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
