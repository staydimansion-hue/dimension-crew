import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString } from "@/lib/kst";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("shifts")
    .select("id, clock_in_at")
    .eq("staff_id", session.staffId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: todayShifts, error: todayError } = await supabaseAdmin
    .from("shifts")
    .select("id")
    .eq("staff_id", session.staffId)
    .eq("work_date", kstDateString())
    .limit(1);

  if (todayError) {
    return NextResponse.json({ error: todayError.message }, { status: 500 });
  }

  return NextResponse.json({
    hasOpenShift: !!data,
    clockInAt: data?.clock_in_at ?? null,
    checkedInToday: (todayShifts?.length ?? 0) > 0,
    name: session.name,
  });
}
