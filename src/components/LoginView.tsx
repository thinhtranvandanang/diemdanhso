import { AlertCircle } from 'lucide-react';
import type { AppUser } from '../types/attendance';

interface LoginViewProps {
  existingUser: AppUser | null;
  isLoggingIn: boolean;
  error: string | null;
  onLogin: () => void;
}

export function LoginView({ existingUser, isLoggingIn, error, onLogin }: LoginViewProps) {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center px-4 py-10">
      <div className="w-full max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="border-b border-slate-100 pb-5">
          <p className="text-xs font-medium text-blue-700 tracking-wide">
            Hệ thống quản lý chuyên cần
          </p>
          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Sổ Điểm Danh Số
          </h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            Điểm danh học sinh theo từng tiết học, lưu trực tiếp vào Google Sheets gốc và tổng hợp
            báo cáo chuyên cần cấp lớp.
          </p>
        </div>

        {existingUser && (
          <div className="mt-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs sm:text-sm text-amber-900 leading-relaxed">
            Phiên làm việc với Google Sheets cho tài khoản{' '}
            <span className="font-semibold">{existingUser.email}</span> cần được xác thực lại để
            tiếp tục đọc và ghi bảng tính.
          </div>
        )}

        {error && (
          <div className="mt-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs sm:text-sm text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-6">
          <button
            type="button"
            onClick={onLogin}
            disabled={isLoggingIn}
            className="gsi-material-button w-full"
          >
            <div className="gsi-material-button-state" />
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  style={{ display: 'block' }}
                  aria-hidden="true"
                >
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                  <path fill="none" d="M0 0h48v48H0z" />
                </svg>
              </div>
              <span className="gsi-material-button-contents">
                {isLoggingIn ? 'Đang kết nối Google...' : 'Đăng nhập bằng Google'}
              </span>
            </div>
          </button>
        </div>

        <ul className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600 leading-relaxed">
          <li>1. Sử dụng tài khoản Gmail đã được chia sẻ quyền Editor trên file Google Sheets.</li>
          <li>2. Dữ liệu điểm danh (P/A) ghi thẳng vào vùng tiết học, không làm thay đổi công thức.</li>
          <li>3. Hỗ trợ tổng hợp 3 báo cáo chuyên cần và tải xuống tệp Excel (.xlsx).</li>
        </ul>
      </div>
    </main>
  );
}
