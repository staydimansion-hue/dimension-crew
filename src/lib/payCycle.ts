// 지급주기 규칙(2026-09-12 매니저 확정):
// 매월 5일 ~ 다음달 4일 근무분을 "다음달 5일"에 지급한다.
// (5일 당일 근무는 그 사이클에 포함되어 다음달 5일 지급으로 넘어간다)
//
// cycleKey는 "지급일이 속한 YYYY-MM" 이다. 예: "2026-10" = 2026년 10월 5일 지급.

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function cycleKeyForWorkDate(workDate: string): string {
  const [y, m, d] = workDate.split("-").map(Number);
  // 5일 미만이면 이번 달 5일 지급 사이클, 5일 이상이면 다음 달 5일 지급 사이클
  const dt = d < 5 ? new Date(y, m - 1, 1) : new Date(y, m, 1);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`;
}

export function cycleRange(cycleKey: string): { from: string; to: string } {
  const [y, m] = cycleKey.split("-").map(Number);
  const to = `${y}-${pad(m)}-04`;
  const prev = new Date(y, m - 2, 5);
  const from = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-05`;
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
