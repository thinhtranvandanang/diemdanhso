import * as XLSX from 'xlsx';
import type { DashboardReportData } from '../types/attendance';

function formatPct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function exportDashboardToExcel(report: DashboardReportData): string {
  const wb = XLSX.utils.book_new();

  // Sheet (a): Tỉ lệ chuyên cần từng học sinh
  const sheetAHeaders = [
    'STT',
    'MSSV',
    'Họ tên',
    ...report.subjects.flatMap((s) => [`${s} (Có mặt %)`, `${s} (Vắng %)`]),
    'Tổng số tiết',
    'Tổng tiết vắng',
    'Tỉ lệ vắng chung (%)',
    'Tỉ lệ chuyên cần (%)',
  ];

  const sheetARows = report.studentReports.map((stu) => {
    const subjectCells = report.subjects.flatMap((s) => {
      const stat = stu.bySubject[s];
      if (!stat) return ['0.0%', '0.0%'];
      return [formatPct(stat.attendanceRate), formatPct(stat.absenceRate)];
    });
    return [
      stu.stt,
      stu.mssv,
      stu.fullName,
      ...subjectCells,
      stu.totalPeriods,
      stu.totalAbsent,
      formatPct(stu.totalAbsenceRate),
      formatPct(stu.totalAttendanceRate),
    ];
  });

  const wsA = XLSX.utils.aoa_to_sheet([sheetAHeaders, ...sheetARows]);
  wsA['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 24 },
    ...report.subjects.flatMap(() => [{ wch: 16 }, { wch: 14 }]),
    { wch: 13 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsA, 'Chuyen can hoc sinh');

  // Sheet (b): Danh sách vắng theo ngày
  const sheetBHeaders = ['STT', 'Ngày', 'Thứ', 'Tiết', 'Môn học', 'MSSV', 'Họ tên'];
  const sheetBRows = report.absenceLog.map((item, idx) => [
    idx + 1,
    item.dateLabel.split(' (')[0] || item.isoDate,
    item.dayOfWeek,
    `Tiết ${item.period}`,
    item.subject,
    item.mssv,
    item.fullName,
  ]);
  const wsB = XLSX.utils.aoa_to_sheet([sheetBHeaders, ...sheetBRows]);
  wsB['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 11 },
    { wch: 8 },
    { wch: 26 },
    { wch: 14 },
    { wch: 26 },
  ];
  XLSX.utils.book_append_sheet(wb, wsB, 'Vang theo ngay');

  // Sheet (c): Tổng hợp theo môn
  const sheetCHeaders = [
    'STT',
    'Môn học',
    'Tổng số tiết',
    'Sĩ số lớp',
    'Tổng lượt học',
    'Tổng lượt vắng',
    'Tổng lượt có mặt',
    'Tỉ lệ vắng toàn lớp (%)',
    'Tỉ lệ có mặt toàn lớp (%)',
  ];
  const sheetCRows = report.subjectSummary.map((row, idx) => [
    idx + 1,
    row.subject,
    row.totalPeriods,
    row.studentCount,
    row.totalSlots,
    row.totalAbsences,
    row.totalPresent,
    formatPct(row.classAbsenceRate),
    formatPct(row.classAttendanceRate),
  ]);
  const wsC = XLSX.utils.aoa_to_sheet([sheetCHeaders, ...sheetCRows]);
  wsC['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 13 },
    { wch: 11 },
    { wch: 14 },
    { wch: 15 },
    { wch: 17 },
    { wch: 22 },
    { wch: 22 },
  ];
  XLSX.utils.book_append_sheet(wb, wsC, 'Tong hop theo mon');

  const today = new Date();
  const stamp = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(
    today.getDate()
  ).padStart(2, '0')}`;
  const safeSheet = report.sheetName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `Bao_cao_diem_danh_${safeSheet}_${stamp}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}
