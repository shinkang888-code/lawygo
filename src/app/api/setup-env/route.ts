/**
 * 로컬 개발 전용: .env.local에 Supabase 키 저장
 * NODE_ENV=development 일 때만 동작합니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile } from "fs/promises";
import { join } from "path";

const ENV_LOCAL = ".env.local";
const KEYS = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "이 기능은 로컬 개발 환경에서만 사용할 수 있습니다." },
      { status: 403 }
    );
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const pairs: [string, string][] = KEYS.map((key) => [
    key,
    (body[key] ?? "").trim(),
  ]);
  const missing = pairs.filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    return NextResponse.json(
      { error: `다음 값을 입력하세요: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const projectRoot = process.cwd();
    const envPath = join(projectRoot, ENV_LOCAL);

    let lines: string[] = [];
    try {
      const content = await readFile(envPath, "utf-8");
      lines = content.split(/\r?\n/);
    } catch {
      // 파일 없음 → 새로 작성
    }

    const setKeys = new Set(KEYS);
    const updated = lines
      .filter((line) => {
        const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=/);
        return !match || !setKeys.has(match[1]);
      })
      .concat(
        pairs.map(([k, v]) => `${k}=${v.replace(/\n/g, " ")}`)
      );

    await writeFile(envPath, updated.join("\n") + "\n", "utf-8");
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[setup-env]", e);
    return NextResponse.json(
      { error: ".env.local 저장 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
