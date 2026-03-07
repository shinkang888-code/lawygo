/**
 * 서버 전용: app_settings 테이블에서 설정 조회 (API Route 등)
 */

import { getSupabaseAdmin } from "./supabaseClient";

export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.from("app_settings").select("value").eq("key", key).single();
  if (error || data == null) return null;
  return data.value as T;
}
