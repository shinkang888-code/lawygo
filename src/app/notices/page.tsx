"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { X, Search, Plus, Pencil, Trash2, Save, Paperclip, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import type { NoticeItem } from "@/lib/types";
import {
  loadNotices,
  searchNotices,
  getNoticeById,
  saveNotice,
  softDeleteNotice,
} from "@/lib/noticeStorage";

const PAGE_SIZE = 10;

function getCurrentAuthor(): string {
  if (typeof window === "undefined") return "관리자";
  try {
    const cookie = document.cookie.split(";").find((c) => c.trim().startsWith("lawygo_session="));
    if (!cookie) return "관리자";
    const payload = cookie.split("=")[1]?.split(".")[0];
    if (!payload) return "관리자";
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded.name ?? decoded.loginId ?? "관리자";
  } catch {
    return "관리자";
  }
}

export default function NoticesPage() {
  const searchParams = useSearchParams();
  const idFromUrl = searchParams.get("id");
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [filteredNotices, setFilteredNotices] = useState<NoticeItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(idFromUrl);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editNewFiles, setEditNewFiles] = useState<{ file: File; data: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setNotices(loadNotices());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const list = searchQuery.trim() ? searchNotices(searchQuery) : loadNotices();
    setFilteredNotices(list);
    setPage(1);
  }, [notices, searchQuery]);

  useEffect(() => {
    setSelectedId(idFromUrl);
  }, [idFromUrl]);

  const totalPages = Math.max(1, Math.ceil(filteredNotices.length / PAGE_SIZE));
  const pageNotices = filteredNotices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selected = selectedId ? getNoticeById(selectedId) : null;
  const selectedDeleted = selected?.deletedAt;

  const openNewEditor = () => {
    setEditingId(null);
    setEditTitle("");
    setEditContent("");
    setEditAuthor(getCurrentAuthor());
    setEditNewFiles([]);
    setEditorOpen(true);
  };

  const openEditEditor = (n: NoticeItem) => {
    setEditingId(n.id);
    setEditTitle(n.title);
    setEditContent(n.content);
    setEditAuthor(n.authorName);
    setEditNewFiles([]);
    setEditorOpen(true);
  };

  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected?.length) return;
    const promises = Array.from(selected).map(
      (file) =>
        new Promise<{ file: File; data: string }>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ file, data: reader.result as string });
          reader.readAsDataURL(file);
        })
    );
    Promise.all(promises).then((newFiles) => {
      setEditNewFiles((prev) => [...prev, ...newFiles]);
    });
    e.target.value = "";
  };

  const removeEditNewFile = (index: number) => {
    setEditNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveNotice = () => {
    if (!editTitle.trim()) {
      toast.error("제목을 입력하세요.");
      return;
    }
    const newNames = editNewFiles.map((f) => f.file.name);
    const newData = editNewFiles.map((f) => ({ name: f.file.name, data: f.data }));
    const existingNotice = editingId ? getNoticeById(editingId) : null;
    const attachmentNames = existingNotice?.attachmentNames
      ? [...existingNotice.attachmentNames, ...newNames]
      : newNames;
    const attachmentData = existingNotice?.attachmentData
      ? [...existingNotice.attachmentData, ...newData]
      : newData;

    if (editingId) {
      saveNotice({
        id: editingId,
        title: editTitle.trim(),
        content: editContent.trim(),
        authorName: editAuthor.trim() || getCurrentAuthor(),
        attachmentNames: attachmentNames.length ? attachmentNames : undefined,
        attachmentData: attachmentData.length ? attachmentData : undefined,
      });
      toast.success("수정되었습니다.");
    } else {
      saveNotice({
        title: editTitle.trim(),
        content: editContent.trim(),
        authorName: editAuthor.trim() || getCurrentAuthor(),
        attachmentNames: attachmentNames.length ? attachmentNames : undefined,
        attachmentData: attachmentData.length ? attachmentData : undefined,
      });
      toast.success("등록되었습니다.");
    }
    refresh();
    setEditorOpen(false);
  };

  const handleDownloadAttachment = (name: string, data: string) => {
    const a = document.createElement("a");
    a.href = data;
    a.download = name;
    a.click();
    toast.success(`"${name}" 다운로드되었습니다.`);
  };

  const handleSoftDelete = () => {
    if (!selectedId) return;
    if (!confirm("이 공지를 삭제하시겠습니까? (삭제된 공지는 목록에서 숨겨집니다.)")) return;
    softDeleteNotice(selectedId);
    toast.success("삭제되었습니다.");
    refresh();
    setSelectedId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("id");
    window.history.replaceState(null, "", url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : ""));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <h1 className="text-lg font-semibold text-slate-900">공지사항</h1>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" leftIcon={<Plus size={14} />} onClick={openNewEditor}>
            글등록
          </Button>
          <button
            type="button"
            onClick={() => window.close()}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto flex flex-col gap-4">
        {/* 검색 */}
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setPage(1)}
            placeholder="제목·내용·작성자 검색"
            className="flex-1 min-w-0 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 focus:ring-2 focus:ring-primary-600/20 outline-none"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage(1)}
            leftIcon={<Search size={14} />}
          >
            검색
          </Button>
        </div>

        {/* 1) 전체 목록 (먼저 표시) */}
        <section>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">전체 목록</h3>
          <ul className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
            {pageNotices.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-text-muted">
                {searchQuery.trim() ? "검색 결과가 없습니다." : "등록된 공지가 없습니다."}
              </li>
            ) : (
              pageNotices.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(n.id);
                      const url = new URL(window.location.href);
                      url.searchParams.set("id", n.id);
                      window.history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                      selectedId === n.id ? "bg-primary-50 text-primary-800" : "hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-sm font-medium truncate flex-1">{n.title}</span>
                    <span className="text-xs text-text-muted shrink-0">
                      {new Date(n.updatedAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" })}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-3 pt-3">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`min-w-[28px] h-7 px-1.5 rounded text-xs font-medium ${
                    page === p ? "bg-primary-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </section>

        {/* 2) 선택된 게시글 (목록 아래 표시) */}
        {selected && (
          <article className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {selectedDeleted ? (
              <div className="px-4 py-6 text-center text-sm text-text-muted">
                삭제된 공지입니다.
              </div>
            ) : (
              <>
                <div className="px-4 py-4 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{selected.title}</h2>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-text-muted">
                      <span>{selected.authorName}</span>
                      <span>·</span>
                      <time dateTime={selected.updatedAt}>
                        {new Date(selected.updatedAt).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </time>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      leftIcon={<Pencil size={12} />}
                      onClick={() => openEditEditor(selected)}
                    >
                      편집
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
                      leftIcon={<Trash2 size={12} />}
                      onClick={handleSoftDelete}
                    >
                      삭제
                    </Button>
                  </div>
                </div>
                <div className="px-4 py-4 text-sm text-slate-700 whitespace-pre-wrap">{selected.content}</div>
                {(selected.attachmentNames?.length ?? 0) > 0 && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1">
                      <Paperclip size={12} /> 첨부파일 ({selected.attachmentNames?.length ?? 0}개)
                    </div>
                    <ul className="space-y-1.5">
                      {(selected.attachmentNames ?? []).map((name, i) => {
                        const data = selected.attachmentData?.find((a) => a.name === name)?.data;
                        return (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <FileText size={14} className="text-slate-400 shrink-0" />
                            <span className="truncate flex-1 text-slate-700">{name}</span>
                            {data && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="xs"
                                leftIcon={<Download size={12} />}
                                onClick={() => handleDownloadAttachment(name, data)}
                              >
                                다운로드
                              </Button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </article>
        )}
      </div>

      {/* 글등록/편집 에디터 모달 */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "공지 편집" : "글등록"}
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="제목 입력"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">작성자</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  placeholder="작성자"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">내용</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder="내용을 자유롭게 작성하세요."
                  rows={8}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-primary-400 outline-none resize-y"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">첨부파일 (여러 개 추가 가능)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleEditFileChange}
                />
                {editingId && (() => {
                  const existing = getNoticeById(editingId);
                  const names = existing?.attachmentNames ?? [];
                  return names.length > 0 ? (
                    <div className="mb-2 text-xs text-slate-500">
                      기존 첨부: {names.join(", ")}
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Paperclip size={14} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    파일 선택
                  </Button>
                  {editNewFiles.length > 0 && (
                    <span className="text-xs text-slate-500">{editNewFiles.length}개 추가됨</span>
                  )}
                </div>
                {editNewFiles.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {editNewFiles.map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-xs text-slate-700">
                        <FileText size={12} className="text-slate-400 shrink-0" />
                        <span className="truncate flex-1">{f.file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeEditNewFile(i)}
                          className="text-slate-400 hover:text-danger-500 p-0.5"
                          aria-label="제거"
                        >
                          <X size={12} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="flex gap-2 px-4 py-3 border-t border-slate-100">
              <Button size="sm" leftIcon={<Save size={14} />} onClick={handleSaveNotice}>
                저장
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditorOpen(false)}>
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
