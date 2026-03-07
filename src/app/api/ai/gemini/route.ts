/**
 * Gemini AI API 브릿지
 * env 우선, 없으면 시스템 설정 > AI 연동관리(DB)에서 읽음
 * Rate limiting 적용 (비용·남용 방지)
 */

import { NextResponse } from "next/server";
import { AI_FEATURES } from "@/lib/boardConfig";
import { getAppSetting } from "@/lib/appSettingsServer";
import { checkRateLimit, getClientIdentifier, LIMIT_AI_PER_MIN } from "@/lib/rateLimit";

/** 사용할 모델 순서: 첫 번째 실패(미지원/할당량) 시 다음으로 폴백. gemini-2.0-flash 무료 한도 0이면 1.5-flash 사용 */
const MODELS_TO_TRY = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-1.5-pro"];
/** 사용자 입력 최대 길이 (Prompt Injection 완화) */
const MAX_PROMPT_LENGTH = 32000;

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
  const clientId = getClientIdentifier(req);
  if (!checkRateLimit(`ai:${clientId}`, LIMIT_AI_PER_MIN)) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
      { status: 429 }
    );
  }

  let GEMINI_API_KEY: string;
  try {
    GEMINI_API_KEY = await getGeminiApiKey();
  } catch (e) {
    console.error("getGeminiApiKey error:", e);
    return NextResponse.json(
      {
        error: "Gemini API 키를 불러오는 중 오류가 발생했습니다.",
        hint: "관리자 > 시스템 설정 > AI 연동관리에서 API 키를 확인하거나, .env.local에 GOOGLE_GEMINI_API_KEY 또는 GEMINI_API_KEY를 설정하세요.",
      },
      { status: 503 }
    );
  }

  if (!GEMINI_API_KEY || !GEMINI_API_KEY.trim()) {
    return NextResponse.json(
      {
        error: "Gemini API 키가 설정되지 않았습니다.",
        hint: ".env.local에 GOOGLE_GEMINI_API_KEY 또는 GEMINI_API_KEY를 넣거나, 관리자 > 시스템 설정 > AI 연동관리에서 API 키를 입력하세요. (Google AI Studio에서 발급)",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { prompt, featureId } = (body || {}) as { prompt?: string; featureId?: string };
    const promptStr = typeof prompt === "string" ? prompt.trim() : "";

    if (!promptStr) {
      return NextResponse.json(
        { error: "질문 내용이 비어 있습니다. 사건 요지 또는 검색어를 입력해 주세요." },
        { status: 400 }
      );
    }
    if (promptStr.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: `질문은 ${MAX_PROMPT_LENGTH.toLocaleString()}자 이내로 입력해 주세요.` },
        { status: 400 }
      );
    }

    const systemHint = featureId && SYSTEM_HINTS[featureId]
      ? SYSTEM_HINTS[featureId]
      : "당신은 법률 업무 지원 AI입니다. 질문에 맞게 정확하고 유용하게 답변하세요.";

    const generationConfig = { temperature: 0.4, maxOutputTokens: 8192 };
    let lastErrText = "";
    let lastStatus = 0;

    for (const model of MODELS_TO_TRY) {
      const payload = {
        contents: [{ role: "user", parts: [{ text: promptStr }] }],
        generationConfig,
      } as { contents: { role: string; parts: { text: string }[] }[]; generationConfig: object; systemInstruction?: { parts: { text: string }[] } };

      let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      payload.systemInstruction = { parts: [{ text: systemHint }] };

      let res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let errText = await res.text();

      if (!res.ok && (errText.includes("not found") || errText.includes("is not supported"))) {
        delete payload.systemInstruction;
        payload.contents[0].parts[0].text = `${systemHint}\n\n---\n\n${promptStr}`;
        url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        errText = await res.text();
      }

      if (res.ok) {
        const data = JSON.parse(errText) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        return NextResponse.json({ text, model });
      }

      lastErrText = errText;
      lastStatus = res.status;
      const lower = errText.toLowerCase();
      const isQuota = lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("exceeded your current quota");
      const isNotFound = lower.includes("not found") || lower.includes("is not supported");
      if (isQuota || isNotFound) continue;
      break;
    }

    let message = `Gemini API 오류 (${lastStatus})`;
    try {
      const errJson = JSON.parse(lastErrText) as { error?: { message?: string; status?: string } };
      const msg = errJson?.error?.message ?? errJson?.error?.status;
      if (msg) message = msg;
    } catch {
      // keep default
    }
    const lower = lastErrText.toLowerCase();
    if (lower.includes("api key") || (lower.includes("invalid") && lower.includes("key"))) {
      message = "API 키가 유효하지 않습니다. Google AI Studio에서 키를 확인하세요.";
    } else if (lower.includes("quota") || lower.includes("resource_exhausted") || lower.includes("exceeded your current quota")) {
      const retryMatch = lastErrText.match(/retry\s+in\s+([\d.]+)s/i);
      const retrySec = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
      message = "모든 Gemini 모델의 할당량을 초과했습니다. ";
      if (retrySec != null && retrySec > 0) {
        message += `${retrySec}초 후에 다시 시도해 보세요. `;
      }
      message += "Google AI Studio에서 결제를 활성화하거나 할당량이 리셋된 뒤 이용해 주세요.";
    } else if (lower.includes("not found") || lower.includes("is not supported")) {
      message = "사용 가능한 Gemini 모델을 찾지 못했습니다. Google AI Studio에서 API 키와 모델을 확인하세요.";
    } else if (lastErrText.length > 0 && lastErrText.length < 200) {
      message = lastErrText;
    }
    return NextResponse.json(
      { error: message, detail: lastErrText.slice(0, 300) },
      { status: lastStatus >= 500 ? 502 : 400 }
    );
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
