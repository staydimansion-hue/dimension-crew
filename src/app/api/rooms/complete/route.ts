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

  if (!roomTaskId) {
    return NextResponse.json({ error: "객실 정보가 없습니다." }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, staff_id, status, rooms(number)")
    .eq("id", roomTaskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
  if (!task || task.staff_id !== session.staffId) {
    return NextResponse.json({ error: "본인에게 배정된 객실이 아닙니다." }, { status: 403 });
  }

  // 이미 완료된 방을 사진 관리 목적으로 다시 열었을 때는 완료 처리를 다시 하지 않는다
  // (완료 시각이 바뀌면 청소 소요시간 계산이 어긋난다).
  if (task.status === "done") {
    return NextResponse.json({ ok: true, alreadyDone: true });
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("room_tasks")
    .update({ status: "done", completed_at: now, updated_at: now })
    .eq("id", roomTaskId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const channel = process.env.SLACK_ROOM_CHANNEL_ID;
  if (channel) {
    const room = Array.isArray(task.rooms) ? task.rooms[0] : task.rooms;
    postSlackMessage({
      channel,
      text: `✅ ${room?.number ?? "?"}호 청소가 완료되었습니다. (${session.name})`,
    }).catch((err) => console.error("슬랙 청소완료 알림 실패:", err));
  }

  return NextResponse.json({ ok: true });
}
