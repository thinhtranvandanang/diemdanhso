export const DEFAULT_SPREADSHEET_ID = '1utsnEbkzQeWZM88RSCvtk8io-n8QAq38QUOL9OsClAc';
export const SPREADSHEET_CONFIG_STORAGE_KEY = 'so_diem_danh_spreadsheet_id';

export type AttendanceValue = 'P' | 'A' | '';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
}

export interface SheetMetadata {
  sheetId: number;
  title: string;
  index: number;
  rowCount: number;
  columnCount: number;
  merges: GridRange[];
}

export interface GridRange {
  sheetId?: number;
  startRowIndex?: number;
  endRowIndex?: number;
  startColumnIndex?: number;
  endColumnIndex?: number;
}

export interface SpreadsheetInfo {
  spreadsheetId: string;
  title: string;
  sheets: SheetMetadata[];
}

export interface DateSlot {
  /** 0-based index k in row 4 date list (0..44) */
  index: number;
  /** 1-based starting column index (14 + k * 5) */
  colStart: number;
  rawLabel: string;
  isoDate: string;
  dayOfWeekLabel: string;
  /** Formatted as "DD/MM/YYYY (Thứ X)" */
  formattedLabel: string;
}

export interface Student {
  /** 1-based sheet row number (>= 9) */
  rowNumber: number;
  stt: string;
  mssv: string;
  fullName: string;
}

export interface ClassContextData {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetName: string;
  dates: DateSlot[];
  students: Student[];
  /** Map of `${k}:${period}` -> subject name from row 7 */
  subjectsBySlot: Record<string, string>;
  maxAttendanceCol: number;
}

export interface PeriodAttendanceData {
  sheetName: string;
  dateSlot: DateSlot;
  period: number;
  colIndex: number;
  colLetter: string;
  subject: string;
  students: Student[];
  values: Record<number, AttendanceValue>;
  maxAttendanceCol: number;
}

export interface StudentSubjectStats {
  subject: string;
  totalPeriods: number;
  absentCount: number;
  presentCount: number;
  absenceRate: number;
  attendanceRate: number;
  sheetReportedValue?: string;
}

export interface StudentReportRow {
  rowNumber: number;
  stt: string;
  mssv: string;
  fullName: string;
  bySubject: Record<string, StudentSubjectStats>;
  totalPeriods: number;
  totalAbsent: number;
  totalPresent: number;
  totalAbsenceRate: number;
  totalAttendanceRate: number;
}

export interface AbsenceLogRow {
  dateLabel: string;
  dayOfWeek: string;
  isoDate: string;
  period: number;
  subject: string;
  stt: string;
  mssv: string;
  fullName: string;
}

export interface SubjectSummaryRow {
  subject: string;
  totalPeriods: number;
  studentCount: number;
  totalSlots: number;
  totalAbsences: number;
  totalPresent: number;
  classAbsenceRate: number;
  classAttendanceRate: number;
}

export interface DashboardReportData {
  sheetName: string;
  spreadsheetTitle: string;
  generatedAt: string;
  subjects: string[];
  studentCount: number;
  dateCount: number;
  totalPeriodsInSchedule: number;
  totalAbsencesAll: number;
  overallAttendanceRate: number;
  studentReports: StudentReportRow[];
  absenceLog: AbsenceLogRow[];
  subjectSummary: SubjectSummaryRow[];
}
