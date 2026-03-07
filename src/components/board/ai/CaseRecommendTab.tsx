"use client";

import { useState, useCallback } from "react";
import { Scale, Search, X, Calendar, MapPin, FileText, Plus, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export interface PrecedentCard {
  caseNumber: string;
  date: string;
  court: string;
  issueSummary: string;
  matchReason: string;
  /** 판례 본문 요약(판결 요지·주문·핵심 판단) */
  bodySummary?: string;
}

interface CaseRecommendTabProps {
  initialCaseSummary: string;
  boardId: string | null;
  postId: string | null;
  aiProvider?: "gemini" | "openai" | "auto";
  geminiConfigured?: boolean;
  openaiConfigured?: boolean;
}

function parsePrecedentCards(text: string): PrecedentCard[] {
  const cards: PrecedentCard[] = [];
  const blocks = text.split(/(?:---CARD---|###\s*판례\s*\d*|\[\s*판례\s*\d+\s*\])/i).filter(Boolean);
  for (const block of blocks) {
    const caseNumber = block.match(/(?:사건번호|판례번호)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? "";
    const date = block.match(/(?:선고일자|선고일)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? "";
    const court = block.match(/(?:관할법원|법원)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? "";
    const issueSummary = block.match(/(?:쟁점|핵심\s*쟁점)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? "";
    const matchReason = block.match(/(?:매칭\s*이유|이\s*사건과의\s*관련)[:\s]*([^\n]+)/i)?.[1]?.trim()
      ?? block.match(/(?:이유|관련)[:\s]*([^\n]+)/i)?.[1]?.trim() ?? "";
    const bodyMatch = block.match(/(?:판례\s*요지|본문\s*요약|판결\s*요지|판례\s*본문)[:\s]*([\s\S]+)/i);
    const bodySummary = bodyMatch?.[1]?.trim() ?? "";
    if (caseNumber || date || court || issueSummary) {
      cards.push({
        caseNumber: caseNumber || "(사건번호 없음)",
        date: date || "-",
        court: court || "-",
        issueSummary: issueSummary || "-",
        matchReason: matchReason || "유사 쟁점을 다룹니다.",
        bodySummary: bodySummary || undefined,
      });
    }
  }
  if (cards.length > 0) return cards.slice(0, 5);
  return [{
    caseNumber: "(AI 응답)",
    date: "-",
    court: "-",
    issueSummary: text.slice(0, 500) + (text.length > 500 ? "…" : ""),
    matchReason: "AI가 구조화된 카드로 반환하지 못했습니다. 위 내용을 참고하세요.",
  }];
}

export function CaseRecommendTab({ initialCaseSummary, boardId, postId, aiProvider = "gemini" }: CaseRecommendTabProps) {
  const [caseSummary, setCaseSummary] = useState(initialCaseSummary);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [results, setResults] = useState<PrecedentCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCard, setSelectedCard] = useState<PrecedentCard | null>(null);

  const addKeyword = useCallback(() => {
    const v = keywordInput.trim();
    if (v && !keywords.includes(v)) {
      setKeywords((prev) => [...prev, v]);
      setKeywordInput("");
    }
  }, [keywordInput, keywords]);

  const removeKeyword = useCallback((k: string) => {
    setKeywords((prev) => prev.filter((x) => x !== k));
  }, []);

  const handleSearch = async () => {
    if (!caseSummary.trim()) {
      toast.error("사건 요지를 입력하세요.");
      return;
    }
    setLoading(true);
    setResults([]);
    setSelectedCard(null);
    try {
      const prompt = `다음 사건 요지와 키워드에 맞는 유사 판례 3~5개를 추천해주세요.
각 판례마다 반드시 아래 형식으로만 답변해주세요. 구분자로 ---CARD--- 를 사용하세요.

---CARD---
사건번호: (예: 2021다12345)
선고일자: (예: 2022. 3. 15.)
관할법원: (예: 대법원)
핵심 쟁점 요약: (한 줄)
이 사건과의 매칭 이유: (이 사건과 유사한 점을 한 줄로)
판례 요지(본문 요약): (해당 판례의 판결 요지·주문·핵심 판단을 3~8문장 이상으로 구체적으로 요약해 주세요. 판결문 본문에 가깝게 작성합니다.)

사건 요지:
${caseSummary}

키워드: ${keywords.length ? keywords.join(", ") : "없음"}`;

      const body = { prompt: prompt.trim(), featureId: "case_search" as const };
      const endpoints =
        aiProvider === "auto" ? ["/api/ai/gemini", "/api/ai/openai"] : aiProvider === "openai" ? ["/api/ai/openai"] : ["/api/ai/gemini"];
      let lastErr: Error | null = null;
      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            credentials: "include",
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            const text = (data as { text?: string }).text ?? "";
            const cards = parsePrecedentCards(text);
            setResults(cards);
            if (cards.length > 0) setSelectedCard(cards[0]);
            toast.success(cards.length ? `${cards.length}건의 유사 판례를 추천했습니다.` : "답변을 생성했습니다.");
            return;
          }
          const msg = (data as { error?: string }).error ?? "요청 실패";
          const hint = (data as { hint?: string }).hint;
          lastErr = new Error(hint ? `${msg} (${hint})` : msg);
        } catch (e) {
          lastErr = e instanceof Error ? e : new Error("요청 실패");
        }
      }
      toast.error(lastErr?.message ?? "판례 추천에 실패했습니다. API 키 설정과 네트워크를 확인하세요.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "판례 추천에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const addToTimeline = async (card: PrecedentCard) => {
    if (!boardId || !postId) {
      toast.error("사건 게시글에서 열면 타임라인에 기록할 수 있습니다. 게시판에서 해당 사건 글을 연 뒤, 상단 메뉴의 AI 문서엔진으로 이동해 주세요.");
      return;
    }
    const content = `[판례 기록]\n사건번호: ${card.caseNumber}\n선고일자: ${card.date}\n관할법원: ${card.court}\n쟁점: ${card.issueSummary}\n📌 이 사건과의 매칭 이유: ${card.matchReason}`;
    try {
      const res = await fetch(`/api/board/${boardId}/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ co_content: content }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "등록 실패");
      toast.success("타임라인(댓글)에 기록했습니다.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "타임라인 기록에 실패했습니다.");
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* ══════════════ 좌측: 입력창 + 유사 판례 추천 목록 ══════════════ */}
      <aside className="w-[380px] shrink-0 flex flex-col border-r border-slate-200 bg-slate-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Scale size={16} className="text-primary-500" />
            입력 · 유사 판례
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 사건 요지 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">사건 요지 *</label>
            <textarea
              value={caseSummary}
              onChange={(e) => setCaseSummary(e.target.value)}
              placeholder="해당 사건의 게시판 본문이 있으면 자동 로드됩니다. 요지를 입력하세요."
              rows={5}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 outline-none bg-white leading-relaxed"
            />
          </div>

          {/* 핵심 키워드 태그 */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">핵심 키워드 태그</label>
            <div className="flex flex-wrap gap-2 items-center">
              {keywords.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-800 rounded-full text-xs font-medium"
                >
                  {k}
                  <button type="button" onClick={() => removeKeyword(k)} className="p-0.5 rounded hover:bg-primary-100" aria-label="제거">
                    <X size={12} />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addKeyword())}
                placeholder="소멸시효, 대여금 등"
                className="flex-1 min-w-[120px] px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 outline-none bg-white"
              />
              <Button type="button" size="xs" variant="outline" leftIcon={<Plus size={12} />} onClick={addKeyword}>
                추가
              </Button>
            </div>
          </div>

          {/* 유사 판례 추천 버튼 */}
          <Button
            className="w-full"
            leftIcon={loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            onClick={handleSearch}
            disabled={loading}
          >
            {loading ? "검색 중…" : "유사 판례 추천"}
          </Button>

          {/* 유사 판례 추천 결과 목록 */}
          <div className="pt-2 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-600 mb-2">추천 결과 ({results.length}건)</h3>
            {results.length === 0 && !loading && (
              <p className="text-xs text-slate-500 py-4 text-center">
                사건 요지를 입력하고 「유사 판례 추천」을 누르면 상위 3~5건의 판례를 추천합니다.
              </p>
            )}
            <ul className="space-y-1.5">
              {results.map((card, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => setSelectedCard(card)}
                    className={cn(
                      "w-full text-left rounded-lg border px-3 py-2.5 transition-colors",
                      selectedCard === card
                        ? "border-primary-400 bg-primary-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-800 truncate flex-1">{card.caseNumber}</span>
                      <ChevronRight size={14} className={cn("shrink-0", selectedCard === card ? "text-primary-600" : "text-slate-400")} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{card.date} · {card.court}</p>
                    <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{card.issueSummary}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* ══════════════ 우측: 해당 판례 미리보기 창 (화면 꽉 차게) ══════════════ */}
      <main className="flex-1 min-w-0 flex flex-col bg-white overflow-hidden min-h-0">
        <div className="shrink-0 px-4 py-3 border-b border-slate-200 bg-white">
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText size={16} className="text-primary-500" />
            해당 판례 미리보기
          </h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          {!selectedCard ? (
            <div className="h-full min-h-[320px] flex flex-col items-center justify-center py-16 px-6 text-center text-slate-400 text-sm select-none">
              <Scale size={48} className="text-slate-200 mb-3" />
              <p className="font-medium text-slate-500">판례를 선택하면 미리보기가 표시됩니다</p>
              <p className="text-xs mt-1 text-slate-400">왼쪽에서 「유사 판례 추천」을 실행한 뒤, 목록에서 항목을 클릭하세요.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="shrink-0 p-4 sm:p-6 pb-2">
                <div className="max-w-3xl mx-auto rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 border-b border-slate-200">
                    <h3 className="text-lg font-bold text-slate-900">{selectedCard.caseNumber}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5 text-sm text-slate-600">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {selectedCard.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {selectedCard.court}
                      </span>
                    </div>
                  </div>
                  <div className="px-5 py-4 space-y-4">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">핵심 쟁점 요약</h4>
                      <p className="text-sm text-slate-800 leading-relaxed">{selectedCard.issueSummary}</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3">
                      <h4 className="text-xs font-semibold text-amber-800 mb-1">📌 이 사건과의 매칭 이유</h4>
                      <p className="text-sm text-amber-900 leading-relaxed">{selectedCard.matchReason}</p>
                    </div>
                  </div>
                </div>
                {boardId && postId && (
                  <div className="max-w-3xl mx-auto mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Plus size={14} />}
                      onClick={() => addToTimeline(selectedCard)}
                      className="w-full sm:w-auto"
                    >
                      타임라인에 기록
                    </Button>
                  </div>
                )}
              </div>

              {/* 판례 본문 요약: 남은 영역 꽉 채움 */}
              <div className="flex-1 min-h-0 flex flex-col px-4 sm:px-6 pb-6 pt-2">
                <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden flex flex-col">
                  <div className="shrink-0 px-4 py-2.5 border-b border-slate-200 bg-white">
                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">판례 요지 · 본문 요약</h4>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {selectedCard.bodySummary ? (
                      <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{selectedCard.bodySummary}</p>
                    ) : (
                      <p className="text-sm text-slate-500 italic">본문 요약이 없습니다. 유사 판례 추천을 다시 실행하면 판례 요지가 포함될 수 있습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
