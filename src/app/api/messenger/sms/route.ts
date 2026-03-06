/**
 * 문자 발송 (알리고 API)
 * POST body: { receivers: string[], message: string }
 * env: ALIGO_KEY, ALIGO_USER_ID, ALIGO_SENDER
 */

import { NextRequest, NextResponse } from "next/server";

const ALIGO_SEND_URL = "https://apis.aligo.in/send/";

export async function POST(request: NextRequest) {
  const key = process.env.ALIGO_KEY ?? process.env.ALIGO_API_KEY;
  const userId = process.env.ALIGO_USER_ID;
  const sender = process.env.ALIGO_SENDER;

  if (!key || !userId || !sender) {
    return NextResponse.json(
      { error: "알리고 연동이 설정되지 않았습니다. ALIGO_KEY, ALIGO_USER_ID, ALIGO_SENDER 환경 변수를 설정하세요." },
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

  const receiver = receivers
    .map((r) => String(r).replace(/\D/g, "").trim())
    .filter((r) => r.length >= 10);
  if (receiver.length === 0) {
    return NextResponse.json({ error: "유효한 수신 번호가 없습니다." }, { status: 400 });
  }

  const form = new URLSearchParams({
    key,
    user_id: userId,
    sender,
    receiver: receiver.join(","),
    msg: message,
  });
  if (new Blob([message]).size > 90) {
    form.set("msg_type", "LMS");
    form.set("title", message.slice(0, 30));
  }

  try {
    const res = await fetch(ALIGO_SEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
      body: form.toString(),
    });
    const data = await res.json().catch(() => ({}));
    const resultCode = Number(data.result_code);
    if (resultCode < 1) {
      return NextResponse.json(
        { error: data.message || "알리고 발송 실패", detail: data },
        { status: 502 }
      );
    }
    return NextResponse.json({
      message: `${data.success_cnt ?? receiver.length}건 발송 요청되었습니다.`,
      msg_id: data.msg_id,
      success_cnt: data.success_cnt,
      error_cnt: data.error_cnt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "알리고 API 요청 실패" },
      { status: 502 }
    );
  }
}
