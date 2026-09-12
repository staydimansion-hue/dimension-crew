// 공공데이터포털 "한국천문연구원_특일 정보" API로 공휴일 여부를 확인한다.
// 월별로 한 번만 조회하고 메모리에 캐싱한다 (Railway는 상시 실행 서버라 인스턴스가 살아있는 동안 유효).

const monthCache = new Map<string, Set<string>>();

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

async function fetchMonthHolidays(year: number, month: number): Promise<Set<string>> {
  const cacheKey = `${year}-${pad(month)}`;
  const cached = monthCache.get(cacheKey);
  if (cached) return cached;

  const serviceKey = process.env.DATA_GO_KR_HOLIDAY_API_KEY;
  if (!serviceKey) {
    throw new Error("DATA_GO_KR_HOLIDAY_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  const url = new URL(
    "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo"
  );
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("solYear", String(year));
  url.searchParams.set("solMonth", pad(month));
  url.searchParams.set("_type", "json");
  url.searchParams.set("numOfRows", "100");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`공휴일 API 호출 실패: ${res.status}`);
  }
  const data = await res.json();
  const items = data?.response?.body?.items?.item;
  const list = Array.isArray(items) ? items : items ? [items] : [];

  const set = new Set<string>(
    list
      .filter((it: { isHoliday?: string }) => it.isHoliday === "Y")
      .map((it: { locdate: number | string }) => {
        const s = String(it.locdate);
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
      })
  );
  monthCache.set(cacheKey, set);
  return set;
}

export async function isHoliday(dateStr: string): Promise<boolean> {
  const [y, m] = dateStr.split("-").map(Number);
  const set = await fetchMonthHolidays(y, m);
  return set.has(dateStr);
}

function isWeekend(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

function addDays(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

/** 주어진 날짜가 평일·공휴일이 아닌 영업일이 될 때까지 하루씩 앞으로 당긴다. */
export async function previousBusinessDay(dateStr: string): Promise<string> {
  let cur = dateStr;
  while (isWeekend(cur) || (await isHoliday(cur))) {
    cur = addDays(cur, -1);
  }
  return cur;
}
