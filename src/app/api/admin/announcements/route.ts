import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("announcements")
    .select("id, message, created_at, staff_id, staff(name)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const announcements = (data ?? []).map((a) => {
    const staff = Array.isArray(a.staff) ? a.staff[0] : a.staff;
    return {
      id: a.id,
      message: a.message,
      created_at: a.created_at,
      staffName: staff?.name ?? null,
    };
  });

  return NextResponse.json({ announcements });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const staffId = typeof body?.staffId === "string" && body.staffId ? body.staffId : null;

  if (!message) {
    return NextResponse.json({ error: "공지 내용을 입력해주세요." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("announcements").insert({ message, staff_id: staffId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
