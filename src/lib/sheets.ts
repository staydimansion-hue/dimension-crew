import { google } from "googleapis";

const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_TAB_NAME || "QR출퇴근기록";
const HEADER_ROW = [
  "날짜",
  "이름",
  "체크인시각",
  "체크아웃시각",
  "근무시간(h)",
  "시급",
  "금액",
];

function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!email || !rawKey || !spreadsheetId) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY / GOOGLE_SHEETS_SPREADSHEET_ID 환경변수가 설정되지 않았습니다."
    );
  }

  const privateKey = rawKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return { sheets: google.sheets({ version: "v4", auth }), spreadsheetId };
}

async function ensureHeaderRow() {
  const { sheets, spreadsheetId } = getSheetsClient();
  const range = `${SHEET_TAB_NAME}!A1:G1`;
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });
  if (!existing.data.values || existing.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      requestBody: { values: [HEADER_ROW] },
    });
  }
}

/**
 * 출근 시 새 행을 추가하고, 이후 퇴근 업데이트에 쓸 시트 행 번호를 반환한다.
 */
export async function appendCheckInRow(params: {
  dateStr: string;
  name: string;
  checkInTimeStr: string;
}): Promise<number> {
  await ensureHeaderRow();
  const { sheets, spreadsheetId } = getSheetsClient();

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_TAB_NAME}!A:G`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[params.dateStr, params.name, params.checkInTimeStr, "", "", "", ""]],
    },
  });

  const updatedRange = appendRes.data.updates?.updatedRange;
  if (!updatedRange) {
    throw new Error("Google Sheets append 응답에 updatedRange가 없습니다.");
  }
  const match = updatedRange.match(/(\d+)(?::|$)/);
  const rowNumber = match ? parseInt(match[1], 10) : NaN;
  if (Number.isNaN(rowNumber)) {
    throw new Error(`Google Sheets 행 번호를 파싱하지 못했습니다: ${updatedRange}`);
  }
  return rowNumber;
}

/**
 * 퇴근 시 기존 행의 체크아웃시각/근무시간/시급/금액 칸을 채운다.
 */
export async function updateCheckOutRow(params: {
  rowNumber: number;
  checkOutTimeStr: string;
  hoursWorked: number;
  hourlyWage: number;
  amount: number;
}) {
  const { sheets, spreadsheetId } = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${SHEET_TAB_NAME}!D${params.rowNumber}:G${params.rowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          params.checkOutTimeStr,
          params.hoursWorked,
          params.hourlyWage,
          params.amount,
        ],
      ],
    },
  });
}
