import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";
import { cycleKeyForWorkDate, cycleRange, cycleLabel } from "@/lib/payCycle";

type ShiftJoin = {
  id: string;
  work_date: string;
  clock_in_at: string;
  clock_out_at: string | null;
  hours_worked: number | null;
  amount: number | null;
  payroll_row: number | null;
  staff_id: string;
  staff: { name: string } | { name: string }[] | null;
};

function staffName(s: ShiftJoin["staff"]): string {
  if (!s) return "-";
  return Array.isArray(s) ? s[0]?.name ?? "-" : s.name;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const cycleKey = searchParams.get("cycle") || cycleKeyForWorkDate(kstDateString());
  const { from, to } = cycleRange(cycleKey);

  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("id, work_date, clock_in_at, clock_out_at, hours_worked, amount, payroll_row, staff_id, staff(name)")
    .gte("work_date", from)
    .lte("work_date", to)
    .not("clock_out_at", "is", null)
    .order("work_date", { ascending: false })
    .order("clock_in_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (shifts ?? []) as ShiftJoin[];

  const byStaff = new Map<
    string,
    { staffId: string; name: string; hours: number; amount: number; pendingCount: number }
  >();
  for (const s of rows) {
    const prev = byStaff.get(s.staff_id) ?? {
      staffId: s.staff_id,
      name: staffName(s.staff),
      hours: 0,
      amount: 0,
      pendingCount: 0,
    };
    prev.hours += s.hours_worked ?? 0;
    prev.amount += s.amount ?? 0;
    if (!s.payroll_row) prev.pendingCount += 1;
    byStaff.set(s.staff_id, prev);
  }

  const { data: exportRow } = await supabaseAdmin
    .from("sheet_exports")
    .select("reminder_sent_at, announced_at")
    .eq("cycle_key", cycleKey)
    .maybeSingle();

  return NextResponse.json({
    cycleKey,
    from,
    to,
    label: cycleLabel(cycleKey),
    reminderSentAt: exportRow?.reminder_sent_at ?? null,
    announcedAt: exportRow?.announced_at ?? null,
    staffSummaries: Array.from(byStaff.values()).sort((a, b) => a.name.localeCompare(b.name, "ko")),
    shifts: rows.map((s) => ({
      id: s.id,
      workDate: s.work_date,
      staffName: staffName(s.staff),
      clockInAt: s.clock_in_at,
      clockOutAt: s.clock_out_at,
      hoursWorked: s.hours_worked,
      amount: s.amount,
      payrollRow: s.payroll_row,
    })),
  });
}
