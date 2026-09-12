import { NextResponse } from "next/server";
import { formatAttendanceSheet } from "@/lib/sheets";

export async function POST() {
  try {
    await formatAttendanceSheet();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "서식 적용에 실패했습니다." },
      { status: 500 }
    );
  }
}
