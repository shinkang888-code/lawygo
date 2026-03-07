"use client";

import { useState, useMemo } from "react";
import { User, FileText, Paperclip, X, Send } from "lucide-react";
import { mockStaff } from "@/lib/mockData";
import type { StaffMember, ApprovalDoc, ApprovalStep } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

/** 현재 로그인 사용자 (기안자) - 실제로는 인증 정보에서 가져옴 */
const CURRENT_USER: StaffMember = mockStaff[1]; // 이서연

export default function ApprovalDraftPage() {
  const [firstApprover, setFirstApprover] = useState<StaffMember | null>(null);
  const [secondApprover, setSecondApprover] = useState<StaffMember | null>(null);
  const [firstSearch, setFirstSearch] = useState("");
  const [secondSearch, setSecondSearch] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<{ id: string; file: File }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const staffWithoutSelf = useMemo(
    () => mockStaff.filter((s) => s.id !== CURRENT_USER.id),
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

  const firstFiltered = useMemo(
    () => filterStaff(staffWithoutSelf, firstSearch),
    [staffWithoutSelf, firstSearch]
  );
  const secondFiltered = useMemo(
    () =>
      filterStaff(
        staffWithoutSelf.filter((s) => s.id !== firstApprover?.id),
        secondSearch
      ),
    [staffWithoutSelf, firstApprover?.id, secondSearch]
  );

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
    if (!firstApprover) {
      toast.error("1차 결재자를 선택하세요.");
      return;
    }
    if (!secondApprover) {
      toast.error("2차 결재자를 선택하세요.");
      return;
    }
    setSubmitting(true);

    const approvalLine: ApprovalStep[] = [
      {
        order: 1,
        staffId: firstApprover.id,
        staffName: firstApprover.name,
        role: firstApprover.role,
        status: "대기",
      },
      {
        order: 2,
        staffId: secondApprover.id,
        staffName: secondApprover.name,
        role: secondApprover.role,
        status: "대기",
      },
    ];

    const newDoc: ApprovalDoc = {
      id: `ap-${Date.now()}`,
      title: `기안 문서 · ${new Date().toLocaleDateString("ko-KR")}`,
      type: "기타",
      status: "결재요청",
      caseId: "",
      caseNumber: "",
      requesterId: CURRENT_USER.id,
      requesterName: CURRENT_USER.name,
      approvalLine,
      createdAt: new Date().toISOString(),
      notes: notes.trim() || undefined,
      attachmentNames: files.map((f) => f.file.name),
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
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-lg font-bold text-slate-900">기안</h1>

        {/* 1) 기안자 2) 1차결재자 3) 2차결재자 */}
        <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">결재선</h2>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">
                1) 기안자
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
                <User size={14} className="text-slate-400" />
                {CURRENT_USER.name}
                <span className="text-xs text-text-muted">
                  {CURRENT_USER.role} · {CURRENT_USER.department}
                </span>
              </div>
            </div>

            {/* 1차·2차 결재자 좌우 배치, 직원·변호사 모두 선택 가능 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  2) 1차 결재자 *
                </label>
                <input
                  type="text"
                  value={firstSearch}
                  onChange={(e) => setFirstSearch(e.target.value)}
                  placeholder="이름 또는 부서로 검색"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
                {firstApprover ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
                    <span className="text-sm font-medium text-slate-800">
                      {firstApprover.name}
                      <span className="text-xs text-text-muted ml-1">
                        {firstApprover.role} · {firstApprover.department}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFirstApprover(null)}
                      className="text-slate-400 hover:text-danger-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {firstFiltered.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-text-muted text-center">
                        직원·변호사 중 검색 또는 선택
                      </div>
                    ) : (
                      firstFiltered.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFirstApprover(s);
                            setFirstSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <User size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className="text-xs text-text-muted">
                            {s.role} · {s.department}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  3) 2차 결재자 *
                </label>
                <input
                  type="text"
                  value={secondSearch}
                  onChange={(e) => setSecondSearch(e.target.value)}
                  placeholder="이름 또는 부서로 검색"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg mb-2 focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
                />
                {secondApprover ? (
                  <div className="flex items-center justify-between px-3 py-2 bg-primary-50 border border-primary-200 rounded-lg">
                    <span className="text-sm font-medium text-slate-800">
                      {secondApprover.name}
                      <span className="text-xs text-text-muted ml-1">
                        {secondApprover.role} · {secondApprover.department}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setSecondApprover(null)}
                      className="text-slate-400 hover:text-danger-500"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {secondFiltered.length === 0 ? (
                      <div className="px-3 py-4 text-xs text-text-muted text-center">
                        직원·변호사 중 검색 또는 선택
                      </div>
                    ) : (
                      secondFiltered.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSecondApprover(s);
                            setSecondSearch("");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <User size={14} className="text-slate-400 flex-shrink-0" />
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className="text-xs text-text-muted">
                            {s.role} · {s.department}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
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
              rows={6}
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
                    <span className="text-xs text-text-muted flex-shrink-0">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(id)}
                      className="p-1 text-slate-400 hover:text-danger-500 flex-shrink-0"
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
