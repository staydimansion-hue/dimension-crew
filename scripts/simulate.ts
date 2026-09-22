/**
 * 오프라인 가상 시나리오(드라이런) 스크립트.
 *
 * 실제 Slack / Supabase / (선택적으로) Anthropic 없이도 운영방 PM 봇이
 * 어떻게 동작하는지 그대로 렌더링해서 출력합니다.
 *   (a) 오늘 아침 PM 브리핑 [daily-checklist]
 *   (b) 매니저가 "아니야, 다른 게 먼저야"라고 답장했을 때의 재정리 [slack/events]
 *   (c) 매니저가 "응 좋아"라고 확정했을 때의 응답 [slack/events]
 *   (d) 저녁 마무리 리포트 — 확인 요청 없이 그대로 보고 [daily-checklist?phase=evening]
 *
 * 실행: npm run simulate
 * ANTHROPIC_API_KEY 가 설정돼 있으면 (a)(b)(d)는 실제 Claude 호출을, 없으면 결정적 스텁을 사용합니다.
 */
import {
  buildDailyPlan,
  buildStubDailyPlan,
  buildEveningReport,
  buildStubEveningReport,
  interpretPlanReply,
} from "../src/lib/anthropic";
import { SAMPLE_CHECKLIST, SAMPLE_MESSAGES } from "../src/lib/sampleScenario";

function divider(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

async function main() {
  const channel =
    process.env.SLACK_OPERATIONS_CHANNEL_ID ?? "(SLACK_OPERATIONS_CHANNEL_ID 미설정 — 테스트 채널/DM로 먼저 지정 가능)";
  const useAi = Boolean(process.env.ANTHROPIC_API_KEY);

  console.log("가상 시나리오 (드라이런) — 실제 Slack 전송 없음");
  console.log(`대상 채널(설정값): ${channel}`);
  console.log(`Claude 사용 여부: ${useAi ? "실제 호출" : "결정적 스텁(ANTHROPIC_API_KEY 없음)"}`);

  divider("(a) 오늘 아침 PM 브리핑 [daily-checklist]");
  const plan = useAi
    ? await buildDailyPlan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES)
    : buildStubDailyPlan(SAMPLE_CHECKLIST, SAMPLE_MESSAGES);
  console.log(plan);

  divider('(b) 매니저 답장: "아니야, 에어컨보다 도배 마무리부터 확인해줘" [slack/events]');
  const revised = await interpretPlanReply(
    plan,
    SAMPLE_CHECKLIST,
    "아니야, 에어컨보다 도배 마무리부터 확인해줘"
  );
  console.log(`confirmed: ${revised.confirmed}`);
  console.log(revised.message);

  divider('(c) 매니저 답장: "응 좋아 그대로 진행해줘" [slack/events]');
  const confirmed = await interpretPlanReply(plan, SAMPLE_CHECKLIST, "응 좋아 그대로 진행해줘");
  console.log(`confirmed: ${confirmed.confirmed}`);
  console.log(confirmed.message);

  divider("(d) 저녁 마무리 리포트 [daily-checklist?phase=evening]");
  const evening = useAi
    ? await buildEveningReport(SAMPLE_CHECKLIST, SAMPLE_MESSAGES)
    : buildStubEveningReport(SAMPLE_CHECKLIST, SAMPLE_MESSAGES);
  console.log(evening);

  console.log("\n(끝) 위 내용은 실제로 전송/저장되지 않았습니다. 확인 후 배포하세요.");
}

main().catch((err) => {
  console.error("시뮬레이션 실패:", err);
  process.exit(1);
});
