import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) {
    return NextResponse.json({ error: "date 파라미터가 필요합니다." }, { status: 400 });
  }

  const { data: rooms, error: roomsError } = await supabaseAdmin
    .from("rooms")
    .select("id, number, type_name")
    .eq("is_active", true)
    .order("number", { ascending: true });

  if (roomsError) {
    return NextResponse.json({ error: roomsError.message }, { status: 500 });
  }

  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, room_id, staff_id, status, source, staff(name)")
    .eq("work_date", date);

  if (tasksError) {
    return NextResponse.json({ error: tasksError.message }, { status: 500 });
  }

  const taskByRoom = new Map((tasks ?? []).map((t) => [t.room_id, t]));

  const rows = (rooms ?? []).map((r) => ({
    room: r,
    task: taskByRoom.get(r.id) ?? null,
  }));

  return NextResponse.json({ rows });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const date = typeof body?.date === "string" ? body.date : "";
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  const staffId = typeof body?.staffId === "string" && body.staffId ? body.staffId : null;

  if (!date || !roomId) {
    return NextResponse.json({ error: "날짜와 객실 정보가 필요합니다." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, status")
    .eq("work_date", date)
    .eq("room_id", roomId)
    .neq("status", "carried_over")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("room_tasks")
      .update({ staff_id: staffId, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, taskId: existing.id });
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("room_tasks")
    .insert({ work_date: date, room_id: roomId, staff_id: staffId, source: "admin", status: "todo" })
    .select("id")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, taskId: created.id });
}
