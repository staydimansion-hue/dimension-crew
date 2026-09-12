import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString } from "@/lib/kst";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const roomId = typeof body?.roomId === "string" ? body.roomId : "";
  if (!roomId) {
    return NextResponse.json({ error: "객실을 선택해주세요." }, { status: 400 });
  }

  const today = kstDateString();

  // 오늘 그 객실에 이미 배정/진행 중인 태스크가 있는지 먼저 확인한다(다른 사람이 이미
  // 배정받았거나 청소 중인 방을 중복으로 추가하는 것을 막기 위함 — 중복 레코드가 생기면
  // 어드민 배정 화면에서 오류가 나는 원인이 됨).
  const { data: existingRows, error: existingError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, staff_id, status")
    .eq("work_date", today)
    .eq("room_id", roomId)
    .neq("status", "carried_over")
    .order("created_at", { ascending: true });

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const existing = (existingRows ?? [])[0] ?? null;

  if (existing && existing.staff_id && existing.staff_id !== session.staffId) {
    return NextResponse.json(
      { error: "이미 다른 알바에게 배정된 방입니다." },
      { status: 409 }
    );
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from("room_tasks")
      .update({ staff_id: session.staffId, source: "self_added", updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, taskId: existing.id });
  }

  const { data: created, error: createError } = await supabaseAdmin
    .from("room_tasks")
    .insert({
      work_date: today,
      room_id: roomId,
      staff_id: session.staffId,
      source: "self_added",
      status: "todo",
    })
    .select("id")
    .single();

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, taskId: created.id });
}
