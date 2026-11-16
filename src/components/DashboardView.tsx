import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Download, RefreshCw, Search } from 'lucide-react';
import { exportDashboardToExcel } from '../lib/exportExcel';
import type { DashboardReportData, SpreadsheetInfo } from '../types/attendance';

interface DashboardViewProps {
  spreadsheetInfo: SpreadsheetInfo | null;
  selectedClass: string;
  report: DashboardReportData | null;
  loading: boolean;
  error: string | null;
  onSelectClass: (sheetName: string) => void;
  onGenerateReport: (sheetName: string) => void;
  onExportSuccess: (fileName: string) => void;
}

type ReportTab = 'students' | 'absences' | 'subjects';
type StudentRateMode = 'attendance' | 'absence';

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function DashboardView({
  spreadsheetInfo,
  selectedClass,
  report,
  loading,
  error,
  onSelectClass,
  onGenerateReport,
  onExportSuccess,
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>('students');
  const [rateMode, setRateMode] = useState<StudentRateMode>('attendance');
  const [studentQuery, setStudentQuery] = useState('');
  const [absenceQuery, setAbsenceQuery] = useState('');
  const [absenceSubjectFilter, setAbsenceSubjectFilter] = useState('ALL');
  const [absenceDateFilter, setAbsenceDateFilter] = useState('ALL');

  const sheets = spreadsheetInfo?.sheets ?? [];
  const isCurrentClassLoaded = report && report.sheetName === selectedClass;

  const filteredStudentReports = useMemo(() => {
    if (!report) return [];
    const q = studentQuery.trim().toLowerCase();
    if (!q) return report.studentReports;
    return report.studentReports.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.mssv.toLowerCase().includes(q) ||
        s.stt.toLowerCase().includes(q)
    );
  }, [report, studentQuery]);

  const uniqueAbsenceDates = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, string>();
    for (const row of report.absenceLog) {
      if (!map.has(row.isoDate)) {
        map.set(row.isoDate, row.dateLabel);
      }
    }
    return Array.from(map.entries());
  }, [report]);

  const filteredAbsenceLog = useMemo(() => {
    if (!report) return [];
    const q = absenceQuery.trim().toLowerCase();
    return report.absenceLog.filter((row) => {
      if (absenceSubjectFilter !== 'ALL' && row.subject !== absenceSubjectFilter) return false;
      if (absenceDateFilter !== 'ALL' && row.isoDate !== absenceDateFilter) return false;
      if (
        q &&
        !row.fullName.toLowerCase().includes(q) &&
        !row.mssv.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report, absenceQuery, absenceSubjectFilter, absenceDateFilter]);

  const handleExport = () => {
    if (!report) return;
    const fileName = exportDashboardToExcel(report);
    onExportSuccess(fileName);
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24 md:pb-12">
      {/* Top Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Dashboard Tổng hợp lớp
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isCurrentClassLoaded
              ? `Lớp ${report.sheetName} · Cập nhật lúc ${report.generatedAt}`
              : 'Chọn lớp và bấm "Tổng hợp" để đọc dữ liệu chuyên cần từ Google Sheets.'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <select
            aria-label="Chọn lớp để tổng hợp"
            value={selectedClass}
            disabled={loading || sheets.length === 0}
            onChange={(e) => onSelectClass(e.target.value)}
            className="min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            {sheets.length === 0 ? (
              <option value="">Đang tải lớp...</option>
            ) : (
              sheets.map((s) => (
                <option key={s.sheetId} value={s.title}>
                  Lớp {s.title}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            disabled={loading || !selectedClass}
            onClick={() => onGenerateReport(selectedClass)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{loading ? 'Đang tổng hợp...' : 'Tổng hợp'}</span>
          </button>

          <button
            type="button"
            disabled={!isCurrentClassLoaded || loading}
            onClick={handleExport}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <span>Export Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-800">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-semibold text-red-900">Lỗi khi tổng hợp dữ liệu</p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {!isCurrentClassLoaded && !loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <BarChart3 className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">
            Chưa tải báo cáo cho lớp {selectedClass || 'đã chọn'}
          </h2>
          <p className="mt-1.5 text-sm text-slate-600 max-w-md mx-auto">
            Bấm nút <strong>Tổng hợp</strong> để hệ thống đọc dữ liệu điểm danh từ Google Sheets và
            tính toán 3 báo cáo chi tiết (chỉ đọc, không ghi vào file gốc).
          </p>
          <button
            type="button"
            disabled={!selectedClass}
            onClick={() => onGenerateReport(selectedClass)}
            className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            <span>Tổng hợp ngay</span>
          </button>
        </div>
      )}

      {loading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <RefreshCw className="w-7 h-7 text-blue-700 animate-spin mx-auto" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Đang đọc toàn bộ dữ liệu điểm danh lớp {selectedClass}...
          </p>
        </div>
      )}

      {isCurrentClassLoaded && !loading && (
        <div className="space-y-6">
          {/* 4-column KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-2xl divide-y lg:divide-y-0 lg:divide-x divide-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500">Sĩ số học sinh</span>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {report.studentCount}
              </p>
            </div>
            <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
              <span className="text-xs font-medium text-slate-500">Ngày / Tiết học</span>
              <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">
                {report.dateCount} <span className="text-sm font-normal text-slate-500">ngày</span> ·{' '}
                {report.totalPeriodsInSchedule}{' '}
                <span className="text-sm font-normal text-slate-500">tiết</span>
              </p>
            </div>
            <div className="p-4 sm:p-5">
              <span className="text-xs font-medium text-slate-500">Chuyên cần toàn lớp</span>
              <p className="mt-1 text-2xl font-bold text-emerald-700 tabular-nums">
                {pct(report.overallAttendanceRate)}
              </p>
            </div>
            <div className="p-4 sm:p-5 border-l border-slate-200 lg:border-l-0">
              <span className="text-xs font-medium text-slate-500">Tổng lượt vắng (A)</span>
              <p className="mt-1 text-2xl font-bold text-red-700 tabular-nums">
                {report.totalAbsencesAll}
              </p>
            </div>
          </div>

          {/* 3-Report Segmented Tabs */}
          <div className="flex overflow-x-auto gap-1 p-1 bg-slate-200/70 rounded-xl w-full sm:w-fit">
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'students'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              (a) Tỉ lệ chuyên cần học sinh
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('absences')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'absences'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              (b) Vắng theo ngày ({report.absenceLog.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('subjects')}
              className={`px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                activeTab === 'subjects'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              (c) Tổng hợp theo môn ({report.subjectSummary.length})
            </button>
          </div>

          {/* Report (a): Tỉ lệ chuyên cần từng học sinh */}
          {activeTab === 'students' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={studentQuery}
                    onChange={(e) => setStudentQuery(e.target.value)}
                    placeholder="Lọc theo MSSV hoặc Họ tên..."
                    className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRateMode('attendance')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                      rateMode === 'attendance'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tỉ lệ có mặt (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRateMode('absence')}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer ${
                      rateMode === 'absence'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tỉ lệ vắng (%)
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-20 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="py-3 px-3 sticky left-0 z-30 bg-slate-100 w-12 text-center border-r border-slate-200">
                        STT
                      </th>
                      <th className="py-3 px-3 sticky left-12 z-30 bg-slate-100 min-w-[105px] border-r border-slate-200">
                        MSSV
                      </th>
                      <th className="py-3 px-3 min-w-[180px] border-r border-slate-200">Họ tên</th>
                      {report.subjects.map((subj) => (
                        <th key={subj} className="py-3 px-3 min-w-[115px] text-right">
                          {subj}
                        </th>
                      ))}
                      <th className="py-3 px-3 min-w-[95px] text-right border-l border-slate-200">
                        Tổng vắng
                      </th>
                      <th className="py-3 px-3 min-w-[110px] text-right">
                        {rateMode === 'attendance' ? 'Chuyên cần' : 'Tỉ lệ vắng'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudentReports.map((stu, idx) => {
                      const rowBg = idx % 2 === 1 ? 'bg-slate-50' : 'bg-white';
                      const totalRate =
                        rateMode === 'attendance' ? stu.totalAttendanceRate : stu.totalAbsenceRate;

                      return (
                        <tr key={stu.rowNumber} className={`${rowBg} hover:bg-blue-50/40`}>
                          <td
                            className={`py-2.5 px-3 sticky left-0 z-10 ${rowBg} text-center font-mono text-xs text-slate-600 tabular-nums border-r border-slate-100`}
                          >
                            {stu.stt}
                          </td>
                          <td
                            className={`py-2.5 px-3 sticky left-12 z-10 ${rowBg} font-mono text-xs text-slate-700 tabular-nums border-r border-slate-100`}
                          >
                            {stu.mssv}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-900 border-r border-slate-100 whitespace-nowrap">
                            {stu.fullName}
                          </td>
                          {report.subjects.map((subj) => {
                            const stat = stu.bySubject[subj];
                            if (!stat) {
                              return (
                                <td key={subj} className="py-2.5 px-3 text-right text-slate-400">
                                  —
                                </td>
                              );
                            }
                            const valueRate =
                              rateMode === 'attendance' ? stat.attendanceRate : stat.absenceRate;
                            const isHighAbsence = stat.absenceRate >= 0.2;

                            return (
                              <td
                                key={subj}
                                className="py-2.5 px-3 text-right font-mono tabular-nums"
                                title={
                                  stat.sheetReportedValue
                                    ? `Giá trị cột D-M trong file: ${stat.sheetReportedValue}`
                                    : undefined
                                }
                              >
                                <div
                                  className={`font-medium ${
                                    isHighAbsence ? 'text-red-700' : 'text-slate-800'
                                  }`}
                                >
                                  {pct(valueRate)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {stat.absentCount}/{stat.totalPeriods}
                                </div>
                              </td>
                            );
                          })}
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-slate-800 border-l border-slate-100">
                            {stu.totalAbsent}/{stu.totalPeriods}
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-mono tabular-nums font-semibold ${
                              stu.totalAbsenceRate >= 0.2
                                ? 'text-red-700'
                                : 'text-emerald-700'
                            }`}
                          >
                            {pct(totalRate)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report (b): Danh sách vắng theo ngày */}
          {activeTab === 'absences' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="relative">
                  <Search
                    className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={absenceQuery}
                    onChange={(e) => setAbsenceQuery(e.target.value)}
                    placeholder="Tìm MSSV hoặc Họ tên..."
                    className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <select
                  aria-label="Lọc theo ngày"
                  value={absenceDateFilter}
                  onChange={(e) => setAbsenceDateFilter(e.target.value)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">Tất cả các ngày ({uniqueAbsenceDates.length})</option>
                  {uniqueAbsenceDates.map(([iso, label]) => (
                    <option key={iso} value={iso}>
                      {label}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Lọc theo môn học"
                  value={absenceSubjectFilter}
                  onChange={(e) => setAbsenceSubjectFilter(e.target.value)}
                  className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="ALL">Tất cả môn học</option>
                  {report.subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Ngày</th>
                      <th className="py-3 px-4 w-20 text-center">Tiết</th>
                      <th className="py-3 px-4">Môn học</th>
                      <th className="py-3 px-4 w-32">MSSV</th>
                      <th className="py-3 px-4">Họ tên</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAbsenceLog.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          Không có lượt vắng (A) nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredAbsenceLog.map((row, idx) => (
                        <tr
                          key={`${row.isoDate}-${row.period}-${row.mssv}-${idx}`}
                          className="even:bg-slate-50/70 hover:bg-blue-50/40"
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap text-slate-800 tabular-nums">
                            {row.dateLabel}
                          </td>
                          <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-700 tabular-nums">
                            Tiết {row.period}
                          </td>
                          <td className="py-2.5 px-4 text-slate-800">{row.subject}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                            {row.mssv}
                          </td>
                          <td className="py-2.5 px-4 font-medium text-slate-900">{row.fullName}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Report (c): Tổng hợp theo môn */}
          {activeTab === 'subjects' && (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Môn học</th>
                      <th className="py-3 px-4 text-right">Tổng tiết (45 ngày)</th>
                      <th className="py-3 px-4 text-right">Tổng lượt học</th>
                      <th className="py-3 px-4 text-right">Tổng lượt vắng (A)</th>
                      <th className="py-3 px-4 text-right">Tỉ lệ vắng toàn lớp</th>
                      <th className="py-3 px-4 text-right">Tỉ lệ có mặt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.subjectSummary.map((row) => (
                      <tr key={row.subject} className="even:bg-slate-50/70 hover:bg-blue-50/40">
                        <td className="py-3 px-4 font-semibold text-slate-900">{row.subject}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.totalPeriods}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                          {row.totalSlots}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-red-700">
                          {row.totalAbsences}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-red-700">
                          {pct(row.classAbsenceRate)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700">
                          {pct(row.classAttendanceRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
