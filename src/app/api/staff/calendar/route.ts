import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { getSettings } from "@/lib/settings";

export async function GET(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // "YYYY-MM"
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ error: "month는 YYYY-MM 형식이어야 합니다." }, { status: 400 });
  }

  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${month}-${String(lastDay).padStart(2, "0")}`;

  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("work_date, hours_worked, amount, status")
    .eq("staff_id", session.staffId)
    .gte("work_date", from)
    .lte("work_date", to)
    .not("clock_out_at", "is", null)
    .order("work_date", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings = await getSettings();
  const totalAmount = (shifts ?? []).reduce((sum, s) => sum + (s.amount ?? 0), 0);
  const projectedPayout = Math.round(totalAmount * (1 - Number(settings.deduction_rate)));

  return NextResponse.json({ shifts, totalAmount, projectedPayout });
}
