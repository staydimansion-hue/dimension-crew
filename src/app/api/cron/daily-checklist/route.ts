import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";
import {
  fetchChecklistItems,
  fetchChannelHistory,
  postSlackMessage,
} from "@/lib/slack";
import { buildDailyPlan, buildStubDailyPlan } from "@/lib/anthropic";
import { SAMPLE_CHECKLIST, SAMPLE_MESSAGES } from "@/lib/sampleScenario";

// 매일 아침 실행되는 크론 엔드포인트는 항상 최신 데이터를 보내야 하므로 캐시하지 않습니다.
export const dynamic = "force-dynamic";

// 다른 cron 엔드포인트(payroll-reminder)와 동일하게 ?token=<CRON_SECRET> 쿼리로 인증합니다.
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const { searchParams } = new URL(request.url);
  return searchParams.get("token") === secret;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";

  // 드라이런: Slack/Supabase 없이 샘플 데이터로 실제 전송될 메시지를 렌더링만 해서 반환.
  // 실제 발송/저장이 없으므로 인증/시크릿이 필요 없습니다.
  if (dryRun) {
    const useAi = Boolean(process.env.ANTHROPIC_API_KEY);
    const message = useAi
      ? await buildDailyPlan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES)
      : buildStubDailyPlan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      mode: useAi ? "sample-data + Claude (no Slack send)" : "sample-data + stub (no Slack send)",
      channel_target: process.env.SLACK_OPERATIONS_CHANNEL_ID ?? "(SLACK_OPERATIONS_CHANNEL_ID 미설정)",
      message,
    });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "인증에 실패했습니다." }, { status: 401 });
  }

  const channel = process.env.SLACK_OPERATIONS_CHANNEL_ID;
  if (!channel) {
    return NextResponse.json(
      { error: "SLACK_OPERATIONS_CHANNEL_ID 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  try {
    const [items, history] = await Promise.all([
      fetchChecklistItems(),
      fetchChannelHistory(50),
    ]);

    const useAi = Boolean(process.env.ANTHROPIC_API_KEY);
    const message = useAi
      ? await buildDailyPlan(items, history)
      : buildStubDailyPlan(items, history);

    const slackResponse = (await postSlackMessage({ channel, text: message })) as {
      ts?: string;
    };

    const planDate = kstDateString();
    const { error } = await supabaseAdmin.from("checklist_daily_plan").upsert(
      {
        plan_date: planDate,
        message_text: message,
        status: "pending",
        revision: 0,
        slack_message_ts: slackResponse.ts ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "plan_date" }
    );

    if (error) {
      console.error("checklist_daily_plan 저장 실패:", error);
    }

    return NextResponse.json({ ok: true, plan_date: planDate, checklist_count: items.length });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
