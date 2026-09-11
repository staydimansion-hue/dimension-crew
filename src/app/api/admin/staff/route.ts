import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPin } from "@/lib/pin";
import { kstDateString } from "@/lib/kst";

const DEFAULT_PIN = "0808";

export async function GET() {
  const { data: staffList, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, phone, is_active, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const todayStr = kstDateString();
  const staffWithWage = await Promise.all(
    (staffList ?? []).map(async (s) => {
      const { data: wageRow } = await supabaseAdmin
        .from("wage_rates")
        .select("hourly_wage, effective_from")
        .eq("staff_id", s.id)
        .lte("effective_from", todayStr)
        .order("effective_from", { ascending: false })
        .limit(1)
        .maybeSingle();
      return { ...s, hourly_wage: wageRow?.hourly_wage ?? null };
    })
  );

  return NextResponse.json({ staff: staffWithWage });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.replace(/[^0-9]/g, "") : "";
  const hourlyWage = Number(body?.hourlyWage);

  if (!name || !phone || !Number.isFinite(hourlyWage) || hourlyWage < 0) {
    return NextResponse.json(
      { error: "이름, 전화번호, 시급을 올바르게 입력해주세요." },
      { status: 400 }
    );
  }

  const pinHash = await hashPin(DEFAULT_PIN);

  const { data: staff, error } = await supabaseAdmin
    .from("staff")
    .insert({ name, phone, pin_hash: pinHash })
    .select("id, name, phone, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { error: wageError } = await supabaseAdmin.from("wage_rates").insert({
    staff_id: staff.id,
    hourly_wage: hourlyWage,
    effective_from: kstDateString(),
  });

  if (wageError) {
    return NextResponse.json({ error: wageError.message }, { status: 500 });
  }

  return NextResponse.json({
    staff: { ...staff, hourly_wage: hourlyWage },
    initialPin: DEFAULT_PIN,
  });
}
