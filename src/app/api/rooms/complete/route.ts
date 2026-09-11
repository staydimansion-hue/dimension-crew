import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { uploadTaskPhoto } from "@/lib/photoStorage";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  const roomTaskId = form?.get("roomTaskId");
  const photo = form?.get("photo");

  if (typeof roomTaskId !== "string" || !roomTaskId) {
    return NextResponse.json({ error: "객실 정보가 없습니다." }, { status: 400 });
  }

  const { data: task, error: taskError } = await supabaseAdmin
    .from("room_tasks")
    .select("id, staff_id")
    .eq("id", roomTaskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json({ error: taskError.message }, { status: 500 });
  }
  if (!task || task.staff_id !== session.staffId) {
    return NextResponse.json({ error: "본인에게 배정된 객실이 아닙니다." }, { status: 403 });
  }

  if (photo instanceof File && photo.size > 0) {
    const buffer = Buffer.from(await photo.arrayBuffer());
    try {
      const path = await uploadTaskPhoto(roomTaskId, buffer, photo.type || "image/jpeg");
      const { error: photoError } = await supabaseAdmin
        .from("task_photos")
        .insert({ room_task_id: roomTaskId, storage_path: path });
      if (photoError) console.error("사진 기록 실패:", photoError);
    } catch (err) {
      console.error("사진 업로드 실패:", err);
    }
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("room_tasks")
    .update({ status: "done", completed_at: now, updated_at: now })
    .eq("id", roomTaskId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
