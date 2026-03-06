"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PriorityCard } from "@/components/dashboard/PriorityCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { mockCases, mockDashboardStats, mockApprovals } from "@/lib/mockData";
import { formatDate, getDDay } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { StatusBadge, DDayBadge, ElectronicBadge } from "@/components/ui/badge";
import {
  FolderOpen, AlertTriangle, FileCheck, CreditCard,
  Coffee, TrendingUp, Clock, CalendarDays, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDeleteModal } from "@/components/ui/confirm-modal";
import { toast } from "@/components/ui/toast";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.2 } },
};

export default function DashboardPage() {
  const [deleteTarget, setDeleteTarget] = useState<{ caseNumber: string; id: string } | null>(null);

  const myTasks = mockCases.filter(
    (c) => c.assignedStaff === "김민준" || c.assistants.includes("김민준")
  );

  const upcomingCases = mockCases
    .filter((c) => c.nextDate && getDDay(c.nextDate) >= 0 && getDDay(c.nextDate) <= 14)
    .sort((a, b) => new Date(a.nextDate!).getTime() - new Date(b.nextDate!).getTime());

  return (
    <div className="p-4 sm:p-6 max-w-screen-2xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">

        {/* Page header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">업무 대시보드</h1>
            <p className="text-sm text-text-muted mt-0.5">
              {new Date().toLocaleDateString("ko-KR", {
                year: "numeric", month: "long", day: "numeric", weekday: "long",
              })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/calendar">
              <Button variant="outline" size="sm" leftIcon={<CalendarDays size={14} />}>기일 달력</Button>
            </Link>
            <Link href="/cases/new">
              <Button size="sm" leftIcon={<FolderOpen size={14} />}>사건 등록</Button>
            </Link>
          </div>
        </motion.div>

        {/* Priority deadline cards */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-danger-600" />
            <h2 className="text-sm font-semibold text-slate-800">기일 현황</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PriorityCard cases={mockCases} type="today" />
            <PriorityCard cases={mockCases} type="3days" />
            <PriorityCard cases={mockCases} type="7days" />
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard title="전체 진행 사건" value={mockDashboardStats.totalActiveCases} unit="건" icon={<FolderOpen size={16} />} color="blue" change={12} />
          <StatCard title="결재 대기" value={mockDashboardStats.pendingApprovals} unit="건" icon={<FileCheck size={16} />} color="yellow" />
          <StatCard title="미수금" value={mockDashboardStats.pendingPayments} unit="건" icon={<CreditCard size={16} />} color="red" />
          <StatCard title="이번 달 수임료" value={mockDashboardStats.totalMonthlyIncome} icon={<TrendingUp size={16} />} color="green" isAmount change={8} />
        </motion.div>

        {/* Revenue chart */}
        <motion.div variants={itemVariants}>
          <RevenueChart />
        </motion.div>

        {/* Main grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-12 gap-5">

          {/* My Tasks Table */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-primary-600" />
                  <h3 className="text-sm font-semibold text-slate-800">내 담당 사건</h3>
                  <span className="text-xs text-text-muted bg-slate-100 rounded-full px-2 py-0.5">{myTasks.length}건</span>
                </div>
                <Link href="/cases" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
                  전체 보기 <ArrowRight size={12} />
                </Link>
              </div>

              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Coffee size={36} className="text-slate-300 mb-3" />
                  <div className="text-sm font-medium text-slate-600">오늘 예정된 급한 기일이 없습니다.</div>
                  <div className="text-xs text-text-muted mt-1">여유로운 하루 되세요 ☕</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/70 text-xs text-text-muted font-medium">
                        <th className="text-left px-4 py-2.5">사건번호</th>
                        <th className="text-left px-4 py-2.5">사건명</th>
                        <th className="text-left px-4 py-2.5 hidden md:table-cell">법원</th>
                        <th className="text-left px-4 py-2.5">다음 기일</th>
                        <th className="text-left px-4 py-2.5">상태</th>
                        <th className="text-left px-4 py-2.5 hidden lg:table-cell">D-Day</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myTasks.map((c) => {
                        const dday = c.nextDate ? getDDay(c.nextDate) : null;
                        return (
                          <tr
                            key={c.id}
                            className={cn(
                              "border-t border-slate-50 text-sm transition-colors cursor-pointer group",
                              "hover:bg-primary-50/60",
                              dday !== null && dday <= 0 && "bg-danger-50/50"
                            )}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                {c.isElectronic && <ElectronicBadge />}
                                <Link href={`/cases/${c.id}`} className="text-primary-600 font-semibold hover:underline text-sm">
                                  {c.caseNumber}
                                </Link>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-slate-800 font-medium">{c.caseName}</div>
                              <div className="text-xs text-text-muted">{c.clientName}</div>
                            </td>
                            <td className="px-4 py-3 text-text-muted hidden md:table-cell text-xs">{c.court}</td>
                            <td className="px-4 py-3">
                              {c.nextDate ? (
                                <div>
                                  <div className={cn("text-sm font-medium tabular-nums", dday !== null && dday <= 0 ? "text-danger-600" : "text-slate-800")}>
                                    {formatDate(c.nextDate)}
                                  </div>
                                  <div className="text-xs text-text-muted">{c.nextDateType}</div>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">미정</span>
                              )}
                            </td>
                            <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                            <td className="px-4 py-3 hidden lg:table-cell">
                              {dday !== null && <DDayBadge dday={dday} />}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="col-span-12 lg:col-span-4 space-y-4">

            {/* Pending Approvals */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <FileCheck size={14} className="text-warning-500" />
                  <span className="text-sm font-semibold text-slate-800">결재 대기</span>
                </div>
                <span className="text-xs bg-warning-100 text-warning-700 font-bold rounded-full px-2 py-0.5">
                  {mockApprovals.length}
                </span>
              </div>
              <div className="divide-y divide-slate-50">
                {mockApprovals.map((ap) => (
                  <Link key={ap.id} href="/approval" className="block px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                    <div className="text-sm font-medium text-slate-800 truncate">{ap.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-text-muted">{ap.requesterName} 요청</span>
                      <span className="text-xs text-warning-600 font-medium">결재요청</span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2.5 bg-slate-50">
                <Link href="/approval" className="text-xs text-primary-600 font-medium hover:underline flex items-center gap-1">
                  결재함 바로가기 <ArrowRight size={11} />
                </Link>
              </div>
            </div>

            {/* Upcoming deadlines */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-primary-600" />
                  <span className="text-sm font-semibold text-slate-800">다가오는 기일</span>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {upcomingCases.slice(0, 5).map((c) => {
                  const dday = getDDay(c.nextDate!);
                  return (
                    <Link key={c.id} href={`/cases/${c.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <div className={cn(
                        "text-center w-10 flex-shrink-0 rounded-lg py-1",
                        dday === 0 ? "bg-danger-100" : dday <= 3 ? "bg-warning-100" : "bg-slate-100"
                      )}>
                        <div className={cn(
                          "text-lg font-bold leading-none",
                          dday === 0 ? "text-danger-600" : dday <= 3 ? "text-warning-600" : "text-slate-700"
                        )}>
                          {new Date(c.nextDate!).getDate()}
                        </div>
                        <div className="text-xs text-text-muted">
                          {new Date(c.nextDate!).toLocaleDateString("ko-KR", { month: "short" })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{c.caseName}</div>
                        <div className="text-xs text-text-muted">{c.caseNumber} · {c.nextDateType}</div>
                      </div>
                      <DDayBadge dday={dday} />
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* 2중 안전장치 삭제 모달 (예시 트리거) */}
      <ConfirmDeleteModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          toast.success(`사건 ${deleteTarget?.caseNumber}이 삭제되었습니다.`);
          setDeleteTarget(null);
        }}
        caseNumber={deleteTarget?.caseNumber ?? ""}
      />
    </div>
  );
}
