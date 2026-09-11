import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashPin } from "@/lib/pin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};

  if (typeof body?.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body?.phone === "string" && body.phone.trim()) {
    updates.phone = body.phone.replace(/[^0-9]/g, "");
  }
  if (typeof body?.isActive === "boolean") {
    updates.is_active = body.isActive;
  }
  if (typeof body?.newPin === "string" && body.newPin.length > 0) {
    updates.pin_hash = await hashPin(body.newPin);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("staff")
    .update(updates)
    .eq("id", id)
    .select("id, name, phone, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ staff: data });
}
