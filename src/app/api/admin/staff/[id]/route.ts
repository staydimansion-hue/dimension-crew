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

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const [{ count: shiftCount, error: shiftError }, { count: taskCount, error: taskError }] =
    await Promise.all([
      supabaseAdmin
        .from("shifts")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", id),
      supabaseAdmin
        .from("room_tasks")
        .select("id", { count: "exact", head: true })
        .eq("staff_id", id),
    ]);

  if (shiftError) return NextResponse.json({ error: shiftError.message }, { status: 500 });
  if (taskError) return NextResponse.json({ error: taskError.message }, { status: 500 });

  if ((shiftCount ?? 0) > 0 || (taskCount ?? 0) > 0) {
    return NextResponse.json(
      {
        error:
          "출퇴근·청소 기록이 있는 직원은 삭제할 수 없습니다. 기록 보존을 위해 대신 '비활성화'를 사용해주세요.",
      },
      { status: 409 }
    );
  }

  const { error } = await supabaseAdmin.from("staff").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
