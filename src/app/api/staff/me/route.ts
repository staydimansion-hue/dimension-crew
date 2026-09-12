import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staffSession";
import { getSettings } from "@/lib/settings";

export async function GET() {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  const settings = await getSettings();
  return NextResponse.json({ name: session.name, qrToken: settings.qr_token });
}
