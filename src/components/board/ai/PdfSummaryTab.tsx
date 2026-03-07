"use client";

import { useState, useCallback } from "react";
import { FileText, Upload, Loader2, ChevronDown, ChevronRight, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const ACCORDION_SECTIONS = [
  "사건의 개요",
  "주요 쟁점",
  "법원의 판단 (인용/기각 사유)",
  "결론 (주문)",
  "실무적 시사점",
];

interface PdfSummaryTabProps {
  boardId: string | null;
  postId: string | null;
  aiProvider?: "gemini" | "openai" | "auto";
  geminiConfigured?: boolean;
  openaiConfigured?: boolean;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function PdfSummaryTab({ boardId, postId, aiProvider = "gemini" }: PdfSummaryTabProps) {
  const [file, setFile] = useState<{ name: string; hash: string } | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  // 기본 모두 펼침. 클릭 시 해당 섹션만 접기/펼치기 토글
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => new Set(ACCORDION_SECTIONS));
  const [isDragging, setIsDragging] = useState(false);

  const toggleSection = useCallback((title: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      if (f.type !== "application/pdf") {
        toast.error("PDF 파일만 업로드할 수 있습니다.");
        return;
      }
      setProgress(10);
      const reader = new FileReader();
      reader.onload = async () => {
        const buf = reader.result as ArrayBuffer;
        setProgress(50);
        const hash = await sha256Hex(buf);
        setProgress(100);
        setFile({ name: f.name, hash });
        setPastedText("");
      };
      reader.readAsArrayBuffer(f);
    },
    []
  );

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.type !== "application/pdf") {
      toast.error("PDF 파일만 선택할 수 있습니다.");
      return;
    }
    setProgress(10);
    const reader = new FileReader();
    reader.onload = async () => {
      const buf = reader.result as ArrayBuffer;
      setProgress(50);
      const hash = await sha256Hex(buf);
      setProgress(100);
      setFile({ name: f.name, hash });
      setPastedText("");
    };
    reader.readAsArrayBuffer(f);
  }, []);

  const handleSummarize = async () => {
    const text = pastedText.trim();
    if (!text) {
      toast.error("판결문 텍스트를 붙여넣거나 PDF를 업로드한 뒤 요약하기를 눌러 주세요. (PDF 텍스트 추출은 추후 지원 예정)");
      return;
    }
    setLoading(true);
    setSummary("");
    try {
      const prompt = `당신은 형사·민사 판결문을 구조화하여 요약하는 전문가입니다. 아래 판결문을 읽고, **형사 판결문**이면 다음 규칙을 정확히 따르세요.

【형사 판결문일 때의 채우기 규칙】
- **1) 사건의 개요**: 본문에서 '범죄사실' 또는 '범 죄 사 실' 제목 **아래**에 나오는 내용을 요약하여 넣으세요. 해당 제목이 없으면 사건의 핵심 사실을 요약하세요.
- **2) 주요 쟁점**: 본문에서 '1. 주장의 요지' 또는 '주장의 요지' **아래**에 나오는 피고인·변호인 주장 내용을 그대로 삽입하세요. (예: "피고인은 ㈜B의 채권추심 업무로서…" 형태) 없으면 쟁점을 요약하세요.
- **3) 법원의 판단 (인용/기각 사유)**: 본문에서 '피고인 및 변호인의 주장에 대한 판단' 또는 '당심의 판단' 등 절 안에 있는 **'판단'** 소제목 **이하** 본문을 요약하거나 핵심만 넣으세요. 인용/기각 이유를 포함하세요.
- **4) 결론 (주문)**: 본문에서 **'주 문'** 또는 **'주문'** 제목 **아래** 한 문단을 그대로 넣으세요. (예: "피고인을 징역 1년 6월에 처한다.") 반드시 주문 문구를 포함하세요.
- **5) 실무적 시사점**: 위 내용을 바탕으로 2~3문장으로 실무적 시사점을 작성하세요.

【출력 형식】 반드시 아래 5개 제목을 그대로 쓰고, 그 다음 줄부터 해당 내용을 작성하세요.
1) 사건의 개요
2) 주요 쟁점
3) 법원의 판단 (인용/기각 사유)
4) 결론 (주문)
5) 실무적 시사점

민사·행정 등 형사가 아닌 판결문이면, 위 5개 항목에 맞게 본문 구조를 참고하여 채우세요.

판결문:
${text.slice(0, 30000)}`;

      const body = { prompt, featureId: "doc_summary" as const };
      const endpoints =
        aiProvider === "auto" ? ["/api/ai/gemini", "/api/ai/openai"] : aiProvider === "openai" ? ["/api/ai/openai"] : ["/api/ai/gemini"];
      let lastErr: Error | null = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (res.ok) {
            setSummary(data.text ?? "");
            setExpandedSections(new Set(ACCORDION_SECTIONS));
            toast.success("요약이 완료되었습니다.");
            return;
          }
          lastErr = new Error(data.error ?? "요약 실패");
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error("요약 실패");
        }
      }
      throw lastErr ?? new Error("요약 실패");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "요약에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const addToTimeline = async () => {
    if (!summary.trim()) return;
    if (!boardId || !postId) {
      toast.error("사건 게시글에서 열면 타임라인에 기록할 수 있습니다.");
      return;
    }
    const content = `[🤖 AI 요약본]${file ? `\n원본: ${file.name} (SHA256: ${file.hash.slice(0, 16)}…)` : ""}\n\n${summary}`;
    try {
      const res = await fetch(`/api/board/${boardId}/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ co_content: content }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "등록 실패");
      toast.success("타임라인에 AI 요약본을 기록했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "타임라인 기록에 실패했습니다.");
    }
  };

  const sectionContent = (title: string) => {
    if (!summary) return "";
    const re = new RegExp(`${title}\\s*[\\n:]\\s*([\\s\\S]*?)(?=${ACCORDION_SECTIONS.map((s) => s.replace(/[()]/g, "\\$&")).join("|")}|$)`, "i");
    const m = summary.match(re);
    return m?.[1]?.trim() ?? "";
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════════════ 좌측: 입력창 ══════════════ */}
      <aside className="w-[360px] shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 overflow-y-auto">
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-primary-500" />
            판결문 입력
          </h2>
        </div>

        <div className="flex-1 p-4 space-y-4">
          {/* PDF 업로드 */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer",
              isDragging ? "border-primary-400 bg-primary-50" : "border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50"
            )}
          >
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              id="pdf-upload"
              onChange={handleFileSelect}
            />
            <label htmlFor="pdf-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload size={28} className={cn("shrink-0", isDragging ? "text-primary-500" : "text-slate-400")} />
              <span className="text-sm font-medium text-slate-600">
                판결문 PDF 파일을 이곳에 끌어다 놓으세요.
              </span>
              <span className="text-xs text-slate-500">또는 클릭하여 선택</span>
            </label>
            {file && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-medium">파일: {file.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">SHA256: {file.hash.slice(0, 20)}…</p>
              </div>
            )}
            {progress > 0 && progress < 100 && (
              <div className="mt-3 w-full max-w-[200px] mx-auto h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>

          {/* 텍스트 붙여넣기 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">또는 판결문 텍스트 붙여넣기</label>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="PDF에서 복사한 텍스트를 붙여넣거나, 추후 PDF 자동 추출이 지원됩니다."
              rows={10}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none bg-white leading-relaxed"
            />
          </div>
        </div>

        {/* 요약하기 버튼 */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <Button
            className="w-full"
            leftIcon={loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            onClick={handleSummarize}
            disabled={loading}
          >
            {loading ? "요약 중…" : "요약하기"}
          </Button>
          <p className="mt-2 text-xs text-slate-500 text-center">
            PDF를 올리거나 텍스트를 붙여넣은 뒤 요약하면 우측에 구조화된 요약이 표시됩니다.
          </p>
        </div>
      </aside>

      {/* ══════════════ 우측: 요약된 창 ══════════════ */}
      <main className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-primary-500" />
            구조화된 요약
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {summary ? (
            <div className="space-y-2">
              {ACCORDION_SECTIONS.map((title) => {
                const content = sectionContent(title);
                const isExpanded = expandedSections.has(title);
                return (
                  <div key={title} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleSection(title)}
                      className="w-full flex items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                    >
                      {isExpanded ? <ChevronDown size={16} className="text-primary-500 shrink-0" /> : <ChevronRight size={16} className="text-slate-400 shrink-0" />}
                      {title}
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-0 text-sm text-slate-700 whitespace-pre-wrap border-t border-slate-100 leading-relaxed">
                        {content || "(내용 없음)"}
                      </div>
                    )}
                  </div>
                );
              })}
              {boardId && postId && (
                <div className="pt-3">
                  <Button size="sm" variant="outline" leftIcon={<Bot size={14} />} onClick={addToTimeline}>
                    타임라인에 AI 요약본 기록
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16 text-center text-slate-400 text-sm select-none">
              <FileText size={48} className="text-slate-200 mb-3" />
              <p className="font-medium text-slate-500">요약 결과가 여기에 표시됩니다</p>
              <p className="text-xs mt-1 text-slate-400">왼쪽에서 PDF를 올리거나 텍스트를 붙여넣은 뒤 「요약하기」를 누르세요.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
