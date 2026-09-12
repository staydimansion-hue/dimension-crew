import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getStaffSession } from "@/lib/staffSession";
import { kstDateString, kstDateTimeString } from "@/lib/kst";
import { appendCheckInRow, updateCheckOutRow } from "@/lib/sheets";
import { getSettings } from "@/lib/settings";
import { distanceMeters } from "@/lib/geo";

export async function POST(request: Request) {
  const session = await getStaffSession();
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const lat = typeof body?.lat === "number" ? body.lat : null;
  const lng = typeof body?.lng === "number" ? body.lng : null;

  const settings = await getSettings();
  let distance: number | null = null;
  let outOfRange: boolean | null = null;
  if (settings.geo_center_lat != null && settings.geo_center_lng != null) {
    if (lat != null && lng != null) {
      distance = Math.round(
        distanceMeters(lat, lng, settings.geo_center_lat, settings.geo_center_lng) * 10
      ) / 10;
      outOfRange = distance > settings.geo_radius_m;
    } else {
      // 위치 정보를 아예 받지 못한 경우(권한 거부·GPS 실패 등) — 범위 밖과 동일하게 관리자 확인이 필요하다.
      // 이걸 "정상"으로 두면 QR 링크만 있으면 어디서든 위치 확인 없이 체크인될 수 있다.
      outOfRange = true;
    }
  }

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
      clock_in_lat: lat,
      clock_in_lng: lng,
      clock_in_distance_m: distance,
      clock_in_out_of_range: outOfRange,
      sheet_row: sheetRow,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      type: "check_in",
      name: session.name,
      time: kstDateTimeString(now),
      outOfRange,
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
      clock_out_lat: lat,
      clock_out_lng: lng,
      clock_out_distance_m: distance,
      clock_out_out_of_range: outOfRange,
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

  return NextResponse.json({
    type: "check_out",
    name: session.name,
    time: kstDateTimeString(now),
    hoursWorked,
    amount,
    outOfRange,
  });
}
