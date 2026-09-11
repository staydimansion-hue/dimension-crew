import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyPin } from "@/lib/pin";
import { createAdminSessionCookie } from "@/lib/adminSession";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const loginId = typeof body?.loginId === "string" ? body.loginId.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!loginId || !password) {
    return NextResponse.json(
      { error: "아이디와 비밀번호를 입력해주세요." },
      { status: 400 }
    );
  }

  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select("id, name, password_hash")
    .eq("login_id", loginId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!admin) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  const ok = await verifyPin(password, admin.password_hash);
  if (!ok) {
    return NextResponse.json(
      { error: "아이디 또는 비밀번호가 올바르지 않습니다." },
      { status: 401 }
    );
  }

  await createAdminSessionCookie(admin.id, admin.name);
  return NextResponse.json({ ok: true, name: admin.name });
}
