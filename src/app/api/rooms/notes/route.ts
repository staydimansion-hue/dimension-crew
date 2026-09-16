import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { postSlackMessage } from "@/lib/slack";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const roomTaskId = typeof body?.roomTaskId === "string" ? body.roomTaskId : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim() : "";

  if (!roomTaskId) {
    return NextResponse.json({ error: "객실 정보가 없습니다." }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, staff_id, notes, rooms(number)")
    .eq("id", roomTaskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
  if (!task || task.staff_id !== session.staffId) {
    return NextResponse.json({ error: "본인에게 배정된 객실이 아닙니다." }, { status: 403 });
  }

  const { error: updateError } = await supabaseAdmin
    .from("room_tasks")
    .update({ notes: notes || null, updated_at: new Date().toISOString() })
    .eq("id", roomTaskId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // 새로 작성되거나 내용이 바뀐 특이사항만 슬랙으로 공유 (빈 값으로 지운 경우는 알리지 않음)
  const channel = process.env.SLACK_ROOM_CHANNEL_ID;
  if (channel && notes && notes !== task.notes) {
    const room = Array.isArray(task.rooms) ? task.rooms[0] : task.rooms;
    postSlackMessage({
      channel,
      text: `📝 ${room?.number ?? "?"}호 특이사항 (${session.name})\n${notes}`,
    }).catch((err) => console.error("슬랙 특이사항 알림 실패:", err));
  }

  return NextResponse.json({ ok: true });
}
