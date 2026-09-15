import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";
import { getSettings } from "@/lib/settings";
import { fetchChecklistItems, buildChecklistBlocks } from "@/lib/checklist";
import { postSlackMessage } from "@/lib/slack";

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("daily-checklist cron 실패:", err);
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
    return NextResponse.json(
      { error: "SLACK_MANAGER_USER_ID 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const settings = await getSettings();
  if (!settings.daily_checklist_enabled) {
    return NextResponse.json({ skipped: "disabled" });
  }

  const today = kstDateString();
  if (settings.daily_checklist_last_sent_date === today) {
    return NextResponse.json({ skipped: "already_sent", today });
  }

  const items = await fetchChecklistItems();
  const { blocks, text } = buildChecklistBlocks(items, today);

  await postSlackMessage({ channel: managerId, text, blocks });

  await supabaseAdmin
    .from("settings")
    .update({ daily_checklist_last_sent_date: today })
    .eq("id", 1);

  const todo = items.filter((i) => i.status === "todo").length;
  const inProgress = items.filter((i) => i.status === "in_progress").length;
  const done = items.filter((i) => i.status === "done").length;

  return NextResponse.json({ sent: true, today, todo, in_progress: inProgress, done });
}
