import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { postSlackMessage, verifySlackSignature } from "@/lib/slack";
import { cycleLabel } from "@/lib/payCycle";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get("x-slack-request-timestamp") || "";
  const signature = request.headers.get("x-slack-signature") || "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET;

  if (!signingSecret) {
    return NextResponse.json(
      { error: "SLACK_SIGNING_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    );
  }
  if (!verifySlackSignature({ signingSecret, timestamp, signature, rawBody })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") || "{}");

  if (payload.type !== "block_actions") {
    return NextResponse.json({ ok: true });
  }

  const action = payload.actions?.[0];
  if (action?.action_id === "announce_payroll_done") {
    const cycleKey = action.value as string;
    const payrollChannel = process.env.SLACK_PAYROLL_CHANNEL_ID;

    if (!payrollChannel) {
      return NextResponse.json(
        { error: "SLACK_PAYROLL_CHANNEL_ID 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    await postSlackMessage({
      channel: payrollChannel,
      text: "인건비 입력이 완료되었습니다.",
    });

    await supabaseAdmin
      .from("sheet_exports")
      .update({ announced_at: new Date().toISOString() })
      .eq("cycle_key", cycleKey);

    const replyChannel = payload.channel?.id ?? payload.user?.id;
    if (replyChannel) {
      await postSlackMessage({
        channel: replyChannel,
        text: `✅ ${cycleLabel(cycleKey)} 공지를 보냈습니다.`,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
