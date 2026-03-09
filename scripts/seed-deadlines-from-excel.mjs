/**
 * datelist.xls 사건 기일 리스트로 public.deadlines 갱신
 * - 사건번호로 public.cases와 연동하여 case_id 설정
 * - 기존 deadlines 전부 삭제 후 엑셀 행만 삽입 (매칭되는 사건만)
 *
 * 사용:
 *   node scripts/seed-deadlines-from-excel.mjs "c:\...\datelist.xls"
 */

import { createClient } from "@supabase/supabase-js";
import XLSX from "xlsx";
import { readFileSync, existsSync } from "fs";
import path from "path";

function loadEnvLocal() {
  const root = path.resolve(process.cwd());
  const file = path.join(root, ".env.local");
  if (!existsSync(file)) return;
  const content = readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
}
loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const excelPath = process.argv[2] || path.join(process.cwd(), "datelist.xls");

if (!url || !serviceKey) {
  console.error("오류: .env.local 에 NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 를 설정하세요.");
  process.exit(1);
}

const excelPathResolved = path.isAbsolute(excelPath) ? excelPath : path.join(process.cwd(), excelPath);
if (!existsSync(excelPathResolved)) {
  console.error("오류: 엑셀 파일을 찾을 수 없습니다.", excelPathResolved);
  process.exit(1);
}

/** "2026-03-03 (화)" → "2026-03-03" */
function parseProgressDate(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  const match = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 10000) {
    const d = new Date((v - 25569) * 86400 * 1000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

/**
 * datelist.xls 한 행 → deadlines 삽입용 (case_id는 별도 조회)
 * 헤더: 구분, 의뢰인(고객), 진행일(요일), 기일명/내용, 기관, D-일, ▪ 특이사항, 결과, 사건번호, ...
 */
function rowToDeadline(row, caseId) {
  const get = (key) => row[key] ?? "";
  const trim = (key) => String(get(key)).trim();
  const 진행일 = parseProgressDate(get("진행일(요일)"));
  const 사건번호 = trim("사건번호");
  const 기일명 = trim("기일명/내용");
  if (!진행일 || !caseId) return null;

  const dDay = trim("D-일");
  const is_immutable = dDay.includes("불변");
  const memoParts = [
    trim("▪ 특이사항"),
    trim("결과"),
    trim("준비사항/기타"),
    trim("출석") ? `출석: ${trim("출석")}` : "",
  ].filter(Boolean);
  const memo = memoParts.join(" / ").slice(0, 2000);

  return {
    case_id: caseId,
    deadline_date: 진행일,
    deadline_type: 기일명.slice(0, 200) || "기일",
    court: trim("기관") || null,
    memo: memo || null,
    is_immutable: is_immutable,
    completed_at: trim("결과") ? new Date().toISOString() : null,
  };
}

async function main() {
  const buf = readFileSync(excelPathResolved);
  const wb = XLSX.read(buf, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  const db = createClient(url, serviceKey);

  const { data: caseRows } = await db.from("cases").select("id, case_number");
  const caseByNumber = new Map((caseRows || []).map((r) => [String(r.case_number).trim(), r.id]));

  const toInsert = [];
  let skipped = 0;
  for (let i = 1; i < rows.length; i++) {
    const rowArr = rows[i];
    const row = {};
    (rows[0] || []).forEach((h, j) => {
      if (h != null && String(h).trim() !== "") row[h] = rowArr[j];
    });
    const 사건번호 = String(row["사건번호"] ?? "").trim();
    const caseId = caseByNumber.get(사건번호);
    if (!caseId) {
      skipped++;
      continue;
    }
    const d = rowToDeadline(row, caseId);
    if (d) toInsert.push(d);
  }

  const { data: existing } = await db.from("deadlines").select("id");
  const ids = (existing || []).map((r) => r.id);
  if (ids.length > 0) {
    for (let i = 0; i < ids.length; i += 100) {
      const chunk = ids.slice(i, i + 100);
      const { error } = await db.from("deadlines").delete().in("id", chunk);
      if (error) {
        console.error("deadlines 삭제 실패:", error);
        process.exit(1);
      }
    }
    console.log("기존 기일", ids.length, "건 삭제됨.");
  }

  if (toInsert.length === 0) {
    console.log("삽입할 기일이 없습니다. (사건번호가 cases 테이블에 있는 행만 반영됩니다.)");
    if (skipped > 0) console.log("매칭되지 않은 사건번호로 건너뛴 행:", skipped);
    process.exit(0);
  }

  const chunk = 80;
  for (let i = 0; i < toInsert.length; i += chunk) {
    const slice = toInsert.slice(i, i + chunk);
    const { error } = await db.from("deadlines").insert(slice);
    if (error) {
      console.error("deadlines 삽입 실패:", error);
      process.exit(1);
    }
  }
  console.log("기일(deadlines)", toInsert.length, "건 삽입 완료. 사건과 연동되었습니다.");
  if (skipped > 0) console.log("사건 매칭 안 됨으로 건너뛴 행:", skipped);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
