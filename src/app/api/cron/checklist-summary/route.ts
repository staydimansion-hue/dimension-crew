import { NextResponse } from "next/server";
import { fetchChecklistItems, fetchChannelHistory, postSlackMessage } from "@/lib/slack";
import { summarizeAndReplan, buildStubSummary } from "@/lib/anthropic";
import { SAMPLE_CHECKLIST, SAMPLE_MESSAGES } from "@/lib/sampleScenario";

// 운영방 대화를 읽어 AI 요약/재계획을 생성하므로 항상 최신 데이터로 실행합니다.
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

  // 드라이런: Slack 발송/읽기 없이 샘플 시나리오로 요약 메시지를 렌더링만 해서 반환.
  // ANTHROPIC_API_KEY 가 있으면 실제 Claude 요약을, 없으면 결정적 스텁 요약을 사용합니다.
  if (dryRun) {
    const useAi = Boolean(process.env.ANTHROPIC_API_KEY);
    const summary = useAi
      ? await summarizeAndReplan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES)
      : buildStubSummary(SAMPLE_CHECKLIST, SAMPLE_MESSAGES);
    return NextResponse.json({
      ok: true,
      dryRun: true,
      mode: useAi ? "sample-data + Claude (no Slack send)" : "sample-data + stub summary (no Slack send)",
      channel_target: process.env.SLACK_OPERATIONS_CHANNEL_ID ?? "(SLACK_OPERATIONS_CHANNEL_ID 미설정)",
      message: summary,
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

    const summary = await summarizeAndReplan(items, history);

    // 사람이 최종 확정하도록 제안 + 질문 형태로 운영방에 게시 (자동 확정하지 않음)
    await postSlackMessage({ channel, text: summary });

    return NextResponse.json({
      ok: true,
      checklist_count: items.length,
      messages_read: history.length,
    });
  } catch (err) {
    const messageText = err instanceof Error ? err.message : "알 수 없는 오류";
    return NextResponse.json({ error: messageText }, { status: 500 });
  }
}
