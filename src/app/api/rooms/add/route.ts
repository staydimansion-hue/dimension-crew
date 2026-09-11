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

  // 이미 오늘 그 객실에 미배정 태스크가 있으면 그걸 가져가고, 없으면 새로 만든다.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("room_tasks")
    .select("id")
    .eq("work_date", today)
    .eq("room_id", roomId)
    .is("staff_id", null)
    .eq("status", "todo")
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
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
