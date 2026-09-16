import Anthropic from "@anthropic-ai/sdk";
import type { ChecklistItem, SlackMessage } from "@/lib/slack";
import { buildChecklistMessage } from "@/lib/slack";
import { kstDateString } from "@/lib/kst";

// claude-api 스킬 기준 기본 모델 (사용자가 다른 모델을 지정하지 않는 한 이 값을 사용)
const MODEL_ID = "claude-opus-5";

export const CONFIRM_QUESTION =
  "이 계획대로 진행할까요? 다른 의견 있으면 이 채널에 답장해주세요.";

// Claude가 슬랙에 실제로 없는 이모지 shortcode(예: :pause_button:)를 지어내
// 텍스트 그대로 노출되는 걸 막기 위해, 확실히 존재하는 것만 예시로 제한한다.
const EMOJI_GUIDE =
  "이모지는 슬랙 기본 내장 이모지 중 확실히 존재하는 것만 쓰세요 (예: :white_check_mark: :warning: :clipboard: :memo: :bell: :calendar: :speech_balloon: :large_red_square: :large_yellow_square: :white_large_square: :dart: :coffee: :sparkles: :hourglass_flowing_sand:). 존재가 불확실한 이모지 shortcode는 절대 만들어 쓰지 마세요 — 렌더링 안 되고 :이름: 그대로 글자로 노출됩니다.";

// 이 봇은 슬랙 대화를 읽고 텍스트로 요약/제안만 할 뿐, 발주·결제·예약·시간 맞춰
// 알림 보내기 같은 실제 행동은 전혀 할 수 없다(연동된 시스템이 없음). "제가
// 처리하겠습니다" 같은 말은 매니저가 봇이 실제로 대신 해줄 것으로 오해하게
// 만들므로 절대 쓰지 않도록 명시한다.
const CAPABILITY_GUIDE =
  '당신(이 메시지를 작성하는 주체)은 실제로 발주·결제·예약을 하거나, 정해진 시각에 알림을 보내거나, 체크리스트 상태를 직접 바꾸는 어떤 실제 행동도 할 수 없습니다 — 슬랙 대화를 읽고 글로 요약·제안하는 것만 합니다. "제가 발주하겠습니다", "알림을 세팅해 드리겠습니다", "처리하겠습니다"처럼 스스로 행동을 수행할 것처럼 말하지 마세요. 대신 "발주가 필요합니다 — 담당자분이 진행해주세요", "이 시각에 알림이 필요하다는 점을 기록해뒀습니다(실제 알림은 별도로 챙겨주세요)"처럼, 무엇이 필요한지 사람에게 안내하는 방식으로만 작성하세요.';

function client(): Anthropic {
  return new Anthropic();
}

// Claude에게 "오늘"/"내일" 등 날짜 표현의 기준을 명시적으로 알려준다. 이걸 안
// 주면 체크리스트 마감일 등을 보고 스스로 날짜를 추측하다가 하루씩 밀리는
// 오류가 난다 (예: 실제로 9/16인데 "내일(9/16)"이라고 잘못 표기).
function dateGuide(): string {
  const now = new Date();
  const today = kstDateString(now);
  const tomorrow = kstDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const weekday = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(now);
  return `오늘 실제 날짜는 ${today}(${weekday})입니다. "내일"은 반드시 ${tomorrow}를 가리켜야 합니다. 체크리스트 항목의 마감일(due_date)과 헷갈리지 말고, 메시지에서 "오늘"/"내일"/요일 같은 날짜 표현을 쓸 때는 이 실제 날짜를 기준으로 정확히 계산하세요.`;
}

function checklistText(items: ChecklistItem[]): string {
  const STATUS_KO: Record<ChecklistItem["status"], string> = {
    done: "완료",
    in_progress: "진행중",
    not_started: "미진행",
  };
  return (
    items
      .map(
        (i) =>
          `- ${i.title} [현재 상태: ${STATUS_KO[i.status]}]${
            i.due_date ? ` (마감 ${i.due_date})` : ""
          }`
      )
      .join("\n") || "(등록된 항목 없음)"
  );
}

function chatText(messages: SlackMessage[]): string {
  // 시간순(오래된 것 -> 최신)으로 정렬해 대화 흐름을 유지
  return (
    [...messages]
      .reverse()
      .map((m) => `- ${m.text}`)
      .join("\n") || "(대화 없음)"
  );
}

/**
 * 오늘 아침 운영방에 보낼 "PM 브리핑" 메시지를 만듭니다. (규칙 기반 스텁)
 * ANTHROPIC_API_KEY 없이도 결과 형태를 보여주기 위한 결정적 스텁입니다.
 */
export function buildStubDailyPlan(
  items: ChecklistItem[],
  messages: SlackMessage[]
): string {
  const lines: string[] = [];
  lines.push(":coffee: *오늘의 운영 브리핑 (샘플/스텁)*");
  lines.push("");
  lines.push(buildChecklistMessage(items));
  lines.push("");
  lines.push(":speech_balloon: *최근 대화에서 파악한 내용*");
  for (const m of [...messages].reverse()) {
    lines.push(`• ${m.text}`);
  }
  lines.push("");
  lines.push(CONFIRM_QUESTION);
  return lines.join("\n");
}

/**
 * 체크리스트 + 최근 운영방 대화를 바탕으로 오늘 아침 PM 브리핑 메시지를 생성합니다.
 * ANTHROPIC_API_KEY 환경변수가 필요합니다. 실제 체크리스트 상태를 자동으로 바꾸지는 않습니다.
 */
export async function buildDailyPlan(
  items: ChecklistItem[],
  messages: SlackMessage[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const prompt = `당신은 "스테이디멘션" 숙박시설 운영팀의 프로젝트 매니저(PM)입니다. 매일 아침 운영방에 오늘 할 일을 안내합니다.

${dateGuide()}

## 현재 체크리스트
${checklistText(items)}

## 최근 운영방 대화
${chatText(messages)}

위 정보를 바탕으로 운영방에 보낼 한국어 아침 브리핑 메시지를 작성하세요. 다음을 포함합니다:
1) 오늘 해야 할 일: 마감이 임박했거나 지난 항목, 진행중인 항목을 우선순위대로 정리
2) 다음 일정: 오늘 당장은 아니지만 곧 다가오는 항목
3) 대화에서 새로 언급된 할 일이나 일정 변경이 있으면 반영해서 "이렇게 추가/반영할까요?" 형태로 제안 (체크리스트 상태를 실제로 바꾸지는 않습니다 — 제안만 합니다)
4) 마지막 줄에는 반드시 다음 질문을 그대로 넣습니다: "${CONFIRM_QUESTION}"

Slack 메시지로 바로 보낼 수 있도록, 마크다운 제목(#) 없이 이모지와 줄바꿈으로 읽기 쉽게 작성하세요. ${EMOJI_GUIDE}

${CAPABILITY_GUIDE}`;

  const response = await client().messages.create({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text.includes(CONFIRM_QUESTION)) {
    return `${text}\n\n${CONFIRM_QUESTION}`;
  }
  return text;
}

export interface PlanReplyResult {
  confirmed: boolean;
  message: string;
}

/**
 * 매니저가 오늘의 계획 메시지에 남긴 답장을 해석합니다. (규칙 기반 스텁)
 * ANTHROPIC_API_KEY 없이도 동작을 보여주기 위한 결정적 스텁 — 아주 단순한 키워드 판단만 합니다.
 */
export function interpretPlanReplyStub(
  planMessage: string,
  replyText: string
): PlanReplyResult {
  const confirmWords = ["맞아", "좋아", "네", "ㅇㅇ", "오케이", "okay", "ok", "진행"];
  const isConfirm = confirmWords.some((w) => replyText.toLowerCase().includes(w.toLowerCase()));

  if (isConfirm) {
    return { confirmed: true, message: "✅ 확정했습니다. 오늘도 화이팅!" };
  }

  return {
    confirmed: false,
    message: `${planMessage}\n\n(위 의견 "${replyText}"을(를) 반영하려면 ANTHROPIC_API_KEY 설정이 필요합니다. 지금은 원래 계획을 다시 보여드립니다.)\n\n${CONFIRM_QUESTION}`,
  };
}

/**
 * 매니저가 오늘의 계획 메시지에 남긴 답장을 Claude로 해석합니다.
 * - 확정(동의)이면 confirmed=true와 짧은 확인 메시지를 반환합니다.
 * - 이견/추가 요청이면 confirmed=false와, 그 의견을 반영해 다시 정리한 계획 메시지를 반환합니다.
 * 실제 체크리스트 상태는 이 함수가 자동으로 바꾸지 않습니다 — 매니저가 다시 확인할 새 메시지만 만듭니다.
 */
export async function interpretPlanReply(
  planMessage: string,
  items: ChecklistItem[],
  replyText: string
): Promise<PlanReplyResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return interpretPlanReplyStub(planMessage, replyText);
  }

  const prompt = `당신은 "스테이디멘션" 숙박시설 운영팀의 프로젝트 매니저(PM)입니다. 오늘 아침 아래 계획을 운영방에 보냈고, 매니저가 답장을 남겼습니다.

${dateGuide()}

## 오늘 보낸 계획
${planMessage}

## 현재 체크리스트
${checklistText(items)}

## 매니저의 답장
"${replyText}"

이 답장이 (a) 계획에 동의/확정하는 내용인지, (b) 이견이 있거나 새로운 할 일/일정 변경을 요청하는 내용인지 판단하세요.

반드시 아래 JSON 형식으로만 답하세요 (다른 텍스트 없이):
{"confirmed": true 또는 false, "message": "..."}

- confirmed가 true면 message는 짧은 한국어 확인 메시지("확정했습니다" 등)로 채우세요.
- confirmed가 false면 message는 매니저의 의견을 반영해서 다시 정리한 전체 계획 메시지로 채우세요. 실제 체크리스트 상태를 자동으로 바꿨다고 말하지 말고, 제안 형태로 작성하고 마지막 줄에 반드시 "${CONFIRM_QUESTION}"를 그대로 포함하세요. ${EMOJI_GUIDE}

${CAPABILITY_GUIDE}`;

  const response = await client().messages.create({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text) as PlanReplyResult;
    if (typeof parsed.confirmed === "boolean" && typeof parsed.message === "string") {
      return parsed;
    }
  } catch {
    // 아래 fallback으로 진행
  }

  // 파싱 실패 시: 안전하게 "미확정"으로 처리하고 원래 계획을 다시 보여줌
  return {
    confirmed: false,
    message: `${planMessage}\n\n(답장을 이해하지 못해 원래 계획을 다시 보여드립니다. 다시 한번 말씀해주세요.)\n\n${CONFIRM_QUESTION}`,
  };
}
