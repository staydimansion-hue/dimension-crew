import Anthropic from "@anthropic-ai/sdk";
import type { ChecklistItem, SlackMessage } from "@/lib/slack";

// claude-api 스킬 기준 기본 모델 (사용자가 다른 모델을 지정하지 않는 한 이 값을 사용)
const MODEL_ID = "claude-opus-5";

const STATUS_KO: Record<ChecklistItem["status"], string> = {
  done: "완료",
  in_progress: "진행중",
  not_started: "미진행",
};

function buildPrompt(
  items: ChecklistItem[],
  messages: SlackMessage[]
): string {
  const checklistText = items
    .map(
      (i) =>
        `- ${i.title} [현재 상태: ${STATUS_KO[i.status]}]${
          i.due_date ? ` (마감 ${i.due_date})` : ""
        }`
    )
    .join("\n");

  // 시간순(오래된 것 -> 최신)으로 정렬해 대화 흐름을 유지
  const chatText = [...messages]
    .reverse()
    .map((m) => `- ${m.text}`)
    .join("\n");

  return `당신은 "스테이디멘션" 숙박시설 운영팀의 일정 관리 보조원입니다.

아래는 (1) 현재 등록된 업무 체크리스트와 (2) 운영방 채널의 최근 대화 내용입니다.

## 현재 체크리스트
${checklistText || "(등록된 항목 없음)"}

## 운영방 최근 대화
${chatText || "(대화 없음)"}

위 정보를 바탕으로, 팀에게 보낼 한국어 메시지를 작성해 주세요. 다음을 포함합니다:
1) 진행 현황 요약: 완료된 일, 진행중인 일, 지연/막힌 일을 구분해 간결하게 정리
2) 대화 내용에서 파악된 변화(예: 새로 끝난 일, 새로 생긴 일, 일정 변경)를 반영한 "제안" 일정 재정리
   - 실제 상태를 자동으로 바꾸지는 않습니다. "이렇게 갱신할까요?" 형태로 제안만 합니다.
3) 마지막 줄에는 반드시 팀에게 확인을 요청하는 질문을 넣습니다:
   "이 일정으로 확정할까요? 바꿀 부분 있으면 알려주세요."

Slack 메시지로 바로 보낼 수 있도록, 마크다운 제목(#) 없이 이모지와 줄바꿈으로 읽기 쉽게 작성하세요.`;
}

export const ASK_BACK_QUESTION =
  "이 일정으로 확정할까요? 바꿀 부분 있으면 알려주세요.";

/**
 * ANTHROPIC_API_KEY 없이도 요약 결과의 "형태"를 보여주기 위한 결정적(deterministic) 스텁.
 * 실제 AI 호출 대신 규칙 기반으로 요약/제안 메시지를 생성합니다. (드라이런 전용)
 */
export function buildStubSummary(
  items: ChecklistItem[],
  messages: SlackMessage[]
): string {
  const byStatus = (s: ChecklistItem["status"]) =>
    items.filter((i) => i.status === s).map((i) => i.title);

  const done = byStatus("done");
  const inProgress = byStatus("in_progress");
  const notStarted = byStatus("not_started");

  const lines: string[] = [];
  lines.push(":clipboard: *진행 현황 요약 (샘플/스텁)*");
  lines.push("");
  lines.push(`:white_check_mark: *완료 (${done.length})*: ${done.join(", ") || "-"}`);
  lines.push(
    `:hourglass_flowing_sand: *진행중 (${inProgress.length})*: ${inProgress.join(", ") || "-"}`
  );
  lines.push(
    `:black_square_button: *미진행 (${notStarted.length})*: ${notStarted.join(", ") || "-"}`
  );
  lines.push("");
  lines.push(":speech_balloon: *운영방 대화에서 파악한 변화*");
  for (const m of [...messages].reverse()) {
    lines.push(`• ${m.text}`);
  }
  lines.push("");
  lines.push(":dart: *제안 일정 (이렇게 갱신할까요?)*");
  lines.push("• '도배 완료' → 진행중에서 완료로 변경 제안");
  lines.push("• '에어컨 금액' → 내일 견적 비교 후 확정 예정");
  lines.push("• '스탠다드룸 포맥스 발주' → 다음 주 월요일까지 발주 (마감 설정 제안)");
  lines.push("");
  lines.push(ASK_BACK_QUESTION);

  return lines.join("\n");
}

/**
 * 체크리스트 + 운영방 대화를 Claude에게 보내 진행 요약 및 제안 일정을 생성합니다.
 * ANTHROPIC_API_KEY 환경변수가 필요합니다.
 */
export async function summarizeAndReplan(
  items: ChecklistItem[],
  messages: SlackMessage[]
): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const client = new Anthropic();

  const response = await client.messages.create({
    model: MODEL_ID,
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    messages: [{ role: "user", content: buildPrompt(items, messages) }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  // 사람이 확정하도록 되묻는 질문이 빠졌으면 마지막에 보강
  if (!text.includes(ASK_BACK_QUESTION)) {
    return `${text}\n\n${ASK_BACK_QUESTION}`;
  }
  return text;
}
