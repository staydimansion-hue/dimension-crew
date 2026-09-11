import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { kstDateString } from "@/lib/kst";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const hourlyWage = Number(body?.hourlyWage);
  const effectiveFrom =
    typeof body?.effectiveFrom === "string" && body.effectiveFrom
      ? body.effectiveFrom
      : kstDateString();

  if (!Number.isFinite(hourlyWage) || hourlyWage < 0) {
    return NextResponse.json({ error: "시급 값이 올바르지 않습니다." }, { status: 400 });
  }

  const settings = await getSettings();
  const belowMinWage =
    settings.min_wage_krw != null && hourlyWage < settings.min_wage_krw;

  const { error } = await supabaseAdmin.from("wage_rates").insert({
    staff_id: id,
    hourly_wage: hourlyWage,
    effective_from: effectiveFrom,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, belowMinWage });
}
