import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { writePayrollEntry } from "@/lib/sheets";
import { kstTimeString } from "@/lib/kst";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: shift, error } = await supabaseAdmin
    .from("shifts")
    .select("id, work_date, clock_in_at, clock_out_at, hours_worked, hourly_wage, staff(name)")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!shift) {
    return NextResponse.json({ error: "근무 기록을 찾을 수 없습니다." }, { status: 404 });
  }
  if (!shift.clock_out_at || shift.hours_worked == null || shift.hourly_wage == null) {
    return NextResponse.json(
      { error: "아직 퇴근 처리가 끝나지 않은 근무입니다." },
      { status: 400 }
    );
  }

  const staff = Array.isArray(shift.staff) ? shift.staff[0] : shift.staff;
  const staffName = staff?.name;
  if (!staffName) {
    return NextResponse.json({ error: "직원 이름을 확인할 수 없습니다." }, { status: 400 });
  }

  try {
    const result = await writePayrollEntry({
      name: staffName,
      hourlyWage: shift.hourly_wage,
      startTimeStr: kstTimeString(shift.clock_in_at),
      endTimeStr: kstTimeString(shift.clock_out_at),
      hoursWorked: shift.hours_worked,
      workDate: shift.work_date,
    });

    const { error: updateError } = await supabaseAdmin
      .from("shifts")
      .update({ payroll_row: result.row })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, row: result.row, created: result.created });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "급여장부 입력에 실패했습니다." },
      { status: 500 }
    );
  }
}
