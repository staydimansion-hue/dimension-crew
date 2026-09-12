import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString, kstDateTimeString, kstTimeString } from "@/lib/kst";
import { appendCheckInRow, updateCheckOutRow } from "@/lib/sheets";
import { postSlackMessage } from "@/lib/slack";

async function notifyCheckIn(name: string, now: Date) {
  const channel = process.env.SLACK_ROOM_CHANNEL_ID;
  if (!channel) return;
  postSlackMessage({
    channel,
    text: `🟢 ${name}님 출근했습니다 (${kstTimeString(now)})`,
  }).catch((err) => console.error("슬랙 출근 알림 실패:", err));
}

async function notifyCheckOut(params: {
  staffId: string;
  name: string;
  now: Date;
  todayStr: string;
  origin: string;
}) {
  const channel = process.env.SLACK_ROOM_CHANNEL_ID;
  if (!channel) return;

  const { data: doneTasks } = await supabaseAdmin
    .from("room_tasks")
    .select("rooms(number)")
    .eq("staff_id", params.staffId)
    .eq("work_date", params.todayStr)
    .eq("status", "done");

  const roomNumbers = (doneTasks ?? [])
    .map((t) => {
      const room = Array.isArray(t.rooms) ? t.rooms[0] : t.rooms;
      return room?.number;
    })
    .filter(Boolean);

  const roomsLine =
    roomNumbers.length > 0
      ? `오늘 완료한 방: ${roomNumbers.map((n) => `${n}호`).join(", ")}`
      : "오늘 완료한 방 없음";

  postSlackMessage({
    channel,
    text: `🔴 ${params.name}님 퇴근했습니다 (${kstTimeString(params.now)})\n${roomsLine}\n관리자 승인: ${params.origin}/admin`,
  }).catch((err) => console.error("슬랙 퇴근 알림 실패:", err));
}

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const now = new Date();
  const todayStr = kstDateString(now);

  const { data: openShift, error: openShiftError } = await supabaseAdmin
    .from("shifts")
    .select("id, clock_in_at, sheet_row")
    .eq("staff_id", session.staffId)
    .is("clock_out_at", null)
    .maybeSingle();

  if (openShiftError) {
    return NextResponse.json({ error: openShiftError.message }, { status: 500 });
  }

  if (!openShift) {
    // 출근
    let sheetRow: number | null = null;
    try {
      sheetRow = await appendCheckInRow({
        dateStr: todayStr,
        name: session.name,
        checkInTimeStr: kstDateTimeString(now),
      });
    } catch (err) {
      console.error("Google Sheets 출근 기록 실패:", err);
    }

    const { error: insertError } = await supabaseAdmin.from("shifts").insert({
      staff_id: session.staffId,
      work_date: todayStr,
      clock_in_at: now.toISOString(),
      sheet_row: sheetRow,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    notifyCheckIn(session.name, now);

    return NextResponse.json({
      type: "check_in",
      name: session.name,
      time: kstDateTimeString(now),
    });
  }

  // 퇴근
  const { data: wageRow, error: wageError } = await supabaseAdmin
    .from("wage_rates")
    .select("hourly_wage")
    .eq("staff_id", session.staffId)
    .lte("effective_from", todayStr)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (wageError) {
    return NextResponse.json({ error: wageError.message }, { status: 500 });
  }
  const hourlyWage = wageRow?.hourly_wage ?? 0;

  const clockInAt = new Date(openShift.clock_in_at);
  const hoursWorked =
    Math.round(((now.getTime() - clockInAt.getTime()) / (1000 * 60 * 60)) * 100) / 100;
  const amount = Math.round(hoursWorked * hourlyWage);

  if (openShift.sheet_row) {
    try {
      await updateCheckOutRow({
        rowNumber: openShift.sheet_row,
        checkOutTimeStr: kstDateTimeString(now),
        hoursWorked,
        hourlyWage,
        amount,
      });
    } catch (err) {
      console.error("Google Sheets 퇴근 기록 실패:", err);
    }
  }

  const { error: updateError } = await supabaseAdmin
    .from("shifts")
    .update({
      clock_out_at: now.toISOString(),
      hours_worked: hoursWorked,
      hourly_wage: hourlyWage,
      amount,
      status: "done",
      updated_at: now.toISOString(),
    })
    .eq("id", openShift.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  notifyCheckOut({ staffId: session.staffId, name: session.name, now, todayStr, origin });

  return NextResponse.json({
    type: "check_out",
    name: session.name,
    time: kstDateTimeString(now),
    hoursWorked,
    amount,
  });
}
