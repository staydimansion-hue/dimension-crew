import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);

  const updates: Record<string, unknown> = {};
  if (typeof body?.title === "string" && body.title.trim()) {
    updates.title = body.title.trim();
  }
  if ("due_date" in (body ?? {})) {
    updates.due_date =
      typeof body?.due_date === "string" && body.due_date.trim()
        ? body.due_date.trim()
        : null;
  }
  if (
    body?.status === "todo" ||
    body?.status === "in_progress" ||
    body?.status === "done"
  ) {
    updates.status = body.status;
    updates.completed_at = body.status === "done" ? new Date().toISOString() : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("checklist_items")
    .update(updates)
    .eq("id", id)
    .select(
      "id, title, due_date, status, completed_at, sort_order, created_at, updated_at"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("checklist_items")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
