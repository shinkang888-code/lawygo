/**
 * 관리자: 메뉴 목록 조회 / 메뉴 추가
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { getMenuRowsForAdmin } from "@/lib/menuService";
import {
  LNB_MENU,
  MOBILE_MAIN_MENU,
  MOBILE_MORE_MENU,
} from "@/lib/menuConfig";
import type { MenuType } from "@/lib/menuService";

function defaultRows(): { type: MenuType; item_order: number; item_id: string; label: string; href: string; icon: string; badge?: number; roles?: string[]; lawtop_module?: string }[] {
  const rows: { type: MenuType; item_order: number; item_id: string; label: string; href: string; icon: string; badge?: number; roles?: string[]; lawtop_module?: string }[] = [];
  LNB_MENU.forEach((m, i) => rows.push({ type: "lnb", item_order: i, item_id: m.id, label: m.label, href: m.href, icon: m.icon, badge: m.badge, roles: m.roles, lawtop_module: m.lawtopModule }));
  MOBILE_MAIN_MENU.forEach((m, i) => rows.push({ type: "mobile_main", item_order: i, item_id: m.id, label: m.label, href: m.href, icon: m.icon, badge: m.badge }));
  MOBILE_MORE_MENU.forEach((m, i) => rows.push({ type: "mobile_more", item_order: i, item_id: m.id, label: m.label, href: m.href, icon: m.icon }));
  return rows;
}

export async function GET() {
  try {
    const rows = await getMenuRowsForAdmin();
    if (rows && rows.length > 0) {
      return NextResponse.json({ data: rows, source: "db" });
    }
    return NextResponse.json({ data: defaultRows(), source: "default" });
  } catch (e) {
    return NextResponse.json({ data: defaultRows(), source: "default" });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: "DB가 연결되지 않았습니다." }, { status: 503 });
  }
  let body: { type: MenuType; item_id: string; label: string; href: string; icon: string; item_order?: number; badge?: number; roles?: string[]; lawtop_module?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { type, item_id, label, href, icon, item_order, badge, roles, lawtop_module } = body;
  if (!type || !item_id || !label || !href || !icon) {
    return NextResponse.json({ error: "type, item_id, label, href, icon 은 필수입니다." }, { status: 400 });
  }
  const order = typeof item_order === "number" ? item_order : 999;
  const { data, error } = await supabase
    .from("site_menus")
    .insert({
      type,
      item_id,
      label,
      href,
      icon,
      item_order: order,
      badge: badge ?? null,
      roles: roles ?? [],
      lawtop_module: lawtop_module ?? null,
    })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json(data);
}
