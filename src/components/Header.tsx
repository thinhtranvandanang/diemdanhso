import { BarChart3, ClipboardCheck, LogOut, Settings } from 'lucide-react';
import type { AppUser } from '../types/attendance';

export type ActiveTab = 'attendance' | 'dashboard' | 'settings';

interface HeaderProps {
  user: AppUser;
  activeTab: ActiveTab;
  hideMobileBottomNav?: boolean;
  onNavigate: (tab: ActiveTab) => void;
  onLogout: () => void;
}

export function Header({
  user,
  activeTab,
  hideMobileBottomNav = false,
  onNavigate,
  onLogout,
}: HeaderProps) {
  const navItems: { id: ActiveTab; label: string; icon: typeof ClipboardCheck }[] = [
    { id: 'attendance', label: 'Điểm danh', icon: ClipboardCheck },
    { id: 'dashboard', label: 'Tổng hợp', icon: BarChart3 },
    { id: 'settings', label: 'Cấu hình', icon: Settings },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-4 md:gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => onNavigate('attendance')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
          >
            Sổ Điểm Danh Số
          </button>

          {/* Zone 2: Clean single-line navigation links */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden md:flex items-center gap-7 text-sm font-medium"
          >
            {navItems.map((item) => {
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  className={`py-2 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'border-blue-700 text-blue-800 font-semibold'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: User email & primary logout action */}
          <div className="flex items-center gap-3 shrink-0">
            <span
              title={user.email}
              className="hidden sm:inline-block text-xs text-slate-600 truncate max-w-[200px]"
            >
              {user.email || user.displayName}
            </span>
            <button
              type="button"
              onClick={onLogout}
              className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation bar (hidden during active attendance sheet so sticky save bar has room) */}
      {!hideMobileBottomNav && (
        <nav
          aria-label="Điều hướng di động"
          className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-3 h-14"
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active ? 'text-blue-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                <span className="whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </>
  );
}
