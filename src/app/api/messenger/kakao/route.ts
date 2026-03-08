/**
 * 카카오톡 발송 (카카오 비즈 메시지 알림톡 API)
 * POST body: { receivers: string[], message: string }
 * env 우선, 없으면 시스템 설정 > 메신저 연동관리(DB)에서 읽음
 */

import { NextRequest, NextResponse } from "next/server";
import { getAppSetting } from "@/lib/appSettingsServer";

async function getKakaoConfig(): Promise<{ accessToken: string; senderKey: string; templateCode?: string }> {
  const accessToken = process.env.KAKAO_BIZ_ACCESS_TOKEN ?? "";
  const senderKey = process.env.KAKAO_BIZ_SENDER_KEY ?? "";
  const templateCode = process.env.KAKAO_BIZ_TEMPLATE_CODE;
  if (accessToken && senderKey) return { accessToken, senderKey, templateCode };
  const stored = await getAppSetting<{ kakaoBizAccessToken?: string; kakaoSenderKey?: string }>("messenger_settings");
  return {
    accessToken: stored?.kakaoBizAccessToken ?? accessToken,
    senderKey: stored?.kakaoSenderKey ?? senderKey,
    templateCode,
  };
}

export async function POST(request: NextRequest) {
  const { accessToken, senderKey, templateCode } = await getKakaoConfig();

  if (!accessToken || !senderKey) {
    return NextResponse.json(
      {
        error:
          "카카오톡 연동이 설정되지 않았습니다. 시스템 설정 > 메신저 연동관리에서 카카오 비즈 액세스 토큰·발신 키를 입력하세요. " +
          "카카오 비즈니스 채널·알림톡 템플릿 등록이 필요합니다.",
      },
      { status: 503 }
    );
  }

  let body: { receivers?: string[]; message?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const receivers = body.receivers;
  const message = (body.message ?? "").trim();

  if (!Array.isArray(receivers) || receivers.length === 0) {
    return NextResponse.json({ error: "수신 번호를 1개 이상 입력하세요." }, { status: 400 });
  }
  if (receivers.length > 5) {
    return NextResponse.json({ error: "수신 번호는 최대 5개까지 가능합니다." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "발송 내용을 입력하세요." }, { status: 400 });
  }

  const phones = receivers
    .map((r) => String(r).replace(/\D/g, "").trim())
    .filter((r) => r.length >= 10)
    .map((r) => (r.startsWith("0") ? "82" + r : r.startsWith("82") ? r : "82" + r));

  if (phones.length === 0) {
    return NextResponse.json({ error: "유효한 수신 번호가 없습니다." }, { status: 400 });
  }

  // 카카오 비즈 메시지 API (알림톡) - 템플릿 코드 필수인 경우가 많음
  const baseUrl = process.env.KAKAO_BIZ_BASE_URL ?? "https://bizmsg-web.kakaoenterprise.com";
  const sendUrl = `${baseUrl}/v2/send/kakao`;

  const results: { phone: string; success: boolean; error?: string }[] = [];

  const senderNo = process.env.KAKAO_BIZ_SENDER_NO ?? "";
  if (!senderNo.trim()) {
    return NextResponse.json(
      { error: "발신 번호가 설정되지 않았습니다. KAKAO_BIZ_SENDER_NO 환경 변수 또는 카카오 비즈 계약 발신번호를 설정하세요." },
      { status: 503 }
    );
  }

  for (const phone of phones) {
    try {
      const cid = process.env.KAKAO_BIZ_CID ?? `lawygo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const payload: Record<string, unknown> = {
        message_type: "AT",
        sender_key: senderKey,
        cid,
        phone_number: phone,
        sender_no: senderNo,
        message,
        fall_back_yn: false,
      };
      if (templateCode) payload.template_code = templateCode;

      const res = await fetch(sendUrl, {
        method: "POST",
        headers: {
          accept: "*/*",
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { code?: string; result?: { detail_message?: string } };
      const code = data.code ?? String(res.status);

      if (!res.ok) {
        results.push({ phone, success: false, error: data.result?.detail_message ?? data.result ?? res.statusText });
        continue;
      }
      if (code !== "200" && code !== "100") {
        results.push({ phone, success: false, error: data.result?.detail_message ?? `코드 ${code}` });
        continue;
      }
      results.push({ phone, success: true });
    } catch (e) {
      results.push({
        phone,
        success: false,
        error: e instanceof Error ? e.message : "요청 실패",
      });
    }
  }

  const successCnt = results.filter((r) => r.success).length;
  if (successCnt === 0) {
    return NextResponse.json(
      { error: "카카오톡 발송에 실패했습니다.", details: results },
      { status: 502 }
    );
  }

  return NextResponse.json({
    message: `${successCnt}건 발송 요청되었습니다.`,
    success_cnt: successCnt,
    results,
  });
}
