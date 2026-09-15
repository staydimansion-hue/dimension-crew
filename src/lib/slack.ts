import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { kstDateString } from "@/lib/kst";

const SLACK_CONVERSATIONS_HISTORY_URL =
  "https://slack.com/api/conversations.history";

export async function postSlackMessage(params: {
  channel: string;
  text: string;
  blocks?: unknown[];
}) {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("SLACK_BOT_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  const res = await fetch("https://slack.com/api/chat.postMessage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(`슬랙 메시지 전송 실패: ${data.error}`);
  }
  return data;
}

export function verifySlackSignature(params: {
  signingSecret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
}): boolean {
  const { signingSecret, timestamp, signature, rawBody } = params;
  if (!timestamp || !signature) return false;

  const fiveMinutes = 60 * 5;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > fiveMinutes) return false;

  const base = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hmac}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// --- 운영방 일일 체크리스트 봇 (manage_emp에서 이식) ---

export type ChecklistStatus = "not_started" | "in_progress" | "done";

export interface ChecklistItem {
  id: string;
  title: string;
  status: ChecklistStatus;
  due_date: string | null;
  sort_order: number;
}

// 상태별 색상 이모지 (요청 사양 그대로)
// 완료(done) = 빨강, 진행중(in_progress) = 노랑, 미진행(not_started) = 빈칸
const STATUS_EMOJI: Record<ChecklistStatus, string> = {
  done: ":large_red_square:",
  in_progress: ":large_yellow_square:",
  not_started: ":white_large_square:",
};

const STATUS_LABEL: Record<ChecklistStatus, string> = {
  done: "완료",
  in_progress: "진행중",
  not_started: "미진행",
};

export interface SlackMessage {
  user: string | null;
  text: string;
  ts: string;
}

/**
 * 지정한 슬랙 채널의 최근 메시지를 가져옵니다. (conversations.history)
 * 봇 토큰에 읽기 스코프(channels:history / groups:history)가 필요합니다.
 */
export async function fetchChannelHistory(
  slackChannelId: string,
  limit = 50
): Promise<SlackMessage[]> {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    throw new Error("SLACK_BOT_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  const url = new URL(SLACK_CONVERSATIONS_HISTORY_URL);
  url.searchParams.set("channel", slackChannelId);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    messages?: Array<{ user?: string; text?: string; ts?: string; subtype?: string }>;
  };
  if (!data.ok) {
    throw new Error(`Slack API 오류: ${data.error ?? "unknown_error"}`);
  }

  return (data.messages ?? [])
    // 채널 입장/봇 등 시스템 메시지(subtype 있음)는 제외
    .filter((m) => !m.subtype && typeof m.text === "string")
    .map((m) => ({
      user: m.user ?? null,
      text: m.text ?? "",
      ts: m.ts ?? "",
    }));
}

/** 지정한 채널의 활성화된 체크리스트 항목을 정렬 순서대로 가져옵니다. */
export async function fetchChecklistItems(channelId: string): Promise<ChecklistItem[]> {
  const { data, error } = await supabaseAdmin
    .from("checklist_items")
    .select("id, title, status, due_date, sort_order")
    .eq("channel_id", channelId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`체크리스트 조회 실패: ${error.message}`);
  }

  return (data ?? []) as ChecklistItem[];
}

export interface ChecklistChannel {
  id: string;
  key: string;
  label: string;
  slackChannelId: string;
}

async function loadChecklistChannel(
  filterColumn: "key" | "slack_channel_id",
  value: string
): Promise<ChecklistChannel | null> {
  const { data, error } = await supabaseAdmin
    .from("checklist_channels")
    .select("id, key, label, slack_channel_id")
    .eq(filterColumn, value)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`체크리스트 채널 설정 조회 실패: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    key: data.key,
    label: data.label,
    slackChannelId: data.slack_channel_id,
  };
}

/** 크론 URL의 ?channel=<key> 값으로 채널 설정을 찾습니다. */
export function getChecklistChannelByKey(key: string): Promise<ChecklistChannel | null> {
  return loadChecklistChannel("key", key);
}

/** 슬랙 이벤트로 들어온 채널 ID로 채널 설정을 찾습니다. */
export function getChecklistChannelBySlackId(
  slackChannelId: string
): Promise<ChecklistChannel | null> {
  return loadChecklistChannel("slack_channel_id", slackChannelId);
}

/**
 * 색상으로 구분된 일일 체크리스트 메시지를 만듭니다.
 * - 요약 줄: "완료 N · 진행중 N · 미진행 N"
 * - 마감일이 지난(오늘 이전) 미완료 항목에는 :warning: 표시
 */
export function buildChecklistMessage(
  items: ChecklistItem[],
  today: string = kstDateString()
): string {
  const counts: Record<ChecklistStatus, number> = {
    done: 0,
    in_progress: 0,
    not_started: 0,
  };
  for (const item of items) counts[item.status] += 1;

  const header = `:clipboard: *[내일 체크리스트]*`;
  const summary = `${STATUS_LABEL.done} ${counts.done} · ${STATUS_LABEL.in_progress} ${counts.in_progress} · ${STATUS_LABEL.not_started} ${counts.not_started}`;

  const lines = items.map((item) => {
    const isOverdue =
      item.status !== "done" && item.due_date !== null && item.due_date < today;
    const overdueMark = isOverdue ? " :warning:" : "";
    const dueSuffix = item.due_date ? ` (마감 ${item.due_date})` : "";
    return `${STATUS_EMOJI[item.status]} ${item.title}${dueSuffix}${overdueMark}`;
  });

  return [header, summary, "", ...lines].join("\n");
}
