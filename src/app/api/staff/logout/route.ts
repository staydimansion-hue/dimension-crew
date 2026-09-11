import { NextResponse } from "next/server";
import { clearStaffSessionCookie } from "@/lib/staffSession";

export async function POST() {
  await clearStaffSessionCookie();
  return NextResponse.json({ ok: true });
}
