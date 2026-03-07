/**
 * 로그아웃: 세션 쿠키 삭제
 */

import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/authSession";

export async function POST() {
  const cookie = await deleteSession();
  const res = NextResponse.json({ success: true });
  res.headers.set("Set-Cookie", cookie);
  return res;
}
