import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString } from "@/lib/kst";
import { getPhotoSignedUrl } from "@/lib/photoStorage";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const today = kstDateString();

  const { data: myTasksRaw, error: myTasksError } = await supabaseAdmin
    .from("room_tasks")
    .select(
      "id, status, completed_at, source, notes, rooms(number, type_name), task_photos(id, storage_path, category)"
    )
    .eq("work_date", today)
    .eq("staff_id", session.staffId)
    .order("created_at", { ascending: true });

  if (myTasksError) {
    return NextResponse.json({ error: myTasksError.message }, { status: 500 });
  }

  const myTasks = await Promise.all(
    (myTasksRaw ?? []).map(async (t) => {
      const rawPhotos = Array.isArray(t.task_photos) ? t.task_photos : [];
      const photos = await Promise.all(
        rawPhotos.map(async (p) => ({
          id: p.id,
          url: await getPhotoSignedUrl(p.storage_path),
          category: p.category as "room" | "bathroom",
        }))
      );
      return {
        id: t.id,
        status: t.status,
        completed_at: t.completed_at,
        source: t.source,
        notes: t.notes,
        rooms: t.rooms,
        photos,
      };
    })
  );

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
