import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const [globalRes, personalRes] = await Promise.all([
    supabaseAdmin
      .from("announcements")
      .select("id, message, created_at")
      .is("staff_id", null)
      .order("created_at", { ascending: false })
      .limit(3),
    supabaseAdmin
      .from("announcements")
      .select("id, message, created_at")
      .eq("staff_id", session.staffId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  if (globalRes.error) {
    return NextResponse.json({ error: globalRes.error.message }, { status: 500 });
  }
  if (personalRes.error) {
    return NextResponse.json({ error: personalRes.error.message }, { status: 500 });
  }

  const announcements = [
    ...personalRes.data.map((a) => ({ ...a, isPersonal: true })),
    ...globalRes.data.map((a) => ({ ...a, isPersonal: false })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return NextResponse.json({ announcements });
}
