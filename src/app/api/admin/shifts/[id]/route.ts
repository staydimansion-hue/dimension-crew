import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { updateCheckOutRow } from "@/lib/sheets";
import { updateAttendancePage } from "@/lib/notion";
import { kstDateTimeString } from "@/lib/kst";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  // "YYYY-MM-DDTHH:mm" 형식(한국 시간 기준, datetime-local input 값)
  const clockOutLocal = typeof body?.clockOutAt === "string" ? body.clockOutAt : "";

  if (!clockOutLocal) {
    return NextResponse.json({ error: "퇴근 시각이 필요합니다." }, { status: 400 });
  }

  const clockOutAt = new Date(`${clockOutLocal}:00+09:00`);
  if (Number.isNaN(clockOutAt.getTime())) {
    return NextResponse.json({ error: "퇴근 시각 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: shift, error: shiftError } = await supabaseAdmin
    .from("shifts")
    .select("id, clock_in_at, hourly_wage, sheet_row, notion_page_id")
    .eq("id", id)
    .maybeSingle();

  if (shiftError) {
    return NextResponse.json({ error: shiftError.message }, { status: 500 });
  }
  if (!shift) {
    return NextResponse.json({ error: "근무 기록을 찾을 수 없습니다." }, { status: 404 });
  }

  const clockInAt = new Date(shift.clock_in_at);
  if (clockOutAt.getTime() <= clockInAt.getTime()) {
    return NextResponse.json(
      { error: "퇴근 시각이 출근 시각보다 늦어야 합니다." },
      { status: 400 }
    );
  }

  const hoursWorked =
    Math.round(((clockOutAt.getTime() - clockInAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
  const hourlyWage = shift.hourly_wage ?? 0;
  const amount = Math.round(hoursWorked * hourlyWage);

  const { error: updateError } = await supabaseAdmin
    .from("shifts")
    .update({
      clock_out_at: clockOutAt.toISOString(),
      hours_worked: hoursWorked,
      amount,
      status: "done",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (shift.sheet_row) {
    try {
      await updateCheckOutRow({
        rowNumber: shift.sheet_row,
        checkOutTimeStr: kstDateTimeString(clockOutAt),
        hoursWorked,
        hourlyWage,
        amount,
      });
    } catch (err) {
      console.error("Google Sheets 퇴근시각 수정 실패:", err);
    }
  }

  if (shift.notion_page_id) {
    try {
      await updateAttendancePage({
        pageId: shift.notion_page_id,
        checkOutIso: clockOutAt.toISOString(),
        hoursWorked,
      });
    } catch (err) {
      console.error("Notion 퇴근시각 수정 실패:", err);
    }
  }

  return NextResponse.json({ ok: true, hoursWorked, amount });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin.from("shifts").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
