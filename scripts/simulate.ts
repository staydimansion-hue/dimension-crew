/**
 * 오프라인 가상 시나리오(드라이런) 스크립트.
 *
 * 실제 Slack / Supabase / (선택적으로) Anthropic 없이도 봇이 운영방에 보낼
 * 두 가지 메시지를 그대로 렌더링해서 출력합니다.
 *   (a) 매일 아침 체크리스트 브리핑
 *   (b) 진행 요약 + 재계획 제안 + 되묻기 질문
 *
 * 실행: npm run simulate
 * ANTHROPIC_API_KEY 가 설정돼 있으면 (b)는 실제 Claude 요약을, 없으면 결정적 스텁을 사용합니다.
 */
import { buildChecklistMessage } from "../src/lib/slack";
import { summarizeAndReplan, buildStubSummary } from "../src/lib/anthropic";
import { SAMPLE_CHECKLIST, SAMPLE_MESSAGES } from "../src/lib/sampleScenario";

function divider(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function main() {
  const channel =
    process.env.SLACK_OPERATIONS_CHANNEL_ID ?? "(SLACK_OPERATIONS_CHANNEL_ID 미설정 — 테스트 채널/DM로 먼저 지정 가능)";

  console.log("가상 시나리오 (드라이런) — 실제 Slack 전송 없음");
  console.log(`대상 채널(설정값): ${channel}`);

  divider("(a) 매일 아침 체크리스트 브리핑 [daily-checklist]");
  console.log(buildChecklistMessage(SAMPLE_CHECKLIST));

  const useAi = Boolean(process.env.ANTHROPIC_API_KEY);
  divider(
    `(b) 진행 요약 + 재계획 제안 [checklist-summary] — ${
      useAi ? "Claude 실제 호출" : "결정적 스텁(키 없음)"
    }`
  );
  const summary = useAi
    ? await summarizeAndReplan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES)
    : buildStubSummary(SAMPLE_CHECKLIST, SAMPLE_MESSAGES);
  console.log(summary);

  console.log("\n(끝) 위 내용은 실제로 전송되지 않았습니다. 확인 후 배포하세요.");
}

main().catch((err) => {
  console.error("시뮬레이션 실패:", err);
  process.exit(1);
});
