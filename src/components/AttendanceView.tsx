import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCheck, Save, Search } from 'lucide-react';
import type { AttendanceValue, PeriodAttendanceData } from '../types/attendance';
import { ConfirmModal } from './ConfirmModal';

interface AttendanceViewProps {
  periodData: PeriodAttendanceData;
  draftValues: Record<number, AttendanceValue>;
  originalValues: Record<number, AttendanceValue>;
  isSaving: boolean;
  onChangeValue: (rowNumber: number, value: 'P' | 'A') => void;
  onMarkAllPresent: () => void;
  onSave: () => Promise<void>;
  onBack: () => void;
  onNotifyNoChanges: () => void;
}

export function AttendanceView({
  periodData,
  draftValues,
  originalValues,
  isSaving,
  onChangeValue,
  onMarkAllPresent,
  onSave,
  onBack,
  onNotifyNoChanges,
}: AttendanceViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  const changedRows = useMemo(() => {
    return periodData.students.filter((stu) => {
      const next = draftValues[stu.rowNumber] ?? '';
      const prev = originalValues[stu.rowNumber] ?? '';
      return next !== prev && (next === 'P' || next === 'A');
    });
  }, [periodData.students, draftValues, originalValues]);

  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let unmarked = 0;
    for (const stu of periodData.students) {
      const v = draftValues[stu.rowNumber] ?? '';
      if (v === 'P') present++;
      else if (v === 'A') absent++;
      else unmarked++;
    }
    return { present, absent, unmarked };
  }, [periodData.students, draftValues]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return periodData.students;
    return periodData.students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.mssv.toLowerCase().includes(q) ||
        s.stt.toLowerCase().includes(q)
    );
  }, [periodData.students, searchQuery]);

  const handleSaveClick = () => {
    if (changedRows.length === 0) {
      onNotifyNoChanges();
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleBackClick = () => {
    if (changedRows.length > 0) {
      setShowBackConfirm(true);
    } else {
      onBack();
    }
  };

  const confirmSave = async () => {
    await onSave();
    setShowSaveConfirm(false);
  };

  const changedPCount = changedRows.filter((s) => draftValues[s.rowNumber] === 'P').length;
  const changedACount = changedRows.filter((s) => draftValues[s.rowNumber] === 'A').length;

  return (
    <section className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-10">
      {/* Contextual Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-600">
              <span className="font-semibold text-blue-800">{periodData.sheetName}</span>
              <span aria-hidden="true">·</span>
              <span>{periodData.dateSlot.formattedLabel}</span>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-slate-800">Tiết {periodData.period}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono text-xs text-slate-500">Cột {periodData.colLetter}</span>
            </div>
            <h1 className="mt-1 text-lg sm:text-xl font-bold text-slate-900 truncate">
              Môn: {periodData.subject}
            </h1>
          </div>

          {/* Desktop Action Toolbar */}
          <div className="hidden sm:flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleBackClick}
              disabled={isSaving}
              className="min-h-[42px] px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              <span>Quay lại</span>
            </button>
            <button
              type="button"
              onClick={onMarkAllPresent}
              disabled={isSaving}
              className="min-h-[42px] px-4 py-2 rounded-xl border border-emerald-700 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="w-4 h-4" aria-hidden="true" />
              <span>Cả lớp có mặt</span>
            </button>
            <button
              type="button"
              onClick={handleSaveClick}
              disabled={isSaving}
              className="min-h-[42px] px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
            >
              <Save className="w-4 h-4" aria-hidden="true" />
              <span>
                {isSaving
                  ? 'Đang lưu...'
                  : changedRows.length > 0
                  ? `Lưu (${changedRows.length})`
                  : 'Lưu'}
              </span>
            </button>
          </div>
        </div>

        {/* Search & Live Counters */}
        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search
              className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm MSSV hoặc Họ tên..."
              className="w-full min-h-[40px] pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm tabular-nums text-slate-600">
            <span>
              Có mặt (P): <strong className="text-emerald-700">{counts.present}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Vắng (A): <strong className="text-red-700">{counts.absent}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Chưa chọn: <strong className="text-slate-800">{counts.unmarked}</strong>
            </span>
            {changedRows.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-blue-700">
                  Chưa lưu: {changedRows.length}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Spreadsheet Table */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 text-xs font-semibold text-slate-700">
              <tr>
                <th className="py-3 px-4 w-16 text-center">STT</th>
                <th className="py-3 px-4 w-36">MSSV</th>
                <th className="py-3 px-4">Họ tên</th>
                <th className="py-3 px-4 w-56 text-center">Trạng thái (P / A)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-500">
                    Không tìm thấy học sinh phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu) => {
                  const val = draftValues[stu.rowNumber] ?? '';
                  const orig = originalValues[stu.rowNumber] ?? '';
                  const isDirty = val !== orig;

                  return (
                    <tr
                      key={stu.rowNumber}
                      className={`even:bg-slate-50/60 hover:bg-blue-50/40 transition-colors ${
                        isDirty ? 'bg-amber-50/40 even:bg-amber-50/50' : ''
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center font-mono text-xs text-slate-600 tabular-nums">
                        {stu.stt}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-xs sm:text-sm text-slate-700 tabular-nums">
                        {stu.mssv}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-900">
                        <span>{stu.fullName}</span>
                        {isDirty && (
                          <span className="ml-2 text-[11px] font-medium text-amber-700">
                            (đã sửa)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => onChangeValue(stu.rowNumber, 'P')}
                            aria-pressed={val === 'P'}
                            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                              val === 'P'
                                ? 'bg-emerald-700 border-emerald-700 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-300'
                            }`}
                          >
                            P · Có mặt
                          </button>
                          <button
                            type="button"
                            onClick={() => onChangeValue(stu.rowNumber, 'A')}
                            aria-pressed={val === 'A'}
                            className={`min-h-[40px] px-4 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                              val === 'A'
                                ? 'bg-red-700 border-red-700 text-white shadow-xs'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-red-50 hover:border-red-300'
                            }`}
                          >
                            A · Vắng
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Touch-Optimized List (1-handed ergonomics) */}
      <div className="sm:hidden bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
        {filteredStudents.length === 0 ? (
          <div className="py-10 px-4 text-center text-sm text-slate-500">
            Không tìm thấy học sinh phù hợp.
          </div>
        ) : (
          filteredStudents.map((stu, idx) => {
            const val = draftValues[stu.rowNumber] ?? '';
            const orig = originalValues[stu.rowNumber] ?? '';
            const isDirty = val !== orig;

            return (
              <div
                key={stu.rowNumber}
                className={`px-3.5 py-3 flex items-center justify-between gap-3 min-h-[64px] ${
                  isDirty
                    ? 'bg-amber-50/50'
                    : idx % 2 === 1
                    ? 'bg-slate-50/60'
                    : 'bg-white'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-slate-900 leading-snug truncate">
                    {stu.fullName}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 font-mono tabular-nums">
                    <span>#{stu.stt}</span>
                    <span aria-hidden="true">·</span>
                    <span>{stu.mssv}</span>
                    {isDirty && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans font-medium text-amber-700">Đã sửa</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Large 48x44px Thumb Targets */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeValue(stu.rowNumber, 'P')}
                    aria-label={`${stu.fullName}: Có mặt (P)`}
                    aria-pressed={val === 'P'}
                    className={`min-h-[44px] min-w-[52px] px-3 rounded-xl text-sm font-bold border transition-colors active:scale-[0.97] ${
                      val === 'P'
                        ? 'bg-emerald-700 border-emerald-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    P
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeValue(stu.rowNumber, 'A')}
                    aria-label={`${stu.fullName}: Vắng (A)`}
                    aria-pressed={val === 'A'}
                    className={`min-h-[44px] min-w-[52px] px-3 rounded-xl text-sm font-bold border transition-colors active:scale-[0.97] ${
                      val === 'A'
                        ? 'bg-red-700 border-red-700 text-white'
                        : 'bg-white border-slate-300 text-slate-700'
                    }`}
                  >
                    A
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Mobile Fixed Bottom Action Bar (<= 15% mobile height) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackClick}
            disabled={isSaving}
            aria-label="Quay lại"
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-medium inline-flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onMarkAllPresent}
            disabled={isSaving}
            className="flex-1 min-h-[44px] px-3 rounded-xl border border-emerald-700 bg-emerald-50 text-emerald-900 text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <CheckCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Cả lớp có mặt</span>
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex-1 min-h-[44px] px-3 rounded-xl bg-blue-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60"
          >
            <Save className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>
              {isSaving
                ? 'Đang lưu...'
                : changedRows.length > 0
                ? `Lưu (${changedRows.length})`
                : 'Lưu'}
            </span>
          </button>
        </div>
      </div>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        open={showSaveConfirm}
        title="Xác nhận lưu điểm danh vào Google Sheets"
        description={`Bạn sắp ghi ${changedRows.length} ô điểm danh đã thay đổi vào bảng tính gốc.`}
        details={[
          `Lớp: ${periodData.sheetName} · ${periodData.dateSlot.formattedLabel}`,
          `Tiết ${periodData.period} (${periodData.subject}) · Cột ${periodData.colLetter}`,
          `Thay đổi: ${changedPCount} ô "P" (Có mặt), ${changedACount} ô "A" (Vắng)`,
        ]}
        confirmLabel="Xác nhận lưu"
        cancelLabel="Hủy"
        loading={isSaving}
        onConfirm={confirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      {/* Unsaved Changes Back Confirmation Modal */}
      <ConfirmModal
        open={showBackConfirm}
        title="Rời khỏi màn hình điểm danh?"
        description={`Bạn đang có ${changedRows.length} thay đổi chưa được lưu vào Google Sheets. Nếu quay lại ngay, các thay đổi này sẽ bị hủy.`}
        confirmLabel="Rời đi không lưu"
        cancelLabel="Ở lại tiếp tục"
        variant="danger"
        onConfirm={() => {
          setShowBackConfirm(false);
          onBack();
        }}
        onCancel={() => setShowBackConfirm(false)}
      />
    </section>
  );
}
