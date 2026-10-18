const NOTION_API_BASE = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function getNotionConfig() {
  const apiKey = process.env.NOTION_API_KEY;
  const databaseId = process.env.NOTION_ATTENDANCE_DATABASE_ID;
  if (!apiKey || !databaseId) {
    throw new Error(
      "NOTION_API_KEY / NOTION_ATTENDANCE_DATABASE_ID 환경변수가 설정되지 않았습니다."
    );
  }
  return { apiKey, databaseId };
}

async function notionFetch(path: string, init: RequestInit) {
  const { apiKey } = getNotionConfig();
  const res = await fetch(`${NOTION_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Notion API 오류 (${res.status}): ${text}`);
  }
  return res.json();
}

/**
 * 출근 시 "출퇴근 기록" Notion DB에 새 페이지를 만들고, 퇴근 시 업데이트에
 * 쓸 페이지 ID를 반환한다.
 */
export async function createAttendancePage(params: {
  name: string;
  dateStr: string; // "YYYY-MM-DD"
  checkInIso: string;
}): Promise<string> {
  const { databaseId } = getNotionConfig();
  const data = await notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties: {
        이름: { title: [{ text: { content: params.name } }] },
        날짜: { date: { start: params.dateStr } },
        출근시각: { date: { start: params.checkInIso } },
        상태: { select: { name: "근무중" } },
      },
    }),
  });
  return data.id as string;
}

/**
 * 퇴근 시 기존 Notion 페이지의 퇴근시각/근무시간/금액/상태를 채운다.
 */
export async function updateAttendancePage(params: {
  pageId: string;
  checkOutIso: string;
  hoursWorked: number;
  amount: number;
}) {
  await notionFetch(`/pages/${params.pageId}`, {
    method: "PATCH",
    body: JSON.stringify({
      properties: {
        퇴근시각: { date: { start: params.checkOutIso } },
        "근무시간(h)": { number: params.hoursWorked },
        "금액(원)": { number: params.amount },
        상태: { select: { name: "완료" } },
      },
    }),
  });
}
