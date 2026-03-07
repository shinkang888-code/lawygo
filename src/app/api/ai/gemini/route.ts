/**
 * Gemini AI API 브릿지
 * env 우선, 없으면 시스템 설정 > AI 연동관리(DB)에서 읽음
 */

import { NextResponse } from "next/server";
import { AI_FEATURES } from "@/lib/boardConfig";
import { getAppSetting } from "@/lib/appSettingsServer";

const MODEL = "gemini-1.5-flash";

async function getGeminiApiKey(): Promise<string> {
  const envKey = process.env.GOOGLE_GEMINI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
  if (envKey) return envKey;
  const stored = await getAppSetting<{ geminiApiKey?: string }>("ai_settings");
  return (stored?.geminiApiKey ?? "").trim();
}

const SYSTEM_HINTS: Record<string, string> = {
  case_search: "당신은 대한민국 판례 검색·요약 전문가입니다. 질문에 맞는 판례 검색 방법, 요건, 관련 판례 요약을 답변하세요.",
  law_search: "당신은 대한민국 법령·조문 검색·해석 전문가입니다. 질문에 맞는 법령, 조문, 해석을 답변하세요.",
  doc_summary: "당신은 문서 요약 전문가입니다. 사용자가 제공한 문서를 핵심만 간결하게 요약하세요.",
  doc_draft: "당신은 법률 서면(진술서, 의견서 등) 초안 작성 전문가입니다. 요청에 맞는 서면 초안을 작성하세요.",
  ai_search: "당신은 법률·판례 통합 검색 도우미입니다. 자연어 질의를 분석하고 관련 법령·판례·해석을 종합해 답변하세요.",
};

export async function POST(req: Request) {
  const GEMINI_API_KEY = await getGeminiApiKey();
  if (!GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Gemini API 키가 설정되지 않았습니다. 시스템 설정 > AI 연동관리에서 API 키를 입력하세요." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { prompt, featureId } = body as { prompt?: string; featureId?: string };

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt가 필요합니다." }, { status: 400 });
    }

    const systemHint = featureId && SYSTEM_HINTS[featureId]
      ? SYSTEM_HINTS[featureId]
      : "당신은 법률 업무 지원 AI입니다. 질문에 맞게 정확하고 유용하게 답변하세요.";

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: `${systemHint}\n\n---\n\n${prompt.trim()}` }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `Gemini API 오류: ${res.status}`, detail: err.slice(0, 500) },
        { status: res.status >= 500 ? 502 : 400 }
      );
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text =
      data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
      "";

    return NextResponse.json({ text, model: MODEL });
  } catch (e) {
    console.error("Gemini API error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "AI 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const key = await getGeminiApiKey();
  return NextResponse.json({
    configured: !!key,
    features: AI_FEATURES.map((f) => ({ id: f.id, name: f.name })),
  });
}
