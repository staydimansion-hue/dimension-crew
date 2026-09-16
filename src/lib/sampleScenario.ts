import type { ChecklistItem, SlackMessage } from "@/lib/slack";

// 오프라인 시뮬레이션(가상 시나리오)용 샘플 데이터.
// 실제 Supabase / Slack 없이도 봇이 어떤 메시지를 보낼지 미리 확인하는 용도입니다.

export const SAMPLE_CHECKLIST: ChecklistItem[] = [
  { id: "s1", title: "재난 문자 끄기", status: "done", due_date: "2026-09-12", sort_order: 10 },
  { id: "s2", title: "301·303호 냄새 체크", status: "done", due_date: "2026-09-12", sort_order: 20 },
  { id: "s3", title: "근로자 웹앱", status: "done", due_date: "2026-09-13", sort_order: 30 },
  { id: "s4", title: "도배 완료", status: "in_progress", due_date: "2026-09-14", sort_order: 40 },
  { id: "s5", title: "에어컨 금액", status: "in_progress", due_date: "2026-09-14", sort_order: 50 },
  { id: "s6", title: "스탠다드룸 포맥스 발주", status: "not_started", due_date: "2026-09-16", sort_order: 60 },
  { id: "s7", title: "청소 매뉴얼 간소화", status: "not_started", due_date: "2026-09-16", sort_order: 70 },
  { id: "s8", title: "린넨(층별 선반)·가구 발주", status: "not_started", due_date: "2026-09-17", sort_order: 80 },
  { id: "s9", title: "옥상/손잡이", status: "not_started", due_date: "2026-09-21", sort_order: 90 },
  { id: "s10", title: "실리콘 줄눈", status: "not_started", due_date: "2026-09-22", sort_order: 100 },
];

// 운영방 채널의 가상 최근 대화 (최신이 배열 앞쪽 — Slack conversations.history 와 동일한 순서)
export const SAMPLE_MESSAGES: SlackMessage[] = [
  { user: "U_MGR", text: "도배는 오늘 오후에 마무리될 것 같아요.", ts: "1726300000.000100" },
  { user: "U_STAFF", text: "에어컨 금액 견적 두 군데 받아서 내일 비교해서 공유할게요.", ts: "1726290000.000100" },
  { user: "U_MGR", text: "포맥스 발주는 다음 주 월요일까지는 넣어야 합니다.", ts: "1726280000.000100" },
  { user: "U_STAFF", text: "린넨은 아직 업체 선정 전이라 대기 중입니다.", ts: "1726270000.000100" },
];
