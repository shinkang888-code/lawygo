import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseClient";

export async function DELETE() {
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }

  // id만 페이지네이션으로 읽어와 모두 삭제
  let totalDeleted = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error } = await db.from("cases").select("id").range(0, pageSize - 1);
    if (error) {
      return NextResponse.json({ error: error.message, deleted: totalDeleted }, { status: 400 });
    }
    const ids = (data ?? []).map((r) => r.id as string).filter(Boolean);
    if (ids.length === 0) break;
    const { error: delError } = await db.from("cases").delete().in("id", ids);
    if (delError) {
      return NextResponse.json({ error: delError.message, deleted: totalDeleted }, { status: 400 });
    }
    totalDeleted += ids.length;
    if (ids.length < pageSize) break;
  }

  return NextResponse.json({ message: `전체 사건 ${totalDeleted}건을 삭제했습니다.`, deleted: totalDeleted });
}

