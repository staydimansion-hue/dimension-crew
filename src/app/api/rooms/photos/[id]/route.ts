import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { deleteTaskPhoto } from "@/lib/photoStorage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;

  const { data: photo, error: photoError } = await supabaseAdmin
    .from("task_photos")
    .select("id, storage_path, room_tasks(staff_id)")
    .eq("id", id)
    .maybeSingle();

  if (photoError) {
    return NextResponse.json({ error: photoError.message }, { status: 500 });
  }

  const task = Array.isArray(photo?.room_tasks) ? photo.room_tasks[0] : photo?.room_tasks;
  if (!photo || task?.staff_id !== session.staffId) {
    return NextResponse.json({ error: "본인 사진이 아닙니다." }, { status: 403 });
  }

  try {
    await deleteTaskPhoto(photo.storage_path);
  } catch (err) {
    console.error("스토리지 사진 삭제 실패:", err);
  }

  const { error: deleteError } = await supabaseAdmin
    .from("task_photos")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
