"use client";

import { useState, useMemo, useEffect } from "react";
import { User, FileText, Paperclip, X, Send, Eye } from "lucide-react";
import { mockStaff } from "@/lib/mockData";
import type { StaffMember, ApprovalDoc, ApprovalStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function getCurrentAccountNameFromCookie(): string {
  if (typeof window === "undefined") return "";
  try {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("lawygo_session="));
    if (!cookie) return "";
    const payload = cookie.split("=")[1]?.split(".")[0];
    if (!payload) return "";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.name ?? decoded.loginId ?? "";
  } catch {
    return "";
  }
}

export default function ApprovalDraftPage() {
  const [drafterName, setDrafterName] = useState<string>("");
  const [drafterId, setDrafterId] = useState<string>("");
  const [firstApprovers, setFirstApprovers] = useState<StaffMember[]>([]);
  const [secondApprovers, setSecondApprovers] = useState<StaffMember[]>([]);
  const [referrers, setReferrers] = useState<StaffMember[]>([]);
  const [firstSearch, setFirstSearch] = useState("");
  const [secondSearch, setSecondSearch] = useState("");
  const [referrerSearch, setReferrerSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function apply(u: { name?: string; loginId?: string; id?: string; userId?: string } | null) {
      if (!u) return;
      setDrafterName(u.name || u.loginId || "");
      setDrafterId(u.id ?? u.userId ?? "me");
    }
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.user) return apply(d.user);
        return fetch("/api/auth/session", { credentials: "include" })
          .then((r) => r.json())
          .then((s) => s?.user && apply(s.user));
      })
      .catch(() => {
        const name = (getCurrentAccountNameFromCookie() || mockStaff[1]?.name) ?? "기안자";
        setDrafterName(name);
      });
  }, []);

  const defaultStaff: StaffMember = useMemo(
    () => mockStaff[1] ?? mockStaff[0] ?? { id: "me", name: "기안자", role: "직원", department: "-", email: "", phone: "", level: 1 },
    []
  );

  const currentUser: StaffMember = useMemo(() => {
    const name = (drafterName || getCurrentAccountNameFromCookie() || defaultStaff.name) ?? "기안자";
    const found = mockStaff.find((s) => s.name === name);
    return found ? { ...found, name } : { ...defaultStaff, id: drafterId || "me", name };
  }, [drafterName, drafterId, defaultStaff]);

  const staffWithoutSelf = useMemo(
    () => mockStaff.filter((s) => s.id !== currentUser.id),
    [currentUser.id]
  );

  const departments = useMemo(
    () => Array.from(new Set(mockStaff.map((s) => s.department).filter(Boolean))).sort(),
    []
  );

  const filterStaff = (list: StaffMember[], q: string) =>
    !q.trim()
      ? list
      : list.filter(
          (s) =>
            s.name.includes(q.trim()) ||
            s.department.includes(q.trim()) ||
            s.role.includes(q.trim())
        );

  const firstIds = useMemo(() => new Set(firstApprovers.map((s) => s.id)), [firstApprovers]);
  const secondIds = useMemo(() => new Set(secondApprovers.map((s) => s.id)), [secondApprovers]);
  const referrerIds = useMemo(() => new Set(referrers.map((s) => s.id)), [referrers]);

  const firstFiltered = useMemo(
    () => filterStaff(staffWithoutSelf.filter((s) => !secondIds.has(s.id) && !referrerIds.has(s.id)), firstSearch),
    [staffWithoutSelf, secondIds, referrerIds, firstSearch]
  );
  const secondFiltered = useMemo(
    () => filterStaff(staffWithoutSelf.filter((s) => !firstIds.has(s.id) && !referrerIds.has(s.id)), secondSearch),
    [staffWithoutSelf, firstIds, referrerIds, secondSearch]
  );
  const referrerFiltered = useMemo(
    () => filterStaff(staffWithoutSelf.filter((s) => !firstIds.has(s.id) && !secondIds.has(s.id)), referrerSearch),
    [staffWithoutSelf, firstIds, secondIds, referrerSearch]
  );

  const referrerDepartmentsFiltered = useMemo(() => {
    const q = referrerSearch.trim().toLowerCase();
    if (!q) return [];
    return departments.filter((d) => d.toLowerCase().includes(q));
  }, [departments, referrerSearch]);

  const addFirstApprover = (s: StaffMember) => {
    if (firstIds.has(s.id)) return;
    setFirstApprovers((prev) => [...prev, s]);
    setFirstSearch("");
  };
  const removeFirstApprover = (staffId: string) => {
    setFirstApprovers((prev) => prev.filter((x) => x.id !== staffId));
  };
  const addSecondApprover = (s: StaffMember) => {
    if (secondIds.has(s.id)) return;
    setSecondApprovers((prev) => [...prev, s]);
    setSecondSearch("");
  };
  const removeSecondApprover = (staffId: string) => {
    setSecondApprovers((prev) => prev.filter((x) => x.id !== staffId));
  };
  const addReferrer = (s: StaffMember) => {
    if (referrerIds.has(s.id)) return;
    setReferrers((prev) => [...prev, s]);
    setReferrerSearch("");
  };
  const addReferrersByDepartment = (department: string) => {
    const toAdd = staffWithoutSelf.filter(
      (s) => s.department === department && !referrerIds.has(s.id) && !firstIds.has(s.id) && !secondIds.has(s.id)
    );
    if (toAdd.length === 0) return;
    setReferrers((prev) => [...prev, ...toAdd]);
    setReferrerSearch("");
    toast.success(`${department} ${toAdd.length}명이 참조자로 추가되었습니다.`);
  };
  const removeReferrer = (staffId: string) => {
    setReferrers((prev) => prev.filter((x) => x.id !== staffId));
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const newFiles = Array.from(selected).map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(36).slice(2)}`,
      file,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
    e.target.value = "";
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleSubmit = () => {
    if (firstApprovers.length === 0) {
      toast.error("1차 결재자를 1명 이상 선택하세요.");
      return;
    }
    if (secondApprovers.length === 0) {
      toast.error("2차 결재자를 1명 이상 선택하세요.");
      return;
    }
    setSubmitting(true);

    const approvalLine: ApprovalStep[] = [
      ...firstApprovers.map((s) => ({
        order: 1 as const,
        staffId: s.id,
        staffName: s.name,
        role: s.role,
        status: "대기" as const,
      })),
      ...secondApprovers.map((s) => ({
        order: 2 as const,
        staffId: s.id,
        staffName: s.name,
        role: s.role,
        status: "대기" as const,
      })),
    ];

    const newDoc: ApprovalDoc = {
      id: `ap-${Date.now()}`,
      title: `기안 문서 · ${new Date().toLocaleDateString("ko-KR")}`,
      type: "기타",
      status: "결재요청",
      caseId: "",
      caseNumber: "",
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      approvalLine,
      createdAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      attachmentNames: files.map((f) => f.file.name),
      referrerNames: referrers.length > 0 ? referrers.map((s) => s.name) : undefined,
    };

    try {
      if (typeof window !== "undefined" && window.opener) {
        window.opener.postMessage(
          { type: "APPROVAL_DRAFT_SUBMIT", payload: newDoc },
          window.location.origin
        );
      }
      toast.success("결재 요청을 전송했습니다.", {
        description: "1차·2차 결재자에게 알림이 발송됩니다.",
      });
      setTimeout(() => window.close(), 800);
    } catch {
      toast.error("전송에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-lg font-bold text-slate-900">기안</h1>

        {/* 결재선: 1차(왼쪽) · 2차(오른쪽) 나란히, 참조자는 부서 검색·일괄 선택 */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">결재선</h2>
          </div>
          <div className="p-4 space-y-4">
            {/* 1차 결재자(왼쪽) · 2차 결재자(오른쪽) 나란히 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 1) 1차 결재자 (왼쪽) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  1차 결재자 * (이름 입력 후 여러 명 선택 가능)
                </label>
                <input
                  type="text"
                  value={firstSearch}
                  onChange={(e) => setFirstSearch(e.target.value)}
                  placeholder="이름 또는 부서로 검색"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
                {firstApprovers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto">
                    {firstApprovers.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                      >
                        <span className="font-medium text-slate-800">{s.name}</span>
                        <span className="text-xs text-text-muted">{s.role}·{s.department}</span>
                        <button type="button" onClick={() => removeFirstApprover(s.id)} className="text-slate-400 hover:text-danger-500 p-0.5" aria-label="제거">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-[4.5rem] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {firstFiltered.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-text-muted text-center">직원·변호사 중 검색 또는 선택 (여러 명 가능)</div>
                  ) : (
                    firstFiltered.map((s) => (
                      <button key={s.id} type="button" onClick={() => addFirstApprover(s)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <User size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{s.name}</span>
                        <span className="text-xs text-text-muted">{s.role} · {s.department}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* 2) 2차 결재자 (오른쪽) */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  2차 결재자 * (이름 입력 후 여러 명 선택 가능)
                </label>
                <input
                  type="text"
                  value={secondSearch}
                  onChange={(e) => setSecondSearch(e.target.value)}
                  placeholder="이름 또는 부서로 검색"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
                {secondApprovers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2 max-h-20 overflow-y-auto">
                    {secondApprovers.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                      >
                        <span className="font-medium text-slate-800">{s.name}</span>
                        <span className="text-xs text-text-muted">{s.role}·{s.department}</span>
                        <button type="button" onClick={() => removeSecondApprover(s.id)} className="text-slate-400 hover:text-danger-500 p-0.5" aria-label="제거">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="max-h-[4.5rem] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                  {secondFiltered.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-text-muted text-center">직원·변호사 중 검색 또는 선택 (여러 명 가능)</div>
                  ) : (
                    secondFiltered.map((s) => (
                      <button key={s.id} type="button" onClick={() => addSecondApprover(s)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                        <User size={14} className="text-slate-400 shrink-0" />
                        <span className="font-medium text-slate-800">{s.name}</span>
                        <span className="text-xs text-text-muted">{s.role} · {s.department}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 3) 참조자: 부서로 검색·선택 시 해당 부서 전원 일괄 등록 (결재하지 않고 문서 확인만) */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                참조자 (부서 선택 시 해당 부서 전원 일괄 등록, 결재하지 않고 문서 확인만)
              </label>
              <input
                type="text"
                value={referrerSearch}
                onChange={(e) => setReferrerSearch(e.target.value)}
                placeholder="부서명으로 검색 후 부서를 선택하면 해당 부서 전원이 참조자로 등록됩니다"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
              />
              {referrers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {referrers.map((s) => (
                    <span
                      key={s.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm"
                    >
                      <Eye size={14} className="text-slate-400" />
                      <span className="font-medium text-slate-800">{s.name}</span>
                      <span className="text-xs text-text-muted">{s.role}·{s.department}</span>
                      <button type="button" onClick={() => removeReferrer(s.id)} className="text-slate-400 hover:text-danger-500 p-0.5" aria-label="제거">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="max-h-[7rem] overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {!referrerSearch.trim() ? (
                  <div className="px-3 py-3 text-xs text-text-muted text-center">
                    부서명을 입력하면 부서별 일괄 선택이 나옵니다. 선택 시 해당 부서 전원이 참조자로 등록됩니다.
                  </div>
                ) : (
                  <>
                    {referrerDepartmentsFiltered.map((dept) => {
                      const count = staffWithoutSelf.filter(
                        (s) => s.department === dept && !referrerIds.has(s.id) && !firstIds.has(s.id) && !secondIds.has(s.id)
                      ).length;
                      return (
                        <button
                          key={dept}
                          type="button"
                          onClick={() => addReferrersByDepartment(dept)}
                          disabled={count === 0}
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="font-medium text-slate-800">{dept}</span>
                          <span className="text-xs text-primary-600 shrink-0">
                            {count > 0 ? `전체 ${count}명 추가` : "이미 모두 선택됨"}
                          </span>
                        </button>
                      );
                    })}
                    {referrerFiltered.length > 0 && (
                      <>
                        {referrerDepartmentsFiltered.length > 0 && (
                          <div className="border-t border-slate-200 bg-slate-50/50 px-2 py-1.5 text-xs text-slate-500">
                            개별 직원 선택
                          </div>
                        )}
                        {referrerFiltered.map((s) => (
                          <button key={s.id} type="button" onClick={() => addReferrer(s)} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                            <Eye size={14} className="text-slate-400 shrink-0" />
                            <span className="font-medium text-slate-800">{s.name}</span>
                            <span className="text-xs text-text-muted">{s.role} · {s.department}</span>
                          </button>
                        ))}
                      </>
                    )}
                    {referrerDepartmentsFiltered.length === 0 && referrerFiltered.length === 0 && (
                      <div className="px-3 py-3 text-xs text-text-muted text-center">
                        검색 결과가 없습니다. 부서명 또는 이름으로 검색해 보세요.
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 메모 */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">내용</h2>
          </div>
          <div className="p-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="결재 요청 내용을 입력하세요..."
              rows={12}
              className={cn(
                "w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none",
                "focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
              )}
            />
          </div>
        </section>

        {/* 첨부파일 */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
            <Paperclip size={14} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-700">첨부파일</h2>
          </div>
          <div className="p-4 space-y-3">
            <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary-300 hover:bg-primary-50/50 transition-colors">
              <Paperclip size={16} className="text-slate-400" />
              <span className="text-sm text-slate-600">파일 선택 (여러 개 가능)</span>
              <input
                type="file"
                multiple
                className="hidden"
                onChange={onFileChange}
              />
            </label>
            {files.length > 0 && (
              <ul className="space-y-1.5">
                {files.map(({ id, file }) => (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    <span className="truncate text-slate-800">{file.name}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="p-1 text-slate-400 hover:text-danger-500 shrink-0"
                      title="삭제"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.close()}
            className="flex-1"
          >
            취소
          </Button>
          <Button
            type="button"
            className="flex-1"
            leftIcon={<Send size={14} />}
            onClick={handleSubmit}
            disabled={submitting}
          >
            결재 요청
          </Button>
        </div>
      </div>
    </div>
  );
}
