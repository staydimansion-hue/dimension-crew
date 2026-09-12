import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null);
  const updates: Record<string, unknown> = {};

  if (body?.deductionRate !== undefined) {
    const v = Number(body.deductionRate);
    if (!Number.isFinite(v) || v < 0 || v >= 1) {
      return NextResponse.json({ error: "공제율 값이 올바르지 않습니다." }, { status: 400 });
    }
    updates.deduction_rate = v;
  }
  if (body?.minWageKrw !== undefined) {
    const v = body.minWageKrw === null ? null : Number(body.minWageKrw);
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      return NextResponse.json({ error: "최저시급 값이 올바르지 않습니다." }, { status: 400 });
    }
    updates.min_wage_krw = v;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("settings")
    .update(updates)
    .eq("id", 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}
