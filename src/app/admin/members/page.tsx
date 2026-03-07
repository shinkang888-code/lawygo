"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Check, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface Member {
  id: string;
  login_id: string;
  management_number: string;
  status: string;
  name: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoginIds, setBulkLoginIds] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/members", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "목록 조회 실패");
      setMembers(data.members ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "목록 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const pending = members.filter((m) => m.status === "pending");
  const approved = members.filter((m) => m.status === "approved");

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (selectedIds.size === pending.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(pending.map((m) => m.id)));
  };

  const handleApprove = async () => {
    const ids = Array.from(selectedIds);
    const loginIds = bulkLoginIds.trim() ? bulkLoginIds.trim().split(/[\s,]+/).filter(Boolean) : [];
    if (ids.length === 0 && loginIds.length === 0) {
      toast.error("승인할 회원을 선택하거나 아이디를 입력하세요.");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/members/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, loginIds }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "승인 실패");
      toast.success(`${data.count ?? 0}건 승인되었습니다.`);
      setSelectedIds(new Set());
      setBulkLoginIds("");
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "승인 실패");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    const loginIds = bulkLoginIds.trim() ? bulkLoginIds.trim().split(/[\s,]+/).filter(Boolean) : [];
    if (ids.length === 0 && loginIds.length === 0) {
      toast.error("삭제할 회원을 선택하거나 아이디를 입력하세요.");
      return;
    }
    if (!confirm("선택한 회원을 삭제하시겠습니까?")) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, loginIds }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제 실패");
      toast.success(`${data.count ?? 0}건 삭제되었습니다.`);
      setSelectedIds(new Set());
      setBulkLoginIds("");
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
    } catch {
      return s;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings" className="p-2 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="설정으로">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-primary-500" />
            회원 관리
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            대기 회원 승인 또는 회원 신청 삭제. 아이디를 직접 입력해 일괄 처리할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 일괄 처리: 아이디 직접 입력 */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-2">아이디로 일괄 처리</h3>
        <p className="text-xs text-slate-500 mb-2">쉼표 또는 공백으로 구분하여 여러 아이디 입력</p>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={bulkLoginIds}
            onChange={(e) => setBulkLoginIds(e.target.value)}
            placeholder="예: user1, user2, user3"
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <Button size="sm" leftIcon={<Check size={14} />} onClick={handleApprove} disabled={actionLoading}>
            입력 아이디 일괄 승인
          </Button>
          <Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} onClick={handleDelete} disabled={actionLoading}>
            입력 아이디 일괄 삭제
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500">불러오는 중...</div>
      ) : (
        <>
          {/* 대기 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">승인 대기 ({pending.length}명)</h3>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pending.length > 0 && selectedIds.size === pending.length}
                    onChange={toggleSelectAllPending}
                  />
                  전체 선택
                </label>
                <Button size="sm" leftIcon={<Check size={14} />} onClick={handleApprove} disabled={actionLoading || selectedIds.size === 0}>
                  선택 승인
                </Button>
                <Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} onClick={handleDelete} disabled={actionLoading || selectedIds.size === 0}>
                  선택 삭제
                </Button>
                <Button size="sm" variant="ghost" onClick={fetchMembers} disabled={loading}>
                  <RefreshCw size={14} />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left p-3 w-10">선택</th>
                    <th className="text-left p-3">아이디</th>
                    <th className="text-left p-3">이름</th>
                    <th className="text-left p-3">관리번호</th>
                    <th className="text-left p-3">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">대기 중인 회원이 없습니다.</td>
                    </tr>
                  ) : (
                    pending.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(m.id)}
                            onChange={() => toggleSelect(m.id)}
                          />
                        </td>
                        <td className="p-3 font-medium">{m.login_id}</td>
                        <td className="p-3">{m.name ?? "-"}</td>
                        <td className="p-3 text-slate-600">{m.management_number}</td>
                        <td className="p-3 text-slate-500">{formatDate(m.created_at)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 승인 완료 목록 */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">승인 완료 ({approved.length}명)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left p-3">아이디</th>
                    <th className="text-left p-3">이름</th>
                    <th className="text-left p-3">관리번호</th>
                    <th className="text-left p-3">가입일</th>
                    <th className="text-left p-3">승인일</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-slate-500">승인된 회원이 없습니다.</td>
                    </tr>
                  ) : (
                    approved.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3 font-medium">{m.login_id}</td>
                        <td className="p-3">{m.name ?? "-"}</td>
                        <td className="p-3 text-slate-600">{m.management_number}</td>
                        <td className="p-3 text-slate-500">{formatDate(m.created_at)}</td>
                        <td className="p-3 text-slate-500">{m.approved_at ? formatDate(m.approved_at) : "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
