import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPin } from "@/lib/pin";
import { createStaffSessionCookie } from "@/lib/staffSession";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? body.phone.replace(/[^0-9]/g, "") : "";
  const pin = typeof body?.pin === "string" ? body.pin : "";

  if (!phone || !pin) {
    return NextResponse.json(
      { error: "전화번호와 PIN을 입력해주세요." },
      { status: 400 }
    );
  }

  const { data: staff, error } = await supabaseAdmin
    .from("staff")
    .select("id, name, pin_hash, is_active")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!staff || !staff.is_active) {
    return NextResponse.json(
      { error: "전화번호 또는 PIN이 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const ok = await verifyPin(pin, staff.pin_hash);
  if (!ok) {
    return NextResponse.json(
      { error: "전화번호 또는 PIN이 올바르지 않습니다." },
      { status: 401 }
    );
  }

  await createStaffSessionCookie(staff.id, staff.name);
  return NextResponse.json({ ok: true, name: staff.name });
}
