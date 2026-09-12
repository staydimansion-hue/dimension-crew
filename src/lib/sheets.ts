import { google } from "googleapis";

const SHEET_TAB_NAME = process.env.GOOGLE_SHEETS_TAB_NAME || "QR출퇴근기록";
const PAYROLL_TAB_NAME = process.env.GOOGLE_SHEETS_PAYROLL_TAB_NAME || "매입)인건비";
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

/**
 * QR출퇴근기록 탭에 브랜드 색상(어두운 갈색 헤더)으로 서식을 입힌다.
 * 헤더 굵게+배경색, 헤더 고정, 열 너비, 금액/시급 숫자 서식, 옅은 테두리.
 * 여러 번 실행해도 안전하다 (덮어쓰기만 함, 데이터는 건드리지 않음).
 */
export async function formatAttendanceSheet() {
  await ensureHeaderRow();
  const { sheets, spreadsheetId } = getSheetsClient();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const targetSheet = meta.data.sheets?.find(
    (s) => s.properties?.title === SHEET_TAB_NAME
  );
  const sheetId = targetSheet?.properties?.sheetId;
  if (sheetId == null) {
    throw new Error(`"${SHEET_TAB_NAME}" 탭을 찾지 못했습니다.`);
  }

  const columnCount = HEADER_ROW.length;
  const lightBorder = { style: "SOLID" as const, width: 1, color: { red: 0.87, green: 0.85, blue: 0.81 } };

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.169, green: 0.141, blue: 0.114 },
                textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                horizontalAlignment: "CENTER",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)",
          },
        },
        {
          updateSheetProperties: {
            properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
            fields: "gridProperties.frozenRowCount",
          },
        },
        {
          updateDimensionProperties: {
            range: { sheetId, dimension: "COLUMNS", startIndex: 0, endIndex: columnCount },
            properties: { pixelSize: 130 },
            fields: "pixelSize",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, startColumnIndex: 5, endColumnIndex: 7 },
            cell: {
              userEnteredFormat: { numberFormat: { type: "NUMBER", pattern: "#,##0" } },
            },
            fields: "userEnteredFormat.numberFormat",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, startColumnIndex: 0, endColumnIndex: columnCount },
            cell: { userEnteredFormat: { horizontalAlignment: "CENTER" } },
            fields: "userEnteredFormat.horizontalAlignment",
          },
        },
        {
          updateBorders: {
            range: { sheetId, startRowIndex: 0, startColumnIndex: 0, endColumnIndex: columnCount },
            top: lightBorder,
            bottom: lightBorder,
            left: lightBorder,
            right: lightBorder,
            innerHorizontal: lightBorder,
            innerVertical: lightBorder,
          },
        },
      ],
    },
  });
}

/**
 * 급여장부(매입)인건비 탭)에서 이름이 일치하면서 시급(H열)이 비어있는
 * 가장 위쪽 행을 찾아 시급(H)/근무일정(I)/근무시간(J)을 채운다.
 * 미리 준비된 행(작성자·입금요청·요청금액·업무명·이름·주민등록번호)이 없으면 실패한다.
 */
export async function writePayrollEntry(params: {
  name: string;
  hourlyWage: number;
  startTimeStr: string;
  endTimeStr: string;
  hoursWorked: number;
}): Promise<{ row: number }> {
  const { sheets, spreadsheetId } = getSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${PAYROLL_TAB_NAME}!F2:H`,
  });
  const rows = res.data.values ?? [];

  let targetRow = -1;
  for (let i = 0; i < rows.length; i++) {
    const rowName = rows[i]?.[0];
    const wageCell = rows[i]?.[2];
    if (rowName === params.name && !wageCell) {
      targetRow = i + 2; // 1-indexed + 헤더 1행
      break;
    }
  }

  if (targetRow === -1) {
    throw new Error(
      `"${params.name}" 이름으로 시급이 비어있는 행을 급여장부(${PAYROLL_TAB_NAME})에서 찾지 못했습니다. 행이 미리 준비되어 있는지 확인해주세요.`
    );
  }

  const totalMinutes = params.hoursWorked * 60;
  const roundedMinutes = Math.round(totalMinutes / 10) * 10;
  const roundedHours = Math.round((roundedMinutes / 60) * 100) / 100;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${PAYROLL_TAB_NAME}!H${targetRow}:J${targetRow}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          params.hourlyWage,
          `${params.startTimeStr} ~ ${params.endTimeStr} (휴게 없음)`,
          roundedHours,
        ],
      ],
    },
  });

  return { row: targetRow };
}
