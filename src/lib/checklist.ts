import { supabaseAdmin } from "@/lib/supabaseAdmin";

export type ChecklistStatus = "todo" | "in_progress" | "done";

export type ChecklistItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: ChecklistStatus;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

const STATUS_EMOJI: Record<ChecklistStatus, string> = {
  done: "🟥",
  in_progress: "🟨",
  todo: "⬜",
};

export async function fetchChecklistItems(): Promise<ChecklistItem[]> {
  const { data, error } = await supabaseAdmin
    .from("checklist_items")
    .select(
      "id, title, due_date, status, completed_at, sort_order, created_at, updated_at"
    )
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as ChecklistItem[];
}

export function buildChecklistBlocks(items: ChecklistItem[], todayYmd: string) {
  const doneCount = items.filter((i) => i.status === "done").length;
  const progressCount = items.filter((i) => i.status === "in_progress").length;
  const todoCount = items.filter((i) => i.status === "todo").length;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `📋 오늘 마감 체크리스트 (${todayYmd})`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `완료 ${doneCount} · 진행중 ${progressCount} · 미진행 ${todoCount}`,
      },
    },
  ];

  for (const item of items) {
    let text = `${STATUS_EMOJI[item.status]} ${item.title}`;
    if (item.due_date) {
      text += ` (${item.due_date})`;
      if (item.due_date < todayYmd && item.status !== "done") {
        text += " ⚠️ 기한 지남";
      }
    }
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text },
    });
    blocks.push({
      type: "actions",
      elements: statusButtons(item),
    });
  }

  const text =
    `📋 오늘 마감 체크리스트 (${todayYmd})\n` +
    `완료 ${doneCount} · 진행중 ${progressCount} · 미진행 ${todoCount}\n` +
    items
      .map((item) => {
        let line = `${STATUS_EMOJI[item.status]} ${item.title}`;
        if (item.due_date) line += ` (${item.due_date})`;
        return line;
      })
      .join("\n");

  return { blocks, text };
}

function statusButtons(item: ChecklistItem): unknown[] {
  if (item.status === "todo") {
    return [
      button("진행중", "checklist_progress", item.id),
      button("완료", "checklist_done", item.id, "primary"),
    ];
  }
  if (item.status === "in_progress") {
    return [
      button("완료", "checklist_done", item.id, "primary"),
      button("미진행", "checklist_reset", item.id),
    ];
  }
  // done
  return [button("되돌리기", "checklist_reset", item.id)];
}

function button(
  label: string,
  actionId: string,
  value: string,
  style?: "primary" | "danger"
) {
  const el: Record<string, unknown> = {
    type: "button",
    text: { type: "plain_text", text: label },
    action_id: actionId,
    value,
  };
  if (style) el.style = style;
  return el;
}
