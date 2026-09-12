import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { uploadTaskPhoto, getPhotoSignedUrl } from "@/lib/photoStorage";

const MAX_PHOTOS_PER_TASK = 2;

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
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "사진이 없습니다." }, { status: 400 });
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

  const { count, error: countError } = await supabaseAdmin
    .from("task_photos")
    .select("id", { count: "exact", head: true })
    .eq("room_task_id", roomTaskId);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_PHOTOS_PER_TASK) {
    return NextResponse.json(
      { error: `사진은 최대 ${MAX_PHOTOS_PER_TASK}장까지만 등록할 수 있습니다.` },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const path = await uploadTaskPhoto(roomTaskId, buffer, photo.type || "image/jpeg");

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("task_photos")
    .insert({ room_task_id: roomTaskId, storage_path: path })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const url = await getPhotoSignedUrl(path);

  return NextResponse.json({ photo: { id: inserted.id, url } });
}
