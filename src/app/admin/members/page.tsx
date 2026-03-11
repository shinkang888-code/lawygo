"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Users, Check, Trash2, RefreshCw, UserPlus, Pencil, FileUp, FileDown, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { exportMembersToExcel } from "@/lib/memberExcel";

interface ExcelRowError {
  row: number;
  field?: string;
  message: string;
}

const ROLE_OPTIONS = ["관리자", "임원", "변호사", "사무장", "국장", "직원", "사무원", "인턴"] as const;

interface Member {
  id: string;
  login_id: string;
  management_number: string;
  status: string;
  name: string | null;
  role: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<Set<string>>(new Set());
  const [bulkLoginIds, setBulkLoginIds] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [registerOpen, setRegisterOpen] = useState(false);
  const [registerLoginId, setRegisterLoginId] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerRole, setRegisterRole] = useState<string>(ROLE_OPTIONS[0]);
  const [registerLoading, setRegisterLoading] = useState(false);

  const [editMember, setEditMember] = useState<Member | null>(null);
  const [editLoginId, setEditLoginId] = useState("");
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editManagementNumber, setEditManagementNumber] = useState("");
  const [editNewPassword, setEditNewPassword] = useState("");
  const [editNewPasswordConfirm, setEditNewPasswordConfirm] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [excelErrors, setExcelErrors] = useState<ExcelRowError[]>([]);
  const [excelErrorModalOpen, setExcelErrorModalOpen] = useState(false);
  const [excelReplaceMode, setExcelReplaceMode] = useState(false);
  const excelInputRef = useRef<HTMLInputElement>(null);

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

  const toggleSelectApproved = (id: string) => {
    setSelectedApprovedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllApproved = () => {
    if (selectedApprovedIds.size === approved.length) setSelectedApprovedIds(new Set());
    else setSelectedApprovedIds(new Set(approved.map((m) => m.id)));
  };

  const clearSelectedApproved = () => setSelectedApprovedIds(new Set());

  const handleDeleteApproved = async () => {
    const ids = Array.from(selectedApprovedIds);
    if (ids.length === 0) {
      toast.error("삭제할 회원을 선택하세요.");
      return;
    }
    if (!confirm(`선택한 ${ids.length}명의 승인 회원을 삭제하시겠습니까?`)) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/members/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "삭제 실패");
      toast.success(`${data.count ?? 0}건 삭제되었습니다.`);
      setSelectedApprovedIds(new Set());
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setActionLoading(false);
    }
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

  const handleRegister = async () => {
    const loginId = registerLoginId.trim().toLowerCase();
    if (!loginId || loginId.length < 2) {
      toast.error("아이디를 2자 이상 입력하세요.");
      return;
    }
    if (!registerPassword || registerPassword.length < 4) {
      toast.error("비밀번호를 4자 이상 입력하세요.");
      return;
    }
    setRegisterLoading(true);
    try {
      const res = await fetch("/api/admin/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          loginId,
          password: registerPassword,
          name: registerName.trim() || undefined,
          role: registerRole || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "등록 실패");
      toast.success("회원이 등록되었습니다.");
      setRegisterOpen(false);
      setRegisterLoginId("");
      setRegisterPassword("");
      setRegisterName("");
      setRegisterRole(ROLE_OPTIONS[0]);
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "등록 실패");
    } finally {
      setRegisterLoading(false);
    }
  };

  const openEdit = (m: Member) => {
    setEditMember(m);
    setEditLoginId(m.login_id ?? "");
    setEditName(m.name ?? "");
    setEditRole(m.role ?? ROLE_OPTIONS[0]);
    setEditManagementNumber(m.management_number ?? "");
    setEditNewPassword("");
    setEditNewPasswordConfirm("");
  };

  const handleEditSave = async () => {
    if (!editMember) return;
    const newLoginId = editLoginId.trim().toLowerCase();
    if (!newLoginId || newLoginId.length < 2) {
      toast.error("아이디는 2자 이상 입력하세요.");
      return;
    }
    setEditLoading(true);
    try {
      const res = await fetch("/api/admin/members/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editMember.id,
          loginId: newLoginId,
          name: editName.trim() || null,
          role: editRole || null,
          managementNumber: editManagementNumber.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "수정 실패");

      const newPw = editNewPassword.trim();
      const newPwConfirm = editNewPasswordConfirm.trim();
      if (newPw.length > 0) {
        if (newPw.length < 4) {
          toast.error("새 비밀번호는 4자 이상 입력하세요.");
          setEditLoading(false);
          return;
        }
        if (newPw !== newPwConfirm) {
          toast.error("새 비밀번호와 확인이 일치하지 않습니다.");
          setEditLoading(false);
          return;
        }
        const credRes = await fetch("/api/admin/members/credentials", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            loginId: newLoginId,
            newPassword: newPw,
          }),
        });
        if (!credRes.ok) {
          const credData = await credRes.json().catch(() => ({}));
          throw new Error(credData.error ?? "비밀번호 변경 실패");
        }
      }

      toast.success("회원 정보가 수정되었습니다.");
      setEditMember(null);
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setEditLoading(false);
    }
  };

  const handleExcelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      toast.error("엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다.");
      return;
    }
    if (excelReplaceMode && !confirm("기존 직원·회원(관리자 제외)을 모두 삭제한 뒤 엑셀 내용으로 전량 반영합니다. 계속하시겠습니까?")) {
      return;
    }
    setActionLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("replace", excelReplaceMode ? "true" : "false");
      const res = await fetch("/api/admin/members/import-excel", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && Array.isArray(data.errors) && data.errors.length > 0) {
          setExcelErrors(data.errors);
          setExcelErrorModalOpen(true);
          toast.error(data.error ?? "엑셀 형식이 맞지 않아 등록되지 않았습니다.");
        } else {
          toast.error(data.error ?? "엑셀 등록 실패");
        }
        return;
      }
      toast.success(data.replaced ? `기존 데이터 삭제 후 ${data.count ?? 0}명 반영되었습니다.` : `${data.count ?? 0}명 회원이 등록되었습니다.`);
      fetchMembers();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "엑셀 등록 실패");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
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
              회원 등록·편집, 권한 설정, 대기 회원 승인 및 삭제.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" leftIcon={<UserPlus size={14} />} onClick={() => setRegisterOpen(true)}>
            회원등록
          </Button>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={excelReplaceMode}
              onChange={(e) => setExcelReplaceMode(e.target.checked)}
              className="rounded border-slate-300 text-primary-600"
            />
            기존 직원 삭제 후 엑셀 전량 반영
          </label>
          <input
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleExcelFileChange}
          />
          <Button size="sm" variant="outline" leftIcon={<FileUp size={14} />} onClick={() => excelInputRef.current?.click()} disabled={actionLoading}>
            엑셀등록
          </Button>
          <Button
            size="sm"
            variant="outline"
            leftIcon={<FileDown size={14} />}
            onClick={() => {
              if (members.length === 0) {
                toast.error("다운로드할 회원이 없습니다.");
                return;
              }
              exportMembersToExcel(members);
              toast.success("회원목록 엑셀 파일이 다운로드되었습니다.");
            }}
            disabled={loading || actionLoading}
          >
            엑셀다운
          </Button>
        </div>
      </div>
      <p className="text-xs text-slate-500 -mt-2">엑셀등록: 직원목록 형식(로그인ID, 이름, 역할 필수) 또는 user_lawygo 형식(성명, ID, 사용자유형, 소속부서, 이메일, 이동전화 등). &quot;기존 직원 삭제 후 엑셀 전량 반영&quot; 체크 시 관리자 제외 전원 삭제 후 엑셀 내용으로 DB 갱신.</p>

      {/* 회원 등록 폼 (접이식) */}
      {registerOpen && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3">회원 등록</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={registerLoginId}
              onChange={(e) => setRegisterLoginId(e.target.value)}
              placeholder="로그인 아이디 *"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <input
              type="password"
              value={registerPassword}
              onChange={(e) => setRegisterPassword(e.target.value)}
              placeholder="비밀번호 (4자 이상) *"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <input
              type="text"
              value={registerName}
              onChange={(e) => setRegisterName(e.target.value)}
              placeholder="이름"
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <select
              value={registerRole}
              onChange={(e) => setRegisterRole(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>권한: {r}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleRegister} disabled={registerLoading}>
              등록
            </Button>
            <Button size="sm" variant="outline" onClick={() => setRegisterOpen(false)}>
              취소
            </Button>
          </div>
        </div>
      )}

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
                    <th className="text-left p-3">권한(직급)</th>
                    <th className="text-left p-3">관리번호</th>
                    <th className="text-left p-3">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-500">대기 중인 회원이 없습니다.</td>
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
                        <td className="p-3 text-slate-600">{m.role ?? "-"}</td>
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
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-semibold text-slate-800">승인 완료 ({approved.length}명)</h3>
              {selectedApprovedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{selectedApprovedIds.size}명 선택</span>
                  <Button size="sm" variant="ghost" onClick={clearSelectedApproved} disabled={actionLoading}>
                    선택 해제
                  </Button>
                  <Button size="sm" variant="danger" leftIcon={<Trash2 size={14} />} onClick={handleDeleteApproved} disabled={actionLoading}>
                    선택 회원 삭제
                  </Button>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left p-3 w-10">
                      {approved.length > 0 && (
                        <input
                          type="checkbox"
                          checked={selectedApprovedIds.size === approved.length}
                          ref={(el) => {
                            if (!el) return;
                            const n = selectedApprovedIds.size;
                            const total = approved.length;
                            el.indeterminate = n > 0 && n < total;
                          }}
                          onChange={toggleSelectAllApproved}
                        />
                      )}
                    </th>
                    <th className="text-left p-3">아이디</th>
                    <th className="text-left p-3">이름</th>
                    <th className="text-left p-3">권한(직급)</th>
                    <th className="text-left p-3">관리번호</th>
                    <th className="text-left p-3">가입일</th>
                    <th className="text-left p-3">승인일</th>
                    <th className="text-left p-3 w-20">편집</th>
                  </tr>
                </thead>
                <tbody>
                  {approved.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-slate-500">승인된 회원이 없습니다.</td>
                    </tr>
                  ) : (
                    approved.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedApprovedIds.has(m.id)}
                            onChange={() => toggleSelectApproved(m.id)}
                          />
                        </td>
                        <td className="p-3 font-medium">{m.login_id}</td>
                        <td className="p-3">{m.name ?? "-"}</td>
                        <td className="p-3 text-slate-600">{m.role ?? "-"}</td>
                        <td className="p-3 text-slate-600">{m.management_number}</td>
                        <td className="p-3 text-slate-500">{formatDate(m.created_at)}</td>
                        <td className="p-3 text-slate-500">{m.approved_at ? formatDate(m.approved_at) : "-"}</td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" className="text-slate-600" leftIcon={<Pencil size={12} />} onClick={() => openEdit(m)}>
                            편집
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* 편집 모달: 이름, 권한, 비밀번호 변경 */}
      {editMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-900">회원 편집 · 권한 설정</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">아이디 (로그인 ID)</label>
                <input
                  type="text"
                  value={editLoginId}
                  onChange={(e) => setEditLoginId(e.target.value)}
                  placeholder="2자 이상"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">이름</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="이름"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">관리번호</label>
                <input
                  type="text"
                  value={editManagementNumber}
                  onChange={(e) => setEditManagementNumber(e.target.value)}
                  placeholder="관리번호 (로그인 시 사용)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">권한 (관리자, 변호사, 직원 등)</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">기존 비밀번호</label>
                <div className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 text-slate-500 select-none">
                  ••••••••
                </div>
                <p className="mt-1 text-xs text-slate-400">보안상 저장된 비밀번호는 표시되지 않습니다.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호 (선택, 4자 이상)</label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="변경 시에만 입력"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={editNewPasswordConfirm}
                  onChange={(e) => setEditNewPasswordConfirm(e.target.value)}
                  placeholder="새 비밀번호 다시 입력"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-2 px-5 py-4 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setEditMember(null)}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleEditSave} disabled={editLoading}>
                저장
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 엑셀 검증 오류 모달 */}
      {excelErrorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-amber-50">
              <AlertTriangle size={20} className="text-amber-600 shrink-0" />
              <h3 className="text-sm font-semibold text-slate-800">엑셀 형식 오류</h3>
              <button
                type="button"
                onClick={() => setExcelErrorModalOpen(false)}
                className="ml-auto p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                aria-label="닫기"
              >
                <X size={18} />
              </button>
            </div>
            <p className="px-5 pt-3 text-xs text-slate-600">
              아래 항목을 수정한 뒤 다시 엑셀 파일을 업로드해 주세요. 형식이 맞지 않으면 등록되지 않습니다.
            </p>
            <div className="p-5 overflow-y-auto max-h-[50vh] space-y-2">
              {excelErrors.map((err, idx) => (
                <div key={idx} className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">
                  {err.row > 0 ? `${err.row}행` : "파일"} {err.field && `· ${err.field}`}: {err.message}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-slate-100">
              <Button size="sm" onClick={() => setExcelErrorModalOpen(false)}>
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
