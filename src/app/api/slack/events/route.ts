import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";
import { fetchChecklistItems, postSlackMessage, verifySlackSignature } from "@/lib/slack";
import { interpretPlanReply } from "@/lib/anthropic";

interface SlackEventPayload {
  type: string;
  challenge?: string;
  event?: {
    type?: string;
    subtype?: string;
    bot_id?: string;
    channel?: string;
    text?: string;
    user?: string;
  };
}

// 사람이 남긴 멘션 텍스트에서 "<@U12345> " 같은 멘션 부분을 제거합니다.
function stripMentions(text: string): string {
  return text.replace(/<@[^>]+>\s*/g, "").trim();
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  console.log(`슬랙 이벤트 수신: bodyLength=${rawBody.length}`);

  if (!signingSecret) {
    console.error("슬랙 이벤트 거부: SLACK_SIGNING_SECRET 환경변수가 설정되지 않았습니다.");
    return NextResponse.json(
      { error: "SLACK_SIGNING_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!verifySlackSignature({ signingSecret, timestamp, signature, rawBody })) {
    console.error(
      `슬랙 이벤트 거부: 서명 검증 실패 (timestamp 존재=${Boolean(timestamp)}, signature 존재=${Boolean(signature)})`
    );
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as SlackEventPayload;
  console.log(`슬랙 이벤트 payload.type=${payload.type}`);

  // 슬랙 앱 설정 시 Request URL을 검증하기 위해 한 번 보내는 challenge 요청
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return NextResponse.json({ ok: true });
  }

  // 슬랙은 응답이 늦으면(3초+) 같은 이벤트를 재전송합니다. 재전송분은 무시합니다.
  if (request.headers.get("x-slack-retry-num")) {
    console.log("슬랙 이벤트 무시: 재시도(retry) 요청");
    return NextResponse.json({ ok: true });
  }

  const event = payload.event;
  const operationsChannel = process.env.SLACK_OPERATIONS_CHANNEL_ID;

  console.log(
    `슬랙 이벤트 상세: type=${event.type} channel=${event.channel} operationsChannel=${operationsChannel} subtype=${event.subtype} bot_id=${event.bot_id} hasText=${Boolean(event.text)}`
  );

  if (
    (event.type !== "message" && event.type !== "app_mention") ||
    event.subtype ||
    event.bot_id ||
    !event.text ||
    !operationsChannel ||
    event.channel !== operationsChannel
  ) {
    console.log("슬랙 이벤트 무시: 필터 조건에 해당");
    return NextResponse.json({ ok: true });
  }

  try {
    const today = kstDateString();
    const { data: plan, error: planError } = await supabaseAdmin
      .from("checklist_daily_plan")
      .select("id, message_text, status, revision")
      .eq("plan_date", today)
      .maybeSingle();

    if (planError) {
      console.error("checklist_daily_plan 조회 실패:", planError);
      return NextResponse.json({ ok: true });
    }
    if (!plan) {
      console.log("슬랙 이벤트 무시: 오늘 날짜의 checklist_daily_plan이 없음");
      // 오늘 아직 브리핑을 보내지 않았으면 반응하지 않습니다(다음 브리핑 때 대화로 반영됨).
      return NextResponse.json({ ok: true });
    }
    console.log(`오늘 계획 상태: status=${plan.status} revision=${plan.revision}`);

    // 확정 전(pending)에는 일반 메시지에 반응하고, 확정 후(confirmed)에는 봇을
    // 명시적으로 멘션했을 때만 다시 엽니다 — 그래야 확정 후의 모든 잡담에 반응해서
    // 시끄러워지는 걸 막을 수 있습니다.
    if (plan.status === "pending" && event.type !== "message") {
      console.log("슬랙 이벤트 무시: pending 상태에서는 멘션에 반응하지 않음");
      return NextResponse.json({ ok: true });
    }
    if (plan.status === "confirmed" && event.type !== "app_mention") {
      console.log("슬랙 이벤트 무시: confirmed 상태에서는 일반 메시지에 반응하지 않음");
      return NextResponse.json({ ok: true });
    }

    const replyText = event.type === "app_mention" ? stripMentions(event.text) : event.text;
    if (!replyText) {
      return NextResponse.json({ ok: true });
    }

    const items = await fetchChecklistItems();
    const result = await interpretPlanReply(plan.message_text, items, replyText);
    console.log(`답장 해석 결과: confirmed=${result.confirmed}`);

    await postSlackMessage({ channel: operationsChannel, text: result.message });
    console.log("슬랙 응답 메시지 전송 완료");

    if (result.confirmed) {
      await supabaseAdmin
        .from("checklist_daily_plan")
        .update({ status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", plan.id);
    } else {
      await supabaseAdmin
        .from("checklist_daily_plan")
        .update({
          message_text: result.message,
          status: "pending",
          revision: plan.revision + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", plan.id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("슬랙 이벤트 처리 실패:", err);
    // 슬랙이 재시도하지 않도록 오류가 나도 200을 반환합니다.
    return NextResponse.json({ ok: true });
  }
}
