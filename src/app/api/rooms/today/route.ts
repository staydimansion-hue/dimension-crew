import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString } from "@/lib/kst";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const today = kstDateString();

  const { data: myTasks, error: myTasksError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, status, completed_at, source, rooms(number, type_name)")
    .eq("work_date", today)
    .eq("staff_id", session.staffId)
    .order("created_at", { ascending: true });

  if (myTasksError) {
    return NextResponse.json({ error: myTasksError.message }, { status: 500 });
  }

  // 오늘 아직 태스크가 없거나(신규) 미배정 상태인 활성 객실 = 추가로 가져갈 수 있는 객실
  const { data: allRooms, error: roomsError } = await supabaseAdmin
    .from("rooms")
    .select("id, number, type_name")
    .eq("is_active", true)
    .order("number", { ascending: true });

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  const { data: todayTasks, error: todayTasksError } = await supabaseAdmin
    .from("room_tasks")
    .select("room_id, staff_id, status")
    .eq("work_date", today);

  if (todayTasksError) {
    return NextResponse.json({ error: todayTasksError.message }, { status: 500 });
  }

  const takenRoomIds = new Set(
    (todayTasks ?? [])
      .filter((t) => t.staff_id || t.status !== "todo")
      .map((t) => t.room_id)
  );
  const availableRooms = (allRooms ?? []).filter((r) => !takenRoomIds.has(r.id));

  return NextResponse.json({ myTasks, availableRooms });
}
