"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, ArrowRight, Check, AlertCircle, TrendingUp, DollarSign, Link2 } from "lucide-react";
import { mockBankTransactions, mockFinanceEntries } from "@/lib/mockData";
import { cn, formatDate, formatAmount } from "@/lib/utils";
import type { BankTransaction, FinanceEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

type MatchPair = { transactionId: string; entryId: string };

export default function FinancePage() {
  const [transactions, setTransactions] = useState(mockBankTransactions);
  const [entries, setEntries] = useState(mockFinanceEntries);
  const [matched, setMatched] = useState<MatchPair[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [justMatched, setJustMatched] = useState<string | null>(null);

  const handleMatch = (transactionId: string, entryId: string) => {
    const alreadyMatched = matched.find(
      (m) => m.transactionId === transactionId || m.entryId === entryId
    );
    if (alreadyMatched) return;

    setMatched((prev) => [...prev, { transactionId, entryId }]);
    setJustMatched(`${transactionId}-${entryId}`);
    setTimeout(() => setJustMatched(null), 2000);

    toast.success("수납 매칭이 완료되었습니다!", {
      description: "회계 처리 후 확인 버튼을 눌러주세요.",
    });
  };

  const isTransactionMatched = (id: string) => matched.some((m) => m.transactionId === id);
  const isEntryMatched = (id: string) => matched.some((m) => m.entryId === id);

  const getMatchedEntry = (transactionId: string) => {
    const pair = matched.find((m) => m.transactionId === transactionId);
    if (!pair) return null;
    return entries.find((e) => e.id === pair.entryId) ?? null;
  };

  const getFuzzyScore = (transaction: BankTransaction, entry: FinanceEntry): number => {
    const tName = transaction.depositorName.replace(/\s/g, "").toLowerCase();
    const eName = entry.clientName.replace(/\s/g, "").toLowerCase();
    const nameMatch = tName.includes(eName) || eName.includes(tName) ? 1 : 0;
    const amountMatch = Math.abs(transaction.amount - entry.amount) < 100000 ? 1 : 0;
    return nameMatch * 0.6 + amountMatch * 0.4;
  };

  const isFuzzyMatch = (transaction: BankTransaction, entry: FinanceEntry): boolean => {
    return getFuzzyScore(transaction, entry) >= 0.5;
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">회계 / 수납 관리</h1>
          <p className="text-sm text-text-muted mt-0.5">
            미매칭 입금 <span className="text-danger-600 font-semibold">{transactions.filter(t => !isTransactionMatched(t.id)).length}건</span>
            &nbsp;·&nbsp;
            미수금 <span className="text-warning-600 font-semibold">{entries.filter(e => !isEntryMatched(e.id)).length}건</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" leftIcon={<TrendingUp size={13} />}>
            통계 보기
          </Button>
          <Button size="sm" leftIcon={<DollarSign size={13} />}>
            수납 등록
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "이번 달 수납", value: "12,500,000원", color: "text-success-600", bg: "bg-success-50" },
          { label: "미수금 총액", value: "14,500,000원", color: "text-danger-600", bg: "bg-danger-50" },
          { label: "매칭 완료", value: `${matched.length}건`, color: "text-primary-600", bg: "bg-primary-50" },
          { label: "처리 대기", value: `${transactions.length - matched.length}건`, color: "text-warning-600", bg: "bg-warning-50" },
        ].map((stat) => (
          <div key={stat.label} className={cn("rounded-xl p-4 border border-transparent", stat.bg)}>
            <div className={cn("text-2xl font-bold tabular-nums", stat.color)}>{stat.value}</div>
            <div className="text-xs text-text-muted mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Drag-to-match interface */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <Link2 size={16} className="text-primary-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-800">수납 매칭 인터페이스</h3>
            <p className="text-xs text-text-muted mt-0.5">
              입금 내역을 청구서로 드래그하거나 클릭하여 매칭하세요.
              <span className="text-primary-600 font-medium ml-1">파란색 반짝임 = 추천 매칭</span>
            </p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Bank transactions */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-success-500" />
                <span className="text-sm font-semibold text-slate-700">미확인 입금 내역</span>
                <span className="text-xs text-text-muted bg-slate-100 rounded-full px-2 py-0.5">
                  {transactions.filter(t => !isTransactionMatched(t.id)).length}건
                </span>
              </div>
              <div className="space-y-3">
                {transactions.map((t) => {
                  const matched_ = isTransactionMatched(t.id);
                  const matchedEntry = getMatchedEntry(t.id);

                  return (
                    <motion.div
                      key={t.id}
                      layout
                      draggable={!matched_}
                      onDragStart={() => setDraggingId(t.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-200",
                        matched_
                          ? "border-success-200 bg-success-50 opacity-70"
                          : "border-slate-200 bg-white cursor-grab active:cursor-grabbing",
                        !matched_ && "hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5",
                        draggingId === t.id && "shadow-xl rotate-1 border-primary-400 z-10"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{formatAmount(t.amount)}</div>
                          <div className="text-sm font-medium text-slate-700 mt-0.5">{t.depositorName}</div>
                        </div>
                        {matched_ ? (
                          <div className="flex items-center gap-1 text-xs text-success-700 font-medium bg-success-100 rounded-full px-2 py-0.5">
                            <Check size={11} /> 매칭 완료
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted">{t.bankName}</span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted">
                        {formatDate(t.date)} · {t.memo}
                      </div>
                      {matched_ && matchedEntry && (
                        <div className="mt-2 pt-2 border-t border-success-200 text-xs text-success-700 font-medium">
                          → {matchedEntry.clientName} / {matchedEntry.caseNumber}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex items-start justify-center pt-12 absolute left-1/2 -translate-x-1/2">
              <ArrowRight size={20} className="text-slate-300" />
            </div>

            {/* Right: Finance entries */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-warning-500" />
                <span className="text-sm font-semibold text-slate-700">미수금 청구서</span>
                <span className="text-xs text-text-muted bg-slate-100 rounded-full px-2 py-0.5">
                  {entries.filter(e => !isEntryMatched(e.id)).length}건
                </span>
              </div>
              <div className="space-y-3">
                {entries.map((entry) => {
                  const isMatched_ = isEntryMatched(entry.id);
                  const isDragTarget = dragOverId === entry.id;

                  const suggestedTransaction = draggingId
                    ? transactions.find((t) => t.id === draggingId && isFuzzyMatch(t, entry))
                    : null;

                  const hasFuzzyMatch =
                    !isMatched_ &&
                    transactions.some((t) => !isTransactionMatched(t.id) && isFuzzyMatch(t, entry));

                  return (
                    <motion.div
                      key={entry.id}
                      layout
                      animate={
                        justMatched && matched.find(m => m.entryId === entry.id && justMatched.includes(entry.id))
                          ? { scale: [1, 1.05, 1] }
                          : {}
                      }
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOverId(entry.id);
                      }}
                      onDragLeave={() => setDragOverId(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingId && !isMatched_) {
                          handleMatch(draggingId, entry.id);
                        }
                        setDragOverId(null);
                      }}
                      onClick={() => {
                        if (draggingId && !isMatched_) {
                          handleMatch(draggingId, entry.id);
                        }
                      }}
                      className={cn(
                        "rounded-xl border p-4 transition-all duration-200 relative overflow-hidden",
                        isMatched_
                          ? "border-success-200 bg-success-50 opacity-70"
                          : isDragTarget
                          ? "border-primary-400 bg-primary-50 scale-[1.02] shadow-primary-glow"
                          : hasFuzzyMatch
                          ? "border-primary-300 bg-primary-50/50 shadow-sm"
                          : "border-slate-200 bg-white",
                        !isMatched_ && draggingId && "cursor-pointer"
                      )}
                    >
                      {/* Fuzzy match highlight */}
                      {hasFuzzyMatch && !isMatched_ && (
                        <div className="absolute inset-0 rounded-xl border-2 border-primary-400 opacity-0 animate-ping pointer-events-none" style={{ animationDuration: "2s" }} />
                      )}

                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{formatAmount(entry.amount)}</div>
                          <div className="text-sm font-medium text-slate-700 mt-0.5">{entry.clientName}</div>
                        </div>
                        {isMatched_ ? (
                          <div className="flex items-center gap-1 text-xs text-success-700 font-medium bg-success-100 rounded-full px-2 py-0.5">
                            <Check size={11} /> 매칭 완료
                          </div>
                        ) : hasFuzzyMatch ? (
                          <span className="text-xs text-primary-600 font-medium bg-primary-100 rounded-full px-2 py-0.5 animate-pulse">
                            추천
                          </span>
                        ) : (
                          <span className="text-xs text-warning-600 font-medium bg-warning-100 rounded-full px-2 py-0.5">
                            미수금
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-text-muted">
                        {entry.caseNumber} · {entry.description}
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">
                        청구일: {formatDate(entry.date)}
                      </div>

                      {isDragTarget && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="absolute inset-0 bg-primary-600/5 rounded-xl flex items-center justify-center"
                        >
                          <div className="bg-primary-600 text-white text-xs font-bold rounded-full px-3 py-1.5 shadow-lg">
                            여기에 드롭하여 매칭
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Matched pairs confirmation */}
          {matched.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 pt-6 border-t border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800">매칭 완료 ({matched.length}건)</h4>
                <Button
                  variant="success"
                  size="sm"
                  leftIcon={<Check size={13} />}
                  onClick={() => toast.success(`${matched.length}건 수납 처리가 완료되었습니다.`)}
                >
                  전체 확정
                </Button>
              </div>
              <div className="space-y-2">
                {matched.map((pair) => {
                  const t = transactions.find((t) => t.id === pair.transactionId)!;
                  const e = entries.find((e) => e.id === pair.entryId)!;
                  return (
                    <div key={`${pair.transactionId}-${pair.entryId}`} className="match-stamp flex items-center gap-3 p-3 bg-success-50 border border-success-200 rounded-xl">
                      <div className="text-sm font-medium text-slate-800">{t.depositorName}</div>
                      <ArrowRight size={14} className="text-success-500 flex-shrink-0" />
                      <div className="text-sm font-medium text-slate-800">{e.clientName} ({e.caseNumber})</div>
                      <div className="ml-auto text-sm font-bold text-success-700 tabular-nums">
                        {formatAmount(t.amount)}
                      </div>
                      <div className="bg-success-600 text-white text-xs font-bold rounded-full px-2.5 py-1 flex items-center gap-1">
                        <Check size={10} /> 매칭
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
