"use client";

import { useEffect, useState } from "react";
import { FileText, X } from "lucide-react";

const STORAGE_KEY_URL = "lawygo_viewer_url";
const STORAGE_KEY_NAME = "lawygo_viewer_name";
const STORAGE_KEY_MIME = "lawygo_viewer_mime";

export default function ViewerPage() {
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mimeType, setMimeType] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const u = sessionStorage.getItem(STORAGE_KEY_URL);
    const n = sessionStorage.getItem(STORAGE_KEY_NAME) ?? "";
    const m = sessionStorage.getItem(STORAGE_KEY_MIME) ?? "";
    setUrl(u);
    setFileName(n);
    setMimeType(m);
    sessionStorage.removeItem(STORAGE_KEY_URL);
    sessionStorage.removeItem(STORAGE_KEY_NAME);
    sessionStorage.removeItem(STORAGE_KEY_MIME);
  }, []);

  const canPreview = url && (mimeType.includes("pdf") || mimeType.startsWith("image/"));

  const close = () => window.close();

  if (!url) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-md text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600">표시할 문서가 없습니다.</p>
          <p className="text-sm text-text-muted mt-2">자료실에서 파일을 더블클릭하여 여세요.</p>
          <button
            type="button"
            onClick={close}
            className="mt-4 px-4 py-2 rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300"
          >
            창 닫기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* 오피스 뷰어 스타일 헤더 */}
      <header className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={18} className="text-primary-600 shrink-0" />
          <span className="text-sm font-medium text-slate-800 truncate">{fileName || "문서 미리보기"}</span>
        </div>
        <button
          type="button"
          onClick={close}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          title="닫기"
        >
          <X size={18} />
        </button>
      </header>

      {/* 뷰어 본문 */}
      <main className="flex-1 flex items-center justify-center p-4 min-h-0 bg-slate-200">
        {canPreview ? (
          <div className="w-full h-full max-w-4xl bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
            {mimeType.startsWith("image/") ? (
              <img
                src={url}
                alt={fileName}
                className="max-w-full max-h-full object-contain mx-auto"
              />
            ) : (
              <iframe
                src={url}
                title={fileName}
                className="w-full flex-1 min-h-[480px] border-0"
              />
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-8 max-w-md text-center">
            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="font-medium text-slate-800 truncate">{fileName}</p>
            <p className="text-sm text-text-muted mt-2">이 유형은 미리보기가 제한됩니다.</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 text-sm"
            >
              새 탭에서 열기
            </a>
            <button
              type="button"
              onClick={close}
              className="block mt-2 text-sm text-text-muted hover:text-slate-700"
            >
              창 닫기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
