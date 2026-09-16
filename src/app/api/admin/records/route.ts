import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getPhotoSignedUrl } from "@/lib/photoStorage";

type TaskRow = {
  id: string;
  work_date: string;
  staff_id: string | null;
  status: string;
  source: string;
  completed_at: string | null;
  notes: string | null;
  room_id: string;
  rooms: { number: string; type_name: string } | { number: string; type_name: string }[] | null;
  staff: { name: string } | { name: string }[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const staffId = searchParams.get("staffId");
  const roomNumber = searchParams.get("roomNumber");

  if (!from || !to) {
    return NextResponse.json({ error: "from/to 파라미터가 필요합니다." }, { status: 400 });
  }

  let query = supabaseAdmin
    .from("room_tasks")
    .select(
      "id, work_date, staff_id, status, source, completed_at, notes, room_id, rooms(number, type_name), staff(name)"
    )
    .eq("status", "done")
    .gte("work_date", from)
    .lte("work_date", to)
    .order("staff_id", { ascending: true })
    .order("work_date", { ascending: true })
    .order("completed_at", { ascending: true });

  if (staffId) query = query.eq("staff_id", staffId);

  const { data: tasks, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (tasks ?? []) as TaskRow[];

  // 출근시각(첫 객실 청소시간 기준점) 조회
  const staffDatePairs = Array.from(
    new Set(rows.filter((r) => r.staff_id).map((r) => `${r.staff_id}__${r.work_date}`))
  );
  const shiftStarts = new Map<string, string>();
  if (staffDatePairs.length > 0) {
    const staffIds = Array.from(new Set(rows.map((r) => r.staff_id).filter(Boolean)));
    const { data: shifts } = await supabaseAdmin
      .from("shifts")
      .select("staff_id, work_date, clock_in_at")
      .in("staff_id", staffIds as string[])
      .gte("work_date", from)
      .lte("work_date", to);
    for (const s of shifts ?? []) {
      shiftStarts.set(`${s.staff_id}__${s.work_date}`, s.clock_in_at);
    }
  }

  // 그룹(직원+날짜)별로 순서대로 소요시간 계산
  const durationMinutesByTaskId = new Map<string, number | null>();
  let cursorKey = "";
  let prevTime: Date | null = null;
  for (const r of rows) {
    const key = `${r.staff_id}__${r.work_date}`;
    if (key !== cursorKey) {
      cursorKey = key;
      const startStr = shiftStarts.get(key);
      prevTime = startStr ? new Date(startStr) : null;
    }
    if (r.completed_at) {
      const completed = new Date(r.completed_at);
      if (prevTime) {
        const mins = Math.round((completed.getTime() - prevTime.getTime()) / 60000);
        durationMinutesByTaskId.set(r.id, mins >= 0 ? mins : null);
      } else {
        durationMinutesByTaskId.set(r.id, null);
      }
      prevTime = completed;
    } else {
      durationMinutesByTaskId.set(r.id, null);
    }
  }

  // 사진 (객실/욕실 카테고리별로 각각 보존)
  const { data: photos } = await supabaseAdmin
    .from("task_photos")
    .select("room_task_id, storage_path, category")
    .in("room_task_id", rows.map((r) => r.id).length ? rows.map((r) => r.id) : ["-"]);

  const photosByTask = new Map<string, { storage_path: string; category: string }[]>();
  for (const p of photos ?? []) {
    const arr = photosByTask.get(p.room_task_id) ?? [];
    arr.push(p);
    photosByTask.set(p.room_task_id, arr);
  }

  let result = await Promise.all(
    rows.map(async (r) => {
      const room = one(r.rooms);
      const staff = one(r.staff);
      const taskPhotos = photosByTask.get(r.id) ?? [];
      const photoList = (
        await Promise.all(
          taskPhotos.map(async (p) => ({
            category: p.category,
            url: await getPhotoSignedUrl(p.storage_path),
          }))
        )
      ).filter((p): p is { category: string; url: string } => !!p.url);
      return {
        id: r.id,
        workDate: r.work_date,
        roomNumber: room?.number ?? "-",
        roomType: room?.type_name ?? "-",
        staffName: staff?.name ?? "-",
        source: r.source,
        completedAt: r.completed_at,
        durationMinutes: durationMinutesByTaskId.get(r.id) ?? null,
        notes: r.notes,
        photos: photoList,
      };
    })
  );

  if (roomNumber) {
    result = result.filter((r) => r.roomNumber === roomNumber);
  }

  // 월별(조회기간) 알바별 요약
  const summaryMap = new Map<
    string,
    { staffName: string; roomCount: number; totalMinutes: number }
  >();
  for (const r of result) {
    const s = summaryMap.get(r.staffName) ?? { staffName: r.staffName, roomCount: 0, totalMinutes: 0 };
    s.roomCount += 1;
    s.totalMinutes += r.durationMinutes ?? 0;
    summaryMap.set(r.staffName, s);
  }
  const summary = Array.from(summaryMap.values()).map((s) => ({
    ...s,
    avgMinutes: s.roomCount ? Math.round(s.totalMinutes / s.roomCount) : 0,
  }));

  return NextResponse.json({ rows: result, summary });
}
