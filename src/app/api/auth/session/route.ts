/**
 * 현재 세션 조회 (로그인 여부)
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/authSession";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: session }, { status: 200 });
}
