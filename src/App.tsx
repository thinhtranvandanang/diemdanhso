import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AttendanceView } from './components/AttendanceView';
import { ConfirmModal } from './components/ConfirmModal';
import { DashboardView } from './components/DashboardView';
import { ActiveTab, Header } from './components/Header';
import { LoginView } from './components/LoginView';
import { SelectorView } from './components/SelectorView';
import { SettingsView } from './components/SettingsView';
import { Toast, ToastMessage } from './components/Toast';
import {
  clearAccessToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './lib/auth';
import {
  AttendanceCellChange,
  fetchClassContext,
  fetchFullSheetForDashboard,
  fetchPeriodAttendance,
  fetchSpreadsheetMetadata,
  saveAttendanceBatch,
  SheetsApiError,
} from './lib/sheets';
import {
  AppUser,
  AttendanceValue,
  ClassContextData,
  DashboardReportData,
  DEFAULT_SPREADSHEET_ID,
  PeriodAttendanceData,
  SPREADSHEET_CONFIG_STORAGE_KEY,
  SpreadsheetInfo,
} from './types/attendance';

function getInitialTabFromPath(): ActiveTab {
  const path = window.location.pathname;
  if (path === '/settings') return 'settings';
  if (path === '/dashboard') return 'dashboard';
  return 'attendance';
}

function loadSavedSpreadsheetId(): string {
  try {
    const saved = window.localStorage.getItem(SPREADSHEET_CONFIG_STORAGE_KEY);
    return saved && saved.trim() ? saved.trim() : DEFAULT_SPREADSHEET_ID;
  } catch {
    return DEFAULT_SPREADSHEET_ID;
  }
}

export default function App() {
  // Auth state
  const [authInitialized, setAuthInitialized] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);
  const [existingUser, setExistingUser] = useState<AppUser | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showReauthModal, setShowReauthModal] = useState(false);

  // Navigation & Config state
  const [activeTab, setActiveTab] = useState<ActiveTab>(getInitialTabFromPath);
  const [pendingTab, setPendingTab] = useState<ActiveTab | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>(loadSavedSpreadsheetId);

  // Toast notifications
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = useCallback((type: ToastMessage['type'], text: string) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToast({ id: Date.now(), type, text });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4500);
  }, []);

  // Spreadsheet & Class Selection state
  const [spreadsheetInfo, setSpreadsheetInfo] = useState<SpreadsheetInfo | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [classContext, setClassContext] = useState<ClassContextData | null>(null);
  const [loadingClass, setLoadingClass] = useState(false);

  const [selectedDateIndex, setSelectedDateIndex] = useState<number>(0);
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1);

  // Active Attendance Screen state
  const [loadingPeriod, setLoadingPeriod] = useState(false);
  const [periodData, setPeriodData] = useState<PeriodAttendanceData | null>(null);
  const [originalValues, setOriginalValues] = useState<Record<number, AttendanceValue>>({});
  const [draftValues, setDraftValues] = useState<Record<number, AttendanceValue>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Dashboard state
  const [dashboardReport, setDashboardReport] = useState<DashboardReportData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const hasUnsavedAttendanceChanges = useMemo(() => {
    if (!periodData) return false;
    return periodData.students.some((stu) => {
      const next = draftValues[stu.rowNumber] ?? '';
      const prev = originalValues[stu.rowNumber] ?? '';
      return next !== prev && (next === 'P' || next === 'A');
    });
  }, [periodData, draftValues, originalValues]);

  // Sync browser back/forward history
  useEffect(() => {
    const onPopState = () => {
      setActiveTab(getInitialTabFromPath());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigateToTab = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    const targetPath = tab === 'settings' ? '/settings' : tab === 'dashboard' ? '/dashboard' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, []);

  const handleTokenExpired = useCallback(() => {
    clearAccessToken();
    if (periodData) {
      // Preserve in-progress attendance edits and prompt re-auth in modal
      setShowReauthModal(true);
    } else {
      setNeedsAuth(true);
      setLoginError('Phiên Google Sheets đã hết hạn. Vui lòng đăng nhập lại bằng Google.');
    }
  }, [periodData]);

  // Load spreadsheet metadata & initial class
  const loadSpreadsheetAndClass = useCallback(
    async (targetId: string, preferredClass?: string, preloadedInfo?: SpreadsheetInfo) => {
      const token = getAccessToken();
      if (!token) {
        handleTokenExpired();
        return;
      }

      setLoadingMeta(true);
      setMetaError(null);

      try {
        const info = preloadedInfo ?? (await fetchSpreadsheetMetadata(targetId, token));
        setSpreadsheetInfo(info);

        const sheets = info.sheets;
        if (sheets.length === 0) {
          setMetaError('Bảng tính không có sheet (tab) nào.');
          setSelectedClass('');
          setClassContext(null);
          return;
        }

        const nextClass =
          preferredClass && sheets.some((s) => s.title === preferredClass)
            ? preferredClass
            : sheets[0].title;

        setSelectedClass(nextClass);
        setLoadingClass(true);
        try {
          const ctx = await fetchClassContext(info.spreadsheetId, nextClass, token, info);
          setClassContext(ctx);
          if (ctx.dates.length > 0) {
            setSelectedDateIndex(ctx.dates[0].index);
          }
        } finally {
          setLoadingClass(false);
        }
      } catch (err) {
        if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
          handleTokenExpired();
          return;
        }
        setMetaError(
          err instanceof Error
            ? err.message
            : 'Không thể đọc thông tin bảng tính Google Sheets.'
        );
      } finally {
        setLoadingMeta(false);
      }
    },
    [handleTokenExpired]
  );

  // Initialize Firebase Auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setExistingUser(null);
        setNeedsAuth(false);
        setLoginError(null);
        setAuthInitialized(true);
      },
      (prevUser) => {
        setExistingUser(prevUser);
        setNeedsAuth(true);
        setAuthInitialized(true);
      }
    );
    return () => unsubscribe();
  }, []);

  // Trigger initial load once authenticated with an active token
  useEffect(() => {
    if (!needsAuth && user && getAccessToken() && !spreadsheetInfo && !loadingMeta && !metaError) {
      void loadSpreadsheetAndClass(spreadsheetId);
    }
  }, [needsAuth, user, spreadsheetId, spreadsheetInfo, loadingMeta, metaError, loadSpreadsheetAndClass]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setExistingUser(null);
        setNeedsAuth(false);
        setShowReauthModal(false);
        showToast('success', `Đã đăng nhập: ${res.user.email}`);
        if (!spreadsheetInfo) {
          void loadSpreadsheetAndClass(spreadsheetId);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes('popup-closed-by-user')
          ? 'Bạn đã đóng cửa sổ đăng nhập Google.'
          : err instanceof Error
          ? err.message
          : 'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setLoginError(msg);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setExistingUser(null);
    setNeedsAuth(true);
    setShowReauthModal(false);
    setSpreadsheetInfo(null);
    setClassContext(null);
    setPeriodData(null);
    setDashboardReport(null);
    setMetaError(null);
  };

  const handleSelectClass = async (sheetName: string) => {
    setSelectedClass(sheetName);
    setPeriodData(null);
    const token = getAccessToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    setLoadingClass(true);
    setMetaError(null);
    try {
      const ctx = await fetchClassContext(
        spreadsheetId,
        sheetName,
        token,
        spreadsheetInfo ?? undefined
      );
      setClassContext(ctx);
      if (ctx.dates.length > 0) {
        setSelectedDateIndex(ctx.dates[0].index);
      }
    } catch (err) {
      if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
        handleTokenExpired();
        return;
      }
      setMetaError(err instanceof Error ? err.message : 'Không thể đọc dữ liệu lớp.');
    } finally {
      setLoadingClass(false);
    }
  };

  const handleEnterAttendance = async () => {
    if (!classContext) return;
    const dateSlot = classContext.dates.find((d) => d.index === selectedDateIndex);
    if (!dateSlot) return;

    const token = getAccessToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    setLoadingPeriod(true);
    try {
      const data = await fetchPeriodAttendance(
        spreadsheetId,
        classContext,
        dateSlot,
        selectedPeriod,
        token
      );
      setPeriodData(data);
      setOriginalValues({ ...data.values });
      setDraftValues({ ...data.values });
    } catch (err) {
      if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
        handleTokenExpired();
        return;
      }
      showToast(
        'error',
        err instanceof Error ? err.message : 'Không thể tải danh sách điểm danh.'
      );
    } finally {
      setLoadingPeriod(false);
    }
  };

  const handleChangeAttendanceValue = (rowNumber: number, value: 'P' | 'A') => {
    setDraftValues((prev) => ({
      ...prev,
      [rowNumber]: value,
    }));
  };

  const handleMarkAllPresent = () => {
    if (!periodData) return;
    setDraftValues((prev) => {
      const next = { ...prev };
      for (const stu of periodData.students) {
        next[stu.rowNumber] = 'P';
      }
      return next;
    });
  };

  const handleSaveAttendance = async () => {
    if (!periodData) return;
    const token = getAccessToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    const changes: AttendanceCellChange[] = [];
    for (const stu of periodData.students) {
      const next = draftValues[stu.rowNumber] ?? '';
      const prev = originalValues[stu.rowNumber] ?? '';
      if (next !== prev && (next === 'P' || next === 'A')) {
        changes.push({ rowNumber: stu.rowNumber, value: next });
      }
    }

    if (changes.length === 0) {
      showToast('info', 'Không có thay đổi nào cần lưu.');
      return;
    }

    setIsSaving(true);
    try {
      await saveAttendanceBatch(spreadsheetId, periodData, changes, token);
      setOriginalValues({ ...draftValues });
      showToast('success', 'Đã lưu');
    } catch (err) {
      if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
        handleTokenExpired();
        return;
      }
      showToast(
        'error',
        err instanceof Error
          ? err.message
          : 'Lỗi khi lưu điểm danh. Dữ liệu trên màn hình vẫn được giữ để bạn thử lại.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDashboard = async (sheetName: string) => {
    const token = getAccessToken();
    if (!token) {
      handleTokenExpired();
      return;
    }

    setLoadingDashboard(true);
    setDashboardError(null);
    try {
      const report = await fetchFullSheetForDashboard(
        spreadsheetId,
        sheetName,
        token,
        spreadsheetInfo ?? undefined
      );
      setDashboardReport(report);
      showToast('success', `Đã tổng hợp báo cáo lớp ${sheetName}.`);
    } catch (err) {
      if (err instanceof SheetsApiError && err.code === 'TOKEN_EXPIRED') {
        handleTokenExpired();
        return;
      }
      const message =
        err instanceof Error ? err.message : 'Không thể tổng hợp dữ liệu từ Google Sheets.';
      setDashboardError(message);
      showToast('error', message);
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleSaveSpreadsheetConfig = (newId: string, verifiedInfo?: SpreadsheetInfo) => {
    try {
      window.localStorage.setItem(SPREADSHEET_CONFIG_STORAGE_KEY, newId);
    } catch {
      // ignore storage quota errors
    }
    setSpreadsheetId(newId);
    setSpreadsheetInfo(null);
    setClassContext(null);
    setPeriodData(null);
    setDashboardReport(null);
    setMetaError(null);
    showToast('success', 'Đã lưu cấu hình Spreadsheet ID.');
    void loadSpreadsheetAndClass(newId, undefined, verifiedInfo);
  };

  const handleHeaderNavigate = (tab: ActiveTab) => {
    if (activeTab === 'attendance' && periodData && hasUnsavedAttendanceChanges) {
      setPendingTab(tab);
      return;
    }
    if (tab !== 'attendance') {
      setPeriodData(null);
    }
    navigateToTab(tab);
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Đang khởi tạo phiên làm việc...
      </div>
    );
  }

  if (needsAuth || !user) {
    return (
      <>
        <Toast toast={toast} onDismiss={() => setToast(null)} />
        <LoginView
          existingUser={existingUser}
          isLoggingIn={isLoggingIn}
          error={loginError}
          onLogin={handleLogin}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      <Header
        user={user}
        activeTab={activeTab}
        hideMobileBottomNav={activeTab === 'attendance' && periodData !== null}
        onNavigate={handleHeaderNavigate}
        onLogout={handleLogout}
      />

      <main>
        {activeTab === 'attendance' && !periodData && (
          <SelectorView
            spreadsheetInfo={spreadsheetInfo}
            selectedClass={selectedClass}
            classContext={classContext}
            selectedDateIndex={selectedDateIndex}
            selectedPeriod={selectedPeriod}
            loadingMeta={loadingMeta}
            loadingClass={loadingClass}
            loadingPeriod={loadingPeriod}
            error={metaError}
            userEmail={user.email}
            onSelectClass={handleSelectClass}
            onSelectDateIndex={setSelectedDateIndex}
            onSelectPeriod={setSelectedPeriod}
            onEnterAttendance={handleEnterAttendance}
            onOpenDashboard={() => navigateToTab('dashboard')}
            onOpenSettings={() => navigateToTab('settings')}
            onRetry={() => loadSpreadsheetAndClass(spreadsheetId, selectedClass)}
          />
        )}

        {activeTab === 'attendance' && periodData && (
          <AttendanceView
            periodData={periodData}
            draftValues={draftValues}
            originalValues={originalValues}
            isSaving={isSaving}
            onChangeValue={handleChangeAttendanceValue}
            onMarkAllPresent={handleMarkAllPresent}
            onSave={handleSaveAttendance}
            onBack={() => setPeriodData(null)}
            onNotifyNoChanges={() => showToast('info', 'Không có thay đổi nào cần lưu.')}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            spreadsheetInfo={spreadsheetInfo}
            selectedClass={selectedClass}
            report={dashboardReport}
            loading={loadingDashboard}
            error={dashboardError}
            onSelectClass={(cls) => {
              setSelectedClass(cls);
              setDashboardError(null);
            }}
            onGenerateReport={handleGenerateDashboard}
            onExportSuccess={(fileName) =>
              showToast('success', `Đã xuất file Excel: ${fileName}`)
            }
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            currentSpreadsheetId={spreadsheetId}
            userEmail={user.email}
            onSaveSpreadsheetId={handleSaveSpreadsheetConfig}
            onTokenExpired={handleTokenExpired}
          />
        )}
      </main>

      {/* Confirm leaving attendance view via header navigation with unsaved edits */}
      <ConfirmModal
        open={pendingTab !== null}
        title="Rời khỏi màn hình điểm danh?"
        description="Bạn đang có thay đổi điểm danh chưa lưu. Chuyển sang mục khác sẽ hủy các thay đổi chưa lưu."
        confirmLabel="Chuyển trang không lưu"
        cancelLabel="Ở lại tiếp tục"
        variant="danger"
        onConfirm={() => {
          const target = pendingTab;
          setPendingTab(null);
          setPeriodData(null);
          if (target) navigateToTab(target);
        }}
        onCancel={() => setPendingTab(null)}
      />

      {/* Token expiry recovery modal preserving unsaved attendance edits */}
      <ConfirmModal
        open={showReauthModal}
        title="Phiên Google Sheets đã hết hạn"
        description="Vui lòng đăng nhập lại bằng Google để làm mới phiên truy cập. Dữ liệu điểm danh bạn đang chỉnh sửa trên màn hình vẫn được giữ nguyên."
        confirmLabel={isLoggingIn ? 'Đang kết nối...' : 'Đăng nhập lại bằng Google'}
        cancelLabel="Đóng"
        loading={isLoggingIn}
        onConfirm={handleLogin}
        onCancel={() => setShowReauthModal(false)}
      />
    </div>
  );
}
