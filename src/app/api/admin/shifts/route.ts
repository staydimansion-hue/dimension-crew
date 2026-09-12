import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabaseAdmin
    .from("shifts")
    .select(
      "id, work_date, clock_in_at, clock_out_at, hours_worked, hourly_wage, amount, status, sheet_row, payroll_row, staff(name)"
    )
    .order("work_date", { ascending: false })
    .order("clock_in_at", { ascending: false });

  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ shifts: data });
}
