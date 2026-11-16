import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const styles = {
    success: 'bg-emerald-900 text-white border-emerald-700',
    error: 'bg-red-900 text-white border-red-700',
    info: 'bg-slate-900 text-white border-slate-700',
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info,
  }[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-none flex justify-center sm:justify-end"
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg text-sm font-medium w-full ${styles}`}
      >
        <Icon className="w-5 h-5 shrink-0 mt-0.5" aria-hidden="true" />
        <span className="flex-1 leading-snug">{toast.text}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Đóng thông báo"
          className="p-1 -mr-1 -mt-0.5 rounded-lg opacity-80 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
