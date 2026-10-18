import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createAttendancePage, updateAttendancePage } from "@/lib/notion";

type ShiftRow = {
  id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  notion_page_id: string | null;
  staff: { name: string } | { name: string }[] | null;
};

function staffName(s: ShiftRow["staff"]): string {
  if (!s) return "-";
  return Array.isArray(s) ? (s[0]?.name ?? "-") : s.name;
}

/**
 * 10월 출퇴근 기록을 Notion "출퇴근 기록" DB에 소급 반영하는 1회성 백필 엔드포인트.
 * 관리자 로그인 상태에서 브라우저로 이 주소를 열면 실행된다 (/api/admin/* 는 미들웨어가 보호).
 */
export async function GET() {
  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("id, work_date, clock_in_at, clock_out_at, hours_worked, notion_page_id, staff(name)")
    .gte("work_date", "2026-10-01")
    .lte("work_date", "2026-10-31")
    .is("notion_page_id", null)
    .order("work_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (shifts ?? []) as ShiftRow[];
  let created = 0;
  let updated = 0;
  const failures: { id: string; error: string }[] = [];

  for (const s of rows) {
    try {
      const pageId = await createAttendancePage({
        name: staffName(s.staff),
        dateStr: s.work_date,
        checkInIso: s.clock_in_at,
      });
      created += 1;

      if (s.clock_out_at && s.hours_worked != null) {
        await updateAttendancePage({
          pageId,
          checkOutIso: s.clock_out_at,
          hoursWorked: s.hours_worked,
        });
        updated += 1;
      }

      await supabaseAdmin.from("shifts").update({ notion_page_id: pageId }).eq("id", s.id);
    } catch (err) {
      failures.push({ id: s.id, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ totalFound: rows.length, created, updated, failures });
}
