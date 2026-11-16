import type {
  AbsenceLogRow,
  AttendanceValue,
  ClassContextData,
  DashboardReportData,
  DateSlot,
  GridRange,
  PeriodAttendanceData,
  SheetMetadata,
  SpreadsheetInfo,
  Student,
  StudentReportRow,
  StudentSubjectStats,
  SubjectSummaryRow,
} from '../types/attendance';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export type SheetsErrorCode =
  | 'TOKEN_EXPIRED'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class SheetsApiError extends Error {
  code: SheetsErrorCode;
  status?: number;

  constructor(code: SheetsErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SheetsApiError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Converts 1-based column index (1 -> A, 14 -> N, 241 -> IG, 267 -> JG) to A1 column letter.
 */
export function columnToLetter(col: number): string {
  if (!Number.isInteger(col) || col < 1) {
    throw new Error(`Invalid column index: ${col}`);
  }
  let result = '';
  let n = col;
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function quoteSheetName(sheetName: string): string {
  return `'${sheetName.replace(/'/g, "''")}'`;
}

const WEEKDAY_NAMES_VI = [
  'Chủ nhật',
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
];

function formatDateParts(year: number, month: number, day: number): {
  isoDate: string;
  dayOfWeekLabel: string;
  formattedLabel: string;
} {
  const dateObj = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAY_NAMES_VI[dateObj.getUTCDay()] ?? '';
  const dd = String(day).padStart(2, '0');
  const mm = String(month).padStart(2, '0');
  const yyyy = String(year);
  return {
    isoDate: `${yyyy}-${mm}-${dd}`,
    dayOfWeekLabel: weekday,
    formattedLabel: `${dd}/${mm}/${yyyy} (${weekday})`,
  };
}

export function parseSheetDate(
  formattedValue: unknown,
  unformattedValue: unknown
): {
  rawLabel: string;
  isoDate: string;
  dayOfWeekLabel: string;
  formattedLabel: string;
} | null {
  const rawStr = formattedValue != null ? String(formattedValue).trim() : '';

  // 1. Prefer Google Sheets numeric serial date (days since 1899-12-30)
  if (typeof unformattedValue === 'number' && unformattedValue > 20000 && unformattedValue < 90000) {
    const ms = Date.UTC(1899, 11, 30) + Math.round(unformattedValue) * 86400000;
    const d = new Date(ms);
    const parts = formatDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    return {
      rawLabel: rawStr || parts.isoDate,
      ...parts,
    };
  }

  if (!rawStr) {
    return null;
  }

  // 2. ISO format YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = rawStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return {
        rawLabel: rawStr,
        ...formatDateParts(year, month, day),
      };
    }
  }

  // 3. DMY format DD/MM/YYYY or D/M/YYYY (fallback MM/DD/YYYY if month > 12)
  const dmyMatch = rawStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    let first = Number(dmyMatch[1]);
    let second = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    if (second > 12 && first <= 12) {
      const tmp = first;
      first = second;
      second = tmp;
    }
    if (second >= 1 && second <= 12 && first >= 1 && first <= 31) {
      return {
        rawLabel: rawStr,
        ...formatDateParts(year, second, first),
      };
    }
  }

  // Fallback for unrecognized text date
  return {
    rawLabel: rawStr,
    isoDate: rawStr,
    dayOfWeekLabel: '',
    formattedLabel: rawStr,
  };
}

async function sheetsFetch<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  if (!accessToken) {
    throw new SheetsApiError(
      'TOKEN_EXPIRED',
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại bằng Google.'
    );
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new SheetsApiError(
      'NETWORK_ERROR',
      'Mất kết nối mạng hoặc không thể kết nối tới Google Sheets. Vui lòng kiểm tra mạng và thử lại.'
    );
  }

  if (response.ok) {
    return (await response.json()) as T;
  }

  let apiMessage = '';
  try {
    const errBody = await response.json();
    apiMessage = errBody?.error?.message || '';
  } catch {
    // ignore JSON parse errors
  }

  if (response.status === 401) {
    throw new SheetsApiError(
      'TOKEN_EXPIRED',
      'Phiên Google Sheets đã hết hạn. Vui lòng đăng nhập lại bằng Google để tiếp tục.',
      401
    );
  }

  if (response.status === 403) {
    throw new SheetsApiError(
      'PERMISSION_DENIED',
      'Cần share quyền Editor cho email đang đăng nhập (hoặc kiểm tra quyền truy cập file Google Sheets).',
      403
    );
  }

  if (response.status === 404) {
    throw new SheetsApiError(
      'NOT_FOUND',
      'Không tìm thấy file Google Sheets. Vui lòng kiểm tra lại Spreadsheet ID trong Cấu hình.',
      404
    );
  }

  if (response.status === 400) {
    throw new SheetsApiError(
      'BAD_REQUEST',
      apiMessage ? `Yêu cầu không hợp lệ: ${apiMessage}` : 'Yêu cầu đọc/ghi Google Sheets không hợp lệ.',
      400
    );
  }

  throw new SheetsApiError(
    'UNKNOWN',
    apiMessage || `Lỗi Google Sheets (HTTP ${response.status}). Vui lòng thử lại.`,
    response.status
  );
}

interface RawSpreadsheetResponse {
  spreadsheetId: string;
  properties?: { title?: string };
  sheets?: Array<{
    properties?: {
      sheetId?: number;
      title?: string;
      index?: number;
      gridProperties?: {
        rowCount?: number;
        columnCount?: number;
      };
    };
    merges?: GridRange[];
  }>;
}

export async function fetchSpreadsheetMetadata(
  spreadsheetId: string,
  accessToken: string
): Promise<SpreadsheetInfo> {
  const cleanId = spreadsheetId.trim();
  if (!cleanId) {
    throw new SheetsApiError('BAD_REQUEST', 'Spreadsheet ID không được để trống.');
  }

  const fields =
    'spreadsheetId,properties.title,sheets(properties(sheetId,title,index,gridProperties),merges)';
  const url = `${SHEETS_API_BASE}/${encodeURIComponent(cleanId)}?fields=${encodeURIComponent(fields)}`;
  const raw = await sheetsFetch<RawSpreadsheetResponse>(url, accessToken);

  const sheets: SheetMetadata[] = (raw.sheets ?? []).map((s, idx) => ({
    sheetId: s.properties?.sheetId ?? idx,
    title: s.properties?.title ?? `Sheet${idx + 1}`,
    index: s.properties?.index ?? idx,
    rowCount: s.properties?.gridProperties?.rowCount ?? 200,
    columnCount: s.properties?.gridProperties?.columnCount ?? 250,
    merges: s.merges ?? [],
  }));

  return {
    spreadsheetId: raw.spreadsheetId || cleanId,
    title: raw.properties?.title ?? 'Google Spreadsheet',
    sheets,
  };
}

interface BatchGetResponse {
  spreadsheetId: string;
  valueRanges?: Array<{
    range?: string;
    values?: unknown[][];
  }>;
}

function getAttendanceEndCol(sheetColumnCount: number): number {
  // Attendance region starts at N (14) and ends up to JG (267) or sheet columnCount
  return Math.max(14, Math.min(267, sheetColumnCount));
}

function extractDatesFromRow4(
  formattedRow4: unknown[],
  unformattedRow4: unknown[],
  merges: GridRange[],
  maxAttendanceCol: number
): DateSlot[] {
  const row4Merges = merges
    .filter(
      (m) =>
        m.startRowIndex === 3 &&
        (m.endRowIndex ?? 4) === 4 &&
        (m.startColumnIndex ?? 0) >= 13 &&
        (m.startColumnIndex ?? 0) < maxAttendanceCol
    )
    .sort((a, b) => (a.startColumnIndex ?? 0) - (b.startColumnIndex ?? 0));

  const dates: DateSlot[] = [];

  if (row4Merges.length > 0) {
    for (const m of row4Merges) {
      const startCol0 = m.startColumnIndex ?? 13; // 0-based (13 = N)
      const k = Math.round((startCol0 - 13) / 5);
      const offset = startCol0 - 13;
      const parsed = parseSheetDate(formattedRow4[offset], unformattedRow4[offset]);
      if (parsed) {
        dates.push({
          index: k,
          colStart: 14 + k * 5,
          ...parsed,
        });
      }
    }
  } else {
    // Fallback if merges metadata absent: step every 5 columns from column N
    const maxK = Math.floor((maxAttendanceCol - 14) / 5);
    for (let k = 0; k <= maxK; k++) {
      const offset = k * 5;
      const parsed = parseSheetDate(formattedRow4[offset], unformattedRow4[offset]);
      if (parsed) {
        dates.push({
          index: k,
          colStart: 14 + k * 5,
          ...parsed,
        });
      }
    }
  }

  return dates;
}

function extractStudents(rowsAtoCFromRow6: unknown[][]): Student[] {
  const students: Student[] = [];
  // Index 0 = Row 6, Index 1 = Row 7, Index 2 = Row 8, Index 3 = Row 9
  let consecutiveBlankRows = 0;
  for (let i = 3; i < rowsAtoCFromRow6.length; i++) {
    const row = rowsAtoCFromRow6[i] ?? [];
    const stt = row[0] != null ? String(row[0]).trim() : '';
    const mssv = row[1] != null ? String(row[1]).trim() : '';
    const fullName = row[2] != null ? String(row[2]).trim() : '';

    if (!stt && !mssv && !fullName) {
      if (students.length > 0) {
        consecutiveBlankRows++;
        if (consecutiveBlankRows >= 3) break;
      }
      continue;
    }

    consecutiveBlankRows = 0;

    // A valid student row has a name and either MSSV or numeric STT
    if (fullName && (mssv || /^\d+$/.test(stt))) {
      students.push({
        rowNumber: 6 + i,
        stt: stt || String(students.length + 1),
        mssv,
        fullName,
      });
    }
  }
  return students;
}

export async function fetchClassContext(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  cachedSpreadsheetInfo?: SpreadsheetInfo
): Promise<ClassContextData> {
  const info = cachedSpreadsheetInfo ?? (await fetchSpreadsheetMetadata(spreadsheetId, accessToken));
  const sheetMeta = info.sheets.find((s) => s.title === sheetName);
  if (!sheetMeta) {
    throw new SheetsApiError('NOT_FOUND', `Không tìm thấy sheet "${sheetName}" trong bảng tính.`);
  }

  const maxAttendanceCol = getAttendanceEndCol(sheetMeta.columnCount);
  const maxColLetter = columnToLetter(maxAttendanceCol);
  const maxRow = Math.min(sheetMeta.rowCount || 200, 400);
  const quoted = quoteSheetName(sheetName);

  const rangeAC = `${quoted}!A6:C${maxRow}`;
  const rangeDates = `${quoted}!N4:${maxColLetter}4`;
  const rangeSubjects = `${quoted}!N7:${maxColLetter}7`;

  const formattedUrl =
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet` +
    `?ranges=${encodeURIComponent(rangeAC)}` +
    `&ranges=${encodeURIComponent(rangeDates)}` +
    `&ranges=${encodeURIComponent(rangeSubjects)}` +
    `&valueRenderOption=FORMATTED_VALUE`;

  const unformattedUrl =
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet` +
    `?ranges=${encodeURIComponent(rangeDates)}` +
    `&valueRenderOption=UNFORMATTED_VALUE`;

  const [formattedRes, unformattedRes] = await Promise.all([
    sheetsFetch<BatchGetResponse>(formattedUrl, accessToken),
    sheetsFetch<BatchGetResponse>(unformattedUrl, accessToken),
  ]);

  const rowsAC = formattedRes.valueRanges?.[0]?.values ?? [];
  const formattedRow4 = formattedRes.valueRanges?.[1]?.values?.[0] ?? [];
  const row7 = formattedRes.valueRanges?.[2]?.values?.[0] ?? [];
  const unformattedRow4 = unformattedRes.valueRanges?.[0]?.values?.[0] ?? [];

  const dates = extractDatesFromRow4(
    formattedRow4,
    unformattedRow4,
    sheetMeta.merges,
    maxAttendanceCol
  );
  const students = extractStudents(rowsAC);

  const subjectsBySlot: Record<string, string> = {};
  for (const d of dates) {
    for (let t = 1; t <= 5; t++) {
      const offset = d.index * 5 + (t - 1);
      const subject = row7[offset] != null ? String(row7[offset]).trim() : '';
      subjectsBySlot[`${d.index}:${t}`] = subject;
    }
  }

  return {
    spreadsheetId: info.spreadsheetId,
    spreadsheetTitle: info.title,
    sheetName,
    dates,
    students,
    subjectsBySlot,
    maxAttendanceCol,
  };
}

function normalizeAttendanceCell(raw: unknown): AttendanceValue {
  if (raw == null) return '';
  const val = String(raw).trim().toUpperCase();
  if (val === 'P') return 'P';
  if (val === 'A') return 'A';
  return '';
}

export async function fetchPeriodAttendance(
  spreadsheetId: string,
  classContext: ClassContextData,
  dateSlot: DateSlot,
  period: number,
  accessToken: string
): Promise<PeriodAttendanceData> {
  if (period < 1 || period > 5) {
    throw new SheetsApiError('BAD_REQUEST', 'Tiết học phải từ 1 đến 5.');
  }

  const colIndex = 14 + dateSlot.index * 5 + (period - 1);
  if (colIndex < 14 || colIndex > classContext.maxAttendanceCol) {
    throw new SheetsApiError(
      'BAD_REQUEST',
      `Tọa độ cột vượt quá vùng điểm danh cho phép (${colIndex}).`
    );
  }

  const colLetter = columnToLetter(colIndex);
  const quoted = quoteSheetName(classContext.sheetName);

  const lastStudentRow =
    classContext.students.length > 0
      ? Math.max(...classContext.students.map((s) => s.rowNumber))
      : 9;

  const subjectRange = `${quoted}!${colLetter}7`;
  const valuesRange = `${quoted}!${colLetter}9:${colLetter}${lastStudentRow}`;

  const url =
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet` +
    `?ranges=${encodeURIComponent(subjectRange)}` +
    `&ranges=${encodeURIComponent(valuesRange)}` +
    `&valueRenderOption=FORMATTED_VALUE`;

  const res = await sheetsFetch<BatchGetResponse>(url, accessToken);
  const subjectCell = res.valueRanges?.[0]?.values?.[0]?.[0];
  const subject =
    (subjectCell != null ? String(subjectCell).trim() : '') ||
    classContext.subjectsBySlot[`${dateSlot.index}:${period}`] ||
    'Chưa xác định môn';

  const colRows = res.valueRanges?.[1]?.values ?? [];
  const values: Record<number, AttendanceValue> = {};

  for (const student of classContext.students) {
    const idx = student.rowNumber - 9;
    const rawCell = colRows[idx]?.[0];
    values[student.rowNumber] = normalizeAttendanceCell(rawCell);
  }

  return {
    sheetName: classContext.sheetName,
    dateSlot,
    period,
    colIndex,
    colLetter,
    subject,
    students: classContext.students,
    values,
    maxAttendanceCol: classContext.maxAttendanceCol,
  };
}

export interface AttendanceCellChange {
  rowNumber: number;
  value: 'P' | 'A';
}

export async function saveAttendanceBatch(
  spreadsheetId: string,
  periodData: PeriodAttendanceData,
  changes: AttendanceCellChange[],
  accessToken: string
): Promise<number> {
  if (changes.length === 0) return 0;

  // Strict structural safety guard: never write outside N9:maxCol
  if (periodData.colIndex < 14 || periodData.colIndex > periodData.maxAttendanceCol) {
    throw new SheetsApiError(
      'BAD_REQUEST',
      'Cột ghi dữ liệu nằm ngoài vùng điểm danh cho phép (N..JG).'
    );
  }

  const quoted = quoteSheetName(periodData.sheetName);
  const colLetter = columnToLetter(periodData.colIndex);

  const data = changes.map((c) => {
    if (c.rowNumber < 9) {
      throw new SheetsApiError(
        'BAD_REQUEST',
        `Không được phép ghi vào dòng tiêu đề/công thức (dòng ${c.rowNumber}).`
      );
    }
    if (c.value !== 'P' && c.value !== 'A') {
      throw new SheetsApiError(
        'BAD_REQUEST',
        `Giá trị điểm danh không hợp lệ: "${c.value}". Chỉ chấp nhận P hoặc A.`
      );
    }
    return {
      range: `${quoted}!${colLetter}${c.rowNumber}`,
      majorDimension: 'ROWS',
      values: [[c.value]],
    };
  });

  const url = `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchUpdate`;
  await sheetsFetch(url, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      valueInputOption: 'RAW',
      data,
    }),
  });

  return changes.length;
}

export async function fetchFullSheetForDashboard(
  spreadsheetId: string,
  sheetName: string,
  accessToken: string,
  cachedSpreadsheetInfo?: SpreadsheetInfo
): Promise<DashboardReportData> {
  const info = cachedSpreadsheetInfo ?? (await fetchSpreadsheetMetadata(spreadsheetId, accessToken));
  const sheetMeta = info.sheets.find((s) => s.title === sheetName);
  if (!sheetMeta) {
    throw new SheetsApiError('NOT_FOUND', `Không tìm thấy sheet "${sheetName}" trong bảng tính.`);
  }

  const maxAttendanceCol = getAttendanceEndCol(sheetMeta.columnCount);
  const maxColLetter = columnToLetter(maxAttendanceCol);
  const maxRow = Math.min(sheetMeta.rowCount || 200, 400);
  const quoted = quoteSheetName(sheetName);

  const rangeAM = `${quoted}!A6:M${maxRow}`;
  const rangeDates = `${quoted}!N4:${maxColLetter}4`;
  const rangeSubjects = `${quoted}!N7:${maxColLetter}7`;
  const rangeAttendance = `${quoted}!N9:${maxColLetter}${maxRow}`;

  const formattedUrl =
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet` +
    `?ranges=${encodeURIComponent(rangeAM)}` +
    `&ranges=${encodeURIComponent(rangeDates)}` +
    `&ranges=${encodeURIComponent(rangeSubjects)}` +
    `&ranges=${encodeURIComponent(rangeAttendance)}` +
    `&valueRenderOption=FORMATTED_VALUE`;

  const unformattedUrl =
    `${SHEETS_API_BASE}/${encodeURIComponent(spreadsheetId)}/values:batchGet` +
    `?ranges=${encodeURIComponent(rangeDates)}` +
    `&valueRenderOption=UNFORMATTED_VALUE`;

  const [formattedRes, unformattedRes] = await Promise.all([
    sheetsFetch<BatchGetResponse>(formattedUrl, accessToken),
    sheetsFetch<BatchGetResponse>(unformattedUrl, accessToken),
  ]);

  const rowsAM = formattedRes.valueRanges?.[0]?.values ?? [];
  const formattedRow4 = formattedRes.valueRanges?.[1]?.values?.[0] ?? [];
  const row7 = formattedRes.valueRanges?.[2]?.values?.[0] ?? [];
  const attendanceGrid = formattedRes.valueRanges?.[3]?.values ?? [];
  const unformattedRow4 = unformattedRes.valueRanges?.[0]?.values?.[0] ?? [];

  const dates = extractDatesFromRow4(
    formattedRow4,
    unformattedRow4,
    sheetMeta.merges,
    maxAttendanceCol
  );
  const students = extractStudents(rowsAM);

  // Extract subject headers from D6:M6 (indices 3..12 in row 6)
  const headerRow6 = rowsAM[0] ?? [];
  const sheetSummaryHeaders: { colIdx: number; name: string }[] = [];
  for (let c = 3; c <= 12; c++) {
    const label = headerRow6[c] != null ? String(headerRow6[c]).trim() : '';
    if (label) {
      sheetSummaryHeaders.push({ colIdx: c, name: label });
    }
  }

  // Build list of active period columns across all dates
  interface PeriodColumnMeta {
    offset: number;
    dateSlot: DateSlot;
    period: number;
    subject: string;
  }

  const periodColumns: PeriodColumnMeta[] = [];
  const periodCountBySubject = new Map<string, number>();

  for (const d of dates) {
    for (let t = 1; t <= 5; t++) {
      const offset = d.index * 5 + (t - 1);
      const subject = row7[offset] != null ? String(row7[offset]).trim() : '';
      if (subject) {
        periodColumns.push({ offset, dateSlot: d, period: t, subject });
        periodCountBySubject.set(subject, (periodCountBySubject.get(subject) ?? 0) + 1);
      }
    }
  }

  // Order subjects: D6:M6 headers first (if present in row 7 or header), then any extra row 7 subjects
  const subjectSet = new Set<string>();
  const orderedSubjects: string[] = [];

  for (const h of sheetSummaryHeaders) {
    if (!subjectSet.has(h.name) && periodCountBySubject.has(h.name)) {
      subjectSet.add(h.name);
      orderedSubjects.push(h.name);
    }
  }
  for (const subj of periodCountBySubject.keys()) {
    if (!subjectSet.has(subj)) {
      subjectSet.add(subj);
      orderedSubjects.push(subj);
    }
  }

  // Map D..M pre-calculated values by student rowNumber and subject name
  const sheetHeaderByName = new Map<string, number>();
  for (const h of sheetSummaryHeaders) {
    sheetHeaderByName.set(h.name.toLowerCase(), h.colIdx);
  }

  const absenceLog: AbsenceLogRow[] = [];
  const absencesBySubject = new Map<string, number>();
  const presentBySubject = new Map<string, number>();

  const studentReports: StudentReportRow[] = students.map((student) => {
    const gridIdx = student.rowNumber - 9;
    const studentAttRow = attendanceGrid[gridIdx] ?? [];
    const studentAMRow = rowsAM[student.rowNumber - 6] ?? [];

    const absentMap = new Map<string, number>();
    const presentMap = new Map<string, number>();
    let totalAbsent = 0;
    let totalPresent = 0;

    for (const col of periodColumns) {
      const val = normalizeAttendanceCell(studentAttRow[col.offset]);
      if (val === 'A') {
        totalAbsent++;
        absentMap.set(col.subject, (absentMap.get(col.subject) ?? 0) + 1);
        absencesBySubject.set(col.subject, (absencesBySubject.get(col.subject) ?? 0) + 1);
        absenceLog.push({
          dateLabel: col.dateSlot.formattedLabel,
          dayOfWeek: col.dateSlot.dayOfWeekLabel,
          isoDate: col.dateSlot.isoDate,
          period: col.period,
          subject: col.subject,
          stt: student.stt,
          mssv: student.mssv,
          fullName: student.fullName,
        });
      } else if (val === 'P') {
        totalPresent++;
        presentMap.set(col.subject, (presentMap.get(col.subject) ?? 0) + 1);
        presentBySubject.set(col.subject, (presentBySubject.get(col.subject) ?? 0) + 1);
      }
    }

    const bySubject: Record<string, StudentSubjectStats> = {};
    for (const subj of orderedSubjects) {
      const totalPeriods = periodCountBySubject.get(subj) ?? 0;
      const absentCount = absentMap.get(subj) ?? 0;
      const presentCount = presentMap.get(subj) ?? 0;
      const absenceRate = totalPeriods > 0 ? absentCount / totalPeriods : 0;
      const attendanceRate = 1 - absenceRate;

      const dmColIdx = sheetHeaderByName.get(subj.toLowerCase());
      const sheetReportedValue =
        dmColIdx !== undefined && studentAMRow[dmColIdx] != null
          ? String(studentAMRow[dmColIdx]).trim()
          : undefined;

      bySubject[subj] = {
        subject: subj,
        totalPeriods,
        absentCount,
        presentCount,
        absenceRate,
        attendanceRate,
        sheetReportedValue,
      };
    }

    const totalPeriods = periodColumns.length;
    const totalAbsenceRate = totalPeriods > 0 ? totalAbsent / totalPeriods : 0;

    return {
      rowNumber: student.rowNumber,
      stt: student.stt,
      mssv: student.mssv,
      fullName: student.fullName,
      bySubject,
      totalPeriods,
      totalAbsent,
      totalPresent,
      totalAbsenceRate,
      totalAttendanceRate: 1 - totalAbsenceRate,
    };
  });

  // Sort absence log chronologically by date, then period, then STT
  absenceLog.sort((a, b) => {
    const dateCmp = a.isoDate.localeCompare(b.isoDate);
    if (dateCmp !== 0) return dateCmp;
    if (a.period !== b.period) return a.period - b.period;
    return Number(a.stt) - Number(b.stt);
  });

  const studentCount = students.length;
  const subjectSummary: SubjectSummaryRow[] = orderedSubjects.map((subj) => {
    const totalPeriods = periodCountBySubject.get(subj) ?? 0;
    const totalSlots = totalPeriods * studentCount;
    const totalAbsences = absencesBySubject.get(subj) ?? 0;
    const totalPresent = presentBySubject.get(subj) ?? 0;
    const classAbsenceRate = totalSlots > 0 ? totalAbsences / totalSlots : 0;
    return {
      subject: subj,
      totalPeriods,
      studentCount,
      totalSlots,
      totalAbsences,
      totalPresent,
      classAbsenceRate,
      classAttendanceRate: 1 - classAbsenceRate,
    };
  });

  const totalSlotsAll = periodColumns.length * studentCount;
  const totalAbsencesAll = studentReports.reduce((acc, r) => acc + r.totalAbsent, 0);
  const overallAbsenceRate = totalSlotsAll > 0 ? totalAbsencesAll / totalSlotsAll : 0;

  return {
    sheetName,
    spreadsheetTitle: info.title,
    generatedAt: new Date().toLocaleString('vi-VN'),
    subjects: orderedSubjects,
    studentCount,
    dateCount: dates.length,
    totalPeriodsInSchedule: periodColumns.length,
    totalAbsencesAll,
    overallAttendanceRate: 1 - overallAbsenceRate,
    studentReports,
    absenceLog,
    subjectSummary,
  };
}
