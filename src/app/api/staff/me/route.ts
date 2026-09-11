import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staffSession";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return NextResponse.json({ name: session.name });
}
