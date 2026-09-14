import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ShiftRow = {
  staff_id: string;
  work_date: string;
  clock_in_at: string;
  hours_worked: number | null;
};

type TaskRow = {
  id: string;
  work_date: string;
  staff_id: string | null;
  status: string;
  completed_at: string | null;
  room_id: string;
  rooms: { type_name: string } | { type_name: string }[] | null;
  staff: { name: string } | { name: string }[] | null;
};

function one<T>(v: T | T[] | null): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!from || !to) {
    return NextResponse.json({ error: "from/to 파라미터가 필요합니다." }, { status: 400 });
  }

  const [{ data: shifts, error: shiftsError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabaseAdmin
        .from("shifts")
        .select("staff_id, work_date, clock_in_at, hours_worked")
        .gte("work_date", from)
        .lte("work_date", to)
        .not("clock_out_at", "is", null),
      supabaseAdmin
        .from("room_tasks")
        .select(
          "id, work_date, staff_id, status, completed_at, room_id, rooms(type_name), staff(name)"
        )
        .gte("work_date", from)
        .lte("work_date", to)
        .in("status", ["done", "carried_over"]),
    ]);

  if (shiftsError) return NextResponse.json({ error: shiftsError.message }, { status: 500 });
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

  const shiftRows = (shifts ?? []) as ShiftRow[];
  const taskRows = (tasks ?? []) as TaskRow[];
  const doneTaskIds = taskRows.filter((t) => t.status === "done").map((t) => t.id);

  const { data: photos, error: photosError } = await supabaseAdmin
    .from("task_photos")
    .select("room_task_id, category")
    .in("room_task_id", doneTaskIds.length ? doneTaskIds : ["-"]);

  if (photosError) return NextResponse.json({ error: photosError.message }, { status: 500 });

  const categoriesByTask = new Map<string, Set<string>>();
  for (const p of photos ?? []) {
    const set = categoriesByTask.get(p.room_task_id) ?? new Set<string>();
    set.add(p.category);
    categoriesByTask.set(p.room_task_id, set);
  }

  // 방 타입별 평균 청소시간: 직원+날짜별로 완료시각 순서대로, 출근시각을 시작점으로 소요시간 계산
  const clockInByStaffDate = new Map<string, string>();
  for (const s of shiftRows) {
    clockInByStaffDate.set(`${s.staff_id}__${s.work_date}`, s.clock_in_at);
  }

  const doneSorted = taskRows
    .filter((t) => t.status === "done" && t.completed_at)
    .sort((a, b) => {
      const keyA = `${a.staff_id}__${a.work_date}`;
      const keyB = `${b.staff_id}__${b.work_date}`;
      if (keyA !== keyB) return keyA < keyB ? -1 : 1;
      return new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime();
    });

  const durationsByRoomType = new Map<string, number[]>();
  let cursorKey = "";
  let prevTime: Date | null = null;
  for (const t of doneSorted) {
    const key = `${t.staff_id}__${t.work_date}`;
    if (key !== cursorKey) {
      cursorKey = key;
      const startStr = clockInByStaffDate.get(key);
      prevTime = startStr ? new Date(startStr) : null;
    }
    const completed = new Date(t.completed_at!);
    if (prevTime) {
      const mins = Math.round((completed.getTime() - prevTime.getTime()) / 60000);
      if (mins >= 0 && mins < 6 * 60) {
        const roomType = one(t.rooms)?.type_name ?? "기타";
        const arr = durationsByRoomType.get(roomType) ?? [];
        arr.push(mins);
        durationsByRoomType.set(roomType, arr);
      }
    }
    prevTime = completed;
  }

  const avgDurationByRoomType = Array.from(durationsByRoomType.entries())
    .map(([roomType, arr]) => ({
      label: roomType,
      value: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
    }))
    .sort((a, b) => b.value - a.value);

  // 직원별 집계
  type StaffAgg = {
    name: string;
    hours: number;
    doneCount: number;
    carriedCount: number;
    completeTasks: number; // done 중 사진 2종 다 있는 것
  };
  const byStaff = new Map<string, StaffAgg>();

  function ensure(staffId: string, name: string): StaffAgg {
    const agg = byStaff.get(staffId) ?? {
      name,
      hours: 0,
      doneCount: 0,
      carriedCount: 0,
      completeTasks: 0,
    };
    byStaff.set(staffId, agg);
    return agg;
  }

  for (const s of shiftRows) {
    if (!s.staff_id) continue;
    // 이름은 아래 taskRows에서 채워지지만, 근무만 있고 방배정이 없는 경우 대비해 임시로 넣어둠
    const agg = ensure(s.staff_id, byStaff.get(s.staff_id)?.name ?? "");
    agg.hours += s.hours_worked ?? 0;
  }

  for (const t of taskRows) {
    if (!t.staff_id) continue;
    const name = one(t.staff)?.name ?? "알 수 없음";
    const agg = ensure(t.staff_id, name);
    if (!agg.name) agg.name = name;
    if (t.status === "done") {
      agg.doneCount += 1;
      const cats = categoriesByTask.get(t.id);
      if (cats && cats.has("room") && cats.has("bathroom")) {
        agg.completeTasks += 1;
      }
    } else if (t.status === "carried_over") {
      agg.carriedCount += 1;
    }
  }

  const staffList = Array.from(byStaff.values()).filter((s) => s.name);

  const efficiencyByStaff = staffList
    .filter((s) => s.hours > 0)
    .map((s) => ({ label: s.name, value: Math.round((s.doneCount / s.hours) * 10) / 10 }))
    .sort((a, b) => b.value - a.value);

  const completionRateByStaff = staffList
    .filter((s) => s.doneCount + s.carriedCount > 0)
    .map((s) => ({
      label: s.name,
      value: Math.round((s.doneCount / (s.doneCount + s.carriedCount)) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  const photoCompletenessByStaff = staffList
    .filter((s) => s.doneCount > 0)
    .map((s) => ({
      label: s.name,
      value: Math.round((s.completeTasks / s.doneCount) * 100),
    }))
    .sort((a, b) => b.value - a.value);

  const hoursByStaff = staffList
    .filter((s) => s.hours > 0)
    .map((s) => ({ label: s.name, value: Math.round(s.hours * 10) / 10 }))
    .sort((a, b) => b.value - a.value);

  // 요일별 평균 처리 방 개수
  const doneByWeekday = new Map<number, number>();
  const datesByWeekday = new Map<number, Set<string>>();
  for (const t of taskRows) {
    const wd = new Date(`${t.work_date}T00:00:00`).getDay();
    const dateSet = datesByWeekday.get(wd) ?? new Set<string>();
    dateSet.add(t.work_date);
    datesByWeekday.set(wd, dateSet);
    if (t.status === "done") {
      doneByWeekday.set(wd, (doneByWeekday.get(wd) ?? 0) + 1);
    }
  }
  const avgRoomsByWeekday = WEEKDAYS.map((label, wd) => {
    const dateCount = datesByWeekday.get(wd)?.size ?? 0;
    const done = doneByWeekday.get(wd) ?? 0;
    return { label, value: dateCount > 0 ? Math.round((done / dateCount) * 10) / 10 : 0 };
  });

  return NextResponse.json({
    avgDurationByRoomType,
    efficiencyByStaff,
    completionRateByStaff,
    photoCompletenessByStaff,
    hoursByStaff,
    avgRoomsByWeekday,
  });
}
