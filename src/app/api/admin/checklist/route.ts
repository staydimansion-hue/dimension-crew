import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("checklist_items")
    .select(
      "id, title, due_date, status, completed_at, sort_order, created_at, updated_at"
    )
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ items: data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const dueDate =
    typeof body?.due_date === "string" && body.due_date.trim()
      ? body.due_date.trim()
      : null;

  if (!title) {
    return NextResponse.json({ error: "제목을 입력해주세요." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("checklist_items")
    .insert({ title, due_date: dueDate, status: "todo" })
    .select(
      "id, title, due_date, status, completed_at, sort_order, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}
