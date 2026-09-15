import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { postSlackMessage, verifySlackSignature } from "@/lib/slack";
import { cycleLabel } from "@/lib/payCycle";
import { kstDateString } from "@/lib/kst";
import { fetchChecklistItems, buildChecklistBlocks } from "@/lib/checklist";

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

  const actions = payload.actions ?? [];

  const CHECKLIST_ACTIONS: Record<
    string,
    { status: "todo" | "in_progress" | "done"; completed: boolean }
  > = {
    checklist_progress: { status: "in_progress", completed: false },
    checklist_done: { status: "done", completed: true },
    checklist_reset: { status: "todo", completed: false },
  };

  const checklistAction = actions.find(
    (a: { action_id?: string }) => a?.action_id && a.action_id in CHECKLIST_ACTIONS
  );
  if (checklistAction) {
    const itemId = checklistAction.value as string | undefined;
    if (itemId) {
      const now = new Date().toISOString();
      const { status, completed } = CHECKLIST_ACTIONS[checklistAction.action_id];
      await supabaseAdmin
        .from("checklist_items")
        .update({
          status,
          completed_at: completed ? now : null,
          updated_at: now,
        })
        .eq("id", itemId);

      const items = await fetchChecklistItems();
      const { blocks, text } = buildChecklistBlocks(items, kstDateString());

      const responseUrl = payload.response_url as string | undefined;
      if (responseUrl) {
        await fetch(responseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replace_original: true, blocks, text }),
        });
      }
    }
    return NextResponse.json({ ok: true });
  }

  const action = actions[0];
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
