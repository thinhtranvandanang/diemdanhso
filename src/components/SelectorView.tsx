import { AlertTriangle, ArrowRight, BarChart3, RefreshCw, Settings } from 'lucide-react';
import { columnToLetter } from '../lib/sheets';
import type { ClassContextData, SpreadsheetInfo } from '../types/attendance';

interface SelectorViewProps {
  spreadsheetInfo: SpreadsheetInfo | null;
  selectedClass: string;
  classContext: ClassContextData | null;
  selectedDateIndex: number;
  selectedPeriod: number;
  loadingMeta: boolean;
  loadingClass: boolean;
  loadingPeriod: boolean;
  error: string | null;
  userEmail: string;
  onSelectClass: (sheetName: string) => void;
  onSelectDateIndex: (index: number) => void;
  onSelectPeriod: (period: number) => void;
  onEnterAttendance: () => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onRetry: () => void;
}

export function SelectorView({
  spreadsheetInfo,
  selectedClass,
  classContext,
  selectedDateIndex,
  selectedPeriod,
  loadingMeta,
  loadingClass,
  loadingPeriod,
  error,
  userEmail,
  onSelectClass,
  onSelectDateIndex,
  onSelectPeriod,
  onEnterAttendance,
  onOpenDashboard,
  onOpenSettings,
  onRetry,
}: SelectorViewProps) {
  const sheets = spreadsheetInfo?.sheets ?? [];
  const dates = classContext?.dates ?? [];
  const selectedDate = dates.find((d) => d.index === selectedDateIndex) ?? dates[0] ?? null;

  const currentSubject =
    classContext && selectedDate
      ? classContext.subjectsBySlot[`${selectedDate.index}:${selectedPeriod}`] || 'Chưa ghi môn học'
      : '—';

  const targetColIndex = selectedDate ? 14 + selectedDate.index * 5 + (selectedPeriod - 1) : null;
  const targetColLetter = targetColIndex ? columnToLetter(targetColIndex) : '—';

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Chọn lớp và tiết điểm danh
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          {spreadsheetInfo ? (
            <>
              Bảng tính đang kết nối:{' '}
              <span className="font-medium text-slate-900">{spreadsheetInfo.title}</span>
            </>
          ) : (
            'Đọc trực tiếp danh sách lớp, 45 ngày học và thời khóa biểu từ Google Sheets.'
          )}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-red-900">Không thể tải dữ liệu bảng tính</h2>
              <p className="mt-1 text-sm text-red-800 leading-relaxed">{error}</p>
              <p className="mt-2 text-xs text-red-700">
                Email đang đăng nhập: <span className="font-mono font-medium">{userEmail}</span>
              </p>
              <div className="mt-3.5 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={onRetry}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" aria-hidden="true" />
                  <span>Thử lại</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="min-h-[40px] px-3.5 py-2 rounded-lg border border-red-300 bg-white hover:bg-red-50 text-red-900 text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings className="w-4 h-4" aria-hidden="true" />
                  <span>Kiểm tra Cấu hình</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div className="space-y-5">
          {/* 1. Lớp */}
          <div>
            <label htmlFor="select-class" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Lớp học (Sheet)
            </label>
            <select
              id="select-class"
              value={selectedClass}
              disabled={loadingMeta || sheets.length === 0}
              onChange={(e) => onSelectClass(e.target.value)}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {loadingMeta ? (
                <option value="">Đang tải danh sách lớp...</option>
              ) : sheets.length === 0 ? (
                <option value="">Chưa có dữ liệu lớp</option>
              ) : (
                sheets.map((s) => (
                  <option key={s.sheetId} value={s.title}>
                    {s.title}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 2. Ngày */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="select-date" className="block text-sm font-semibold text-slate-800">
                Ngày điểm danh
              </label>
              {dates.length > 0 && (
                <span className="text-xs text-slate-500 tabular-nums">
                  {dates.length} ngày có sẵn
                </span>
              )}
            </div>
            <select
              id="select-date"
              value={selectedDate ? selectedDate.index : ''}
              disabled={loadingClass || dates.length === 0}
              onChange={(e) => onSelectDateIndex(Number(e.target.value))}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {loadingClass ? (
                <option value="">Đang đọc 45 ngày từ dòng 4...</option>
              ) : dates.length === 0 ? (
                <option value="">Không đọc được danh sách ngày</option>
              ) : (
                dates.map((d) => (
                  <option key={d.index} value={d.index}>
                    {d.formattedLabel}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* 3. Tiết */}
          <div>
            <label htmlFor="select-period" className="block text-sm font-semibold text-slate-800 mb-1.5">
              Tiết học
            </label>
            <select
              id="select-period"
              value={selectedPeriod}
              disabled={loadingClass || !classContext}
              onChange={(e) => onSelectPeriod(Number(e.target.value))}
              className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm sm:text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-100 disabled:text-slate-500"
            >
              {[1, 2, 3, 4, 5].map((p) => {
                const subj =
                  classContext && selectedDate
                    ? classContext.subjectsBySlot[`${selectedDate.index}:${p}`]
                    : '';
                return (
                  <option key={p} value={p}>
                    Tiết {p}
                    {subj ? ` — ${subj}` : ''}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Summary Metadata Strip (unboxed clean typography with separators) */}
        <div className="mt-6 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="block text-xs text-slate-500">Môn học (dòng 7)</span>
            <span className="mt-0.5 block font-semibold text-slate-900 truncate">
              {loadingClass ? 'Đang tải...' : currentSubject}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Sĩ số học sinh</span>
            <span className="mt-0.5 block font-semibold text-slate-900 tabular-nums">
              {loadingClass
                ? 'Đang tải...'
                : classContext
                ? `${classContext.students.length} học sinh`
                : '—'}
            </span>
          </div>
          <div>
            <span className="block text-xs text-slate-500">Tọa độ ghi Google Sheets</span>
            <span className="mt-0.5 block font-mono text-sm font-medium text-slate-700">
              {selectedClass && targetColLetter !== '—'
                ? `${selectedClass}!${targetColLetter}9+`
                : '—'}
            </span>
          </div>
        </div>

        {/* Primary & Secondary Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={loadingMeta || loadingClass || loadingPeriod || !classContext || !selectedDate}
            onClick={onEnterAttendance}
            className="flex-1 min-h-[48px] px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>{loadingPeriod ? 'Đang mở danh sách...' : 'Vào điểm danh'}</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            disabled={loadingMeta || !selectedClass}
            onClick={onOpenDashboard}
            className="min-h-[48px] px-4 py-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            <BarChart3 className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <span>Dashboard lớp</span>
          </button>
        </div>
      </div>
    </section>
  );
}
