import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("rooms")
    .select("id, number, type_name, is_active")
    .order("number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rooms: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const number = typeof body?.number === "string" ? body.number.trim() : "";
  const typeName = typeof body?.typeName === "string" ? body.typeName.trim() : "";

  if (!number || !typeName) {
    return NextResponse.json({ error: "객실 번호와 타입을 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("rooms")
    .insert({ number, type_name: typeName })
    .select("id, number, type_name, is_active")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ room: data });
}
