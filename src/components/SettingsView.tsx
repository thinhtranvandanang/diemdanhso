import { useState } from 'react';
import { AlertTriangle, CheckCircle2, PlugZap, RotateCcw, Save } from 'lucide-react';
import { getAccessToken } from '../lib/auth';
import { fetchSpreadsheetMetadata, SheetsApiError } from '../lib/sheets';
import { DEFAULT_SPREADSHEET_ID, type SpreadsheetInfo } from '../types/attendance';

interface SettingsViewProps {
  currentSpreadsheetId: string;
  userEmail: string;
  onSaveSpreadsheetId: (newId: string, verifiedInfo?: SpreadsheetInfo) => void;
  onTokenExpired: () => void;
}

export function SettingsView({
  currentSpreadsheetId,
  userEmail,
  onSaveSpreadsheetId,
  onTokenExpired,
}: SettingsViewProps) {
  const [inputId, setInputId] = useState(currentSpreadsheetId);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SpreadsheetInfo | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const handleCheckConnection = async () => {
    const trimmed = inputId.trim();
    if (!trimmed) {
      setTestError('Vui lòng nhập Spreadsheet ID.');
      setTestResult(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      onTokenExpired();
      return;
    }

    setTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const info = await fetchSpreadsheetMetadata(trimmed, token);
      setTestResult(info);
    } catch (err) {
      if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
        onTokenExpired();
        return;
      }
      setTestError(
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới bảng tính. Vui lòng kiểm tra lại ID và quyền truy cập.'
      );
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const trimmed = inputId.trim();
    if (!trimmed) {
      setTestError('Spreadsheet ID không được để trống.');
      return;
    }
    onSaveSpreadsheetId(
      trimmed,
      testResult && testResult.spreadsheetId === trimmed ? testResult : undefined
    );
  };

  const handleResetDefault = () => {
    setInputId(DEFAULT_SPREADSHEET_ID);
    setTestResult(null);
    setTestError(null);
  };

  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-24 md:pb-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Cấu hình nguồn dữ liệu
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Nhập hoặc thay đổi Google Spreadsheet ID dùng chung cho toàn bộ màn hình điểm danh và tổng
          hợp.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label htmlFor="spreadsheet-id" className="block text-sm font-semibold text-slate-800">
              Google Spreadsheet ID
            </label>
            <button
              type="button"
              onClick={handleResetDefault}
              className="text-xs font-medium text-blue-700 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dùng ID mặc định</span>
            </button>
          </div>
          <input
            id="spreadsheet-id"
            type="text"
            value={inputId}
            onChange={(e) => {
              setInputId(e.target.value);
              setTestResult(null);
              setTestError(null);
            }}
            placeholder={DEFAULT_SPREADSHEET_ID}
            className="w-full min-h-[46px] px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            ID mặc định:{' '}
            <span className="font-mono text-slate-700 break-all">{DEFAULT_SPREADSHEET_ID}</span>
          </p>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={testing}
            className="min-h-[44px] px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <PlugZap className="w-4 h-4 text-slate-600" aria-hidden="true" />
            <span>{testing ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={testing}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-60"
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            <span>Lưu cấu hình</span>
          </button>
        </div>

        {testError && (
          <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold text-red-900">Kết nối thất bại</p>
              <p className="mt-0.5 leading-relaxed">{testError}</p>
              <p className="mt-2 text-xs text-red-700">
                Email hiện tại: <span className="font-mono font-medium">{userEmail}</span>
              </p>
            </div>
          </div>
        )}

        {testResult && (
          <div className="mt-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-900">
            <div className="flex items-start gap-2.5">
              <CheckCircle2
                className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold">Kết nối thành công: {testResult.title}</p>
                <p className="mt-1 text-xs text-emerald-800">
                  Tìm thấy {testResult.sheets.length} sheet (tab) trong bảng tính:
                </p>
                <ul className="mt-2 space-y-1 text-xs font-mono text-emerald-900">
                  {testResult.sheets.map((s) => (
                    <li key={s.sheetId}>
                      • {s.title} ({s.rowCount} dòng × {s.columnCount} cột)
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 text-xs text-slate-600 space-y-1.5 leading-relaxed">
          <p className="font-semibold text-slate-800">Lưu ý phân quyền file Google Sheets:</p>
          <p>
            Admin cần chia sẻ quyền <strong>Editor</strong> file Google Sheets cho từng email giáo
            viên (hoặc chia sẻ cho toàn domain trường học). Ứng dụng ghi dữ liệu bằng quyền OAuth
            của chính người đang đăng nhập và không tự động thay đổi quyền chia sẻ file.
          </p>
        </div>
      </div>
    </section>
  );
}
