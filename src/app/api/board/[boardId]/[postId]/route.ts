/**
 * 전문 게시판 중간 관리자 API - 게시물 단건 조회/수정/삭제
 */

import { NextRequest, NextResponse } from "next/server";
import { bridgeGetPost, bridgeUpdatePost, bridgeDeletePost } from "@/lib/boardBridge";

type Params = { params: Promise<{ boardId: string; postId: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  const result = await bridgeGetPost(boardId, id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: result.source === "fallback" ? 502 : 404 }
    );
  }
  return NextResponse.json(result);
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  let body: { wr_subject?: string; wr_content?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "잘못된 요청 본문입니다." }, { status: 400 });
  }

  const result = await bridgeUpdatePost(boardId, id, body);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: 502 }
    );
  }
  return NextResponse.json(result);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { boardId, postId } = await params;
  const id = Number(postId);
  if (Number.isNaN(id)) {
    return NextResponse.json({ success: false, error: "잘못된 게시물 ID입니다." }, { status: 400 });
  }

  const result = await bridgeDeletePost(boardId, id);
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error, data: result.data },
      { status: 502 }
    );
  }
  return NextResponse.json(result);
}
