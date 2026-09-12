import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";
import { previousBusinessDay } from "@/lib/holidays";
import { cycleRange, cycleLabel } from "@/lib/payCycle";
import { postSlackMessage } from "@/lib/slack";

type ShiftJoin = {
  staff_id: string;
  hours_worked: number | null;
  amount: number | null;
  staff: { name: string } | { name: string }[] | null;
};

function staffName(s: ShiftJoin["staff"]): string {
  if (!s) return "알 수 없음";
  return Array.isArray(s) ? s[0]?.name ?? "알 수 없음" : s.name;
}

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("payroll-reminder cron 실패:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handle(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const managerId = process.env.SLACK_MANAGER_USER_ID;
  if (!managerId) {
    return NextResponse.json({ error: "SLACK_MANAGER_USER_ID 환경변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const today = kstDateString();
  const [y, m] = today.split("-").map(Number);
  const nominalFourth = `${y}-${String(m).padStart(2, "0")}-04`;
  const reminderDate = await previousBusinessDay(nominalFourth);

  if (today !== reminderDate) {
    return NextResponse.json({ skipped: true, today, reminderDate });
  }

  const cycleKey = `${y}-${String(m).padStart(2, "0")}`;

  const { data: existing } = await supabaseAdmin
    .from("sheet_exports")
    .select("id, reminder_sent_at")
    .eq("cycle_key", cycleKey)
    .maybeSingle();

  if (existing?.reminder_sent_at) {
    return NextResponse.json({ skipped: true, reason: "already sent", cycleKey });
  }

  const { from, to } = cycleRange(cycleKey);

  const { data: shifts, error } = await supabaseAdmin
    .from("shifts")
    .select("staff_id, hours_worked, amount, staff(name)")
    .gte("work_date", from)
    .lte("work_date", to)
    .not("clock_out_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const byStaff = new Map<string, { name: string; hours: number; amount: number }>();
  for (const s of (shifts ?? []) as ShiftJoin[]) {
    const key = s.staff_id;
    const prev = byStaff.get(key) ?? { name: staffName(s.staff), hours: 0, amount: 0 };
    prev.hours += s.hours_worked ?? 0;
    prev.amount += s.amount ?? 0;
    byStaff.set(key, prev);
  }
  const rows = [...byStaff.values()];
  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  const lines = rows
    .map((r) => `• ${r.name}: ${r.hours.toFixed(1)}시간 · ${r.amount.toLocaleString()}원`)
    .join("\n");

  await postSlackMessage({
    channel: managerId,
    text: `${from} ~ ${to} 근무분 인건비 (${cycleLabel(cycleKey)})\n\n${lines || "근무 기록 없음"}\n\n합계: ${total.toLocaleString()}원`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${from} ~ ${to} 근무분 인건비*\n(${cycleLabel(cycleKey)})`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: lines || "근무 기록 없음" },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `*합계: ${total.toLocaleString()}원*` },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "입력 완료 → 공지하기" },
            style: "primary",
            action_id: "announce_payroll_done",
            value: cycleKey,
          },
        ],
      },
    ],
  });

  await supabaseAdmin
    .from("sheet_exports")
    .upsert({ cycle_key: cycleKey, reminder_sent_at: new Date().toISOString() }, { onConflict: "cycle_key" });

  return NextResponse.json({ ok: true, cycleKey, total });
}
