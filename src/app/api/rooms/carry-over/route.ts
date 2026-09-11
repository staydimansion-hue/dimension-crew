import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const roomTaskId = typeof body?.roomTaskId === "string" ? body.roomTaskId : "";
  if (!roomTaskId) {
    return NextResponse.json({ error: "객실 정보가 없습니다." }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, staff_id, room_id, work_date")
    .eq("id", roomTaskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
  if (!task || task.staff_id !== session.staffId) {
    return NextResponse.json({ error: "본인에게 배정된 객실이 아닙니다." }, { status: 403 });
  }

  const nextDate = new Date(`${task.work_date}T00:00:00`);
  nextDate.setDate(nextDate.getDate() + 1);
  const nextDateStr = nextDate.toISOString().slice(0, 10);

  const { data: carried, error: carryError } = await supabaseAdmin
    .from("room_tasks")
    .insert({
      work_date: nextDateStr,
      room_id: task.room_id,
      staff_id: null,
      source: "admin",
      status: "todo",
    })
    .select("id")
    .single();

  if (carryError) {
    return NextResponse.json({ error: carryError.message }, { status: 500 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("room_tasks")
    .update({
      status: "carried_over",
      carried_to_task_id: carried.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", roomTaskId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
