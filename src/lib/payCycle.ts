// 지급주기 규칙(2026-10-30 대표 확정, 예전 "5일 ~ 다음달 4일"에서 변경):
// 매월 1일 ~ 말일 근무분을 "다음달 5일"에 지급한다.
//
// cycleKey는 "지급일이 속한 YYYY-MM" 이다. 예: "2026-11" = 2026년 10월 근무분, 11월 5일 지급.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function cycleKeyForWorkDate(workDate: string): string {
  const [y, m] = workDate.split("-").map(Number);
  // 근무한 달의 다음 달 5일에 지급
  const dt = new Date(y, m, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

export function cycleRange(cycleKey: string): { from: string; to: string } {
  const [y, m] = cycleKey.split("-").map(Number);
  const first = new Date(y, m - 2, 1);
  const last = new Date(y, m - 1, 0);
  const from = `${first.getFullYear()}-${pad(first.getMonth() + 1)}-01`;
  const to = `${last.getFullYear()}-${pad(last.getMonth() + 1)}-${pad(last.getDate())}`;
  return { from, to };
}

export function shiftCycle(cycleKey: string, delta: number): string {
  const [y, m] = cycleKey.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

export function cycleLabel(cycleKey: string): string {
  const [y, m] = cycleKey.split("-").map(Number);
  return `${y}년 ${m}월 5일 지급`;
}
