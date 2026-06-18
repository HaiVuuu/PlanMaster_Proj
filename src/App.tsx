
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'; // Keep React import
import { Project, User, UserRole, UserStatus, AppSettings, ModuleName, AppNotification } from '@/types';
import { Button } from '@/components/Button';
import { Toast } from '@/components/Toast';
import { AlertTriangle } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useAuthListener } from '@/hooks/useAuth';
import { useUserSettings } from '@/hooks/useUserSettings';
import { useFirestoreListeners } from '@/hooks/useFirestoreListeners';
import { useAppHandlers } from '@/hooks/useAppHandlers';
import { RootState, AppDispatch } from '@/store/store';
import { setCurrentProject } from '@/store/projectSlice';
import { addToast, removeToast } from '@/store/uiSlice';
import { notificationService } from '@/services/notificationService';
import { AuthPage } from '@/components/AuthPage';
import { ProjectSelectScreen } from '@/components/ProjectSelectScreen';
import { WorkspaceScreen } from '@/components/WorkspaceScreen';
import './index.css'
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { sampleProject } from './data/sampleProject';
import { setAuthSuccess } from './store/authSlice';
// Default settings moved here for App.tsx to use
const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  compactMode: false,
  currency: 'VND',
  dateFormat: 'DD/MM/YYYY'
};


function App() {
  const [view, setView] = useState<'PROJECT_SELECT' | 'WORKSPACE'>('PROJECT_SELECT');

  // --- REDUX STATE ---
  const dispatch = useDispatch<AppDispatch>();
  const { status:authStatus, currentUser, error:authError } = useSelector((state: RootState) => state.auth);
  const { projects, currentProject } = useSelector((state: RootState) => state.projects);
  const settings = useSelector((state: RootState) => state.settings);
  const toasts = useSelector((state: RootState) => state.ui.toasts);

  const isOnline = useOnlineStatus();
  useAuthListener();

  // --- CUSTOM HOOKS FOR LOGIC SEPARATION ---
  useUserSettings(currentUser, setView);
  const { systemPendingUsers, setSystemPendingUsers } = useFirestoreListeners(currentUser, currentProject);

  // State for WorkspaceScreen
  const [activeTab, setActiveTab] = useState<ModuleName>('DASHBOARD');
  
  // Tab control for UserMgmt
  const [userMgmtDefaultTab, setUserMgmtDefaultTab] = useState<'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING'>('MEMBERS');

  // Mobile Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Notifications State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  
  // --- APP HANDLERS HOOK ---
  const handlers = useAppHandlers(
    currentUser,
    currentProject,
    projects,
    dispatch,
    setView,
    setActiveTab,
    setShowConfirmModal,
    setConfirmAction,
    setConfirmMessage,
    setSystemPendingUsers
  );

  // --- GUEST MODE HANDLER ---
  // This effect runs alongside useAuthListener. It specifically looks for
  // anonymous users and injects a temporary "guest" session into the Redux store.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && user.isAnonymous) {
        const guestUser: User = {
            id: user.uid,
            role: UserRole.GUEST,
            fullname: 'Khách Tham Quan',
            phone: '0000000000',
            avatar: `https://i.pravatar.cc/150?u=${user.uid}`,
            username: 'guest',
            cccd: '',
            email: '',
            status: UserStatus.ACTIVE
        };
        // Dispatch actions to set the guest session in Redux
        // This will make the rest of the app behave as if a "GUEST" user is logged in.
        dispatch(setAuthSuccess(guestUser));
        dispatch(setCurrentProject(sampleProject));
        setView('WORKSPACE');
      }
    });
    return () => unsubscribe();
  }, [dispatch]);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // --- NOTIFICATION HANDLERS ---
  const myNotifications = useMemo(() => {
    if (!currentProject || !currentUser) return [];
    return (currentProject.notifications || [])
        .filter((n: AppNotification) => n.recipientIds.includes(currentUser.id))
        .sort((a: AppNotification, b: AppNotification) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [currentProject?.notifications, currentUser]);

  const unreadCount = useMemo(() => myNotifications.filter((n: AppNotification) => !n.isRead).length, [myNotifications]);

  const markAsRead = async (notifId: string) => {
    if (!currentProject || !currentUser) return;
    try {
        await notificationService.markNotificationAsRead(currentProject.id, currentUser.id, notifId);
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
    // TODO: Refactor this to use a dedicated notification service
    // updateCurrentProject({ ...currentProject, notifications: updatedNotifs });
  };
  
  const handleNotificationClick = (n: AppNotification) => {
      if (n.title.includes('Duyệt thành viên')) {
          setActiveTab('USERS');
          setUserMgmtDefaultTab('PENDING');
          setShowNotifications(false);
      } else if (n.taskId) {
          setActiveTab('TASKS');
          setShowNotifications(false);
          // TODO: Add logic to scroll to the specific task
      }
  };
  
  const markAllRead = async () => {
      if (!currentProject || !currentUser) return; // This function also uses the old onUpdate pattern.
      try {
          await notificationService.markAllNotificationsAsRead(currentProject.id, currentUser.id);
          dispatch(addToast({ message: "Đã đánh dấu tất cả thông báo là đã đọc.", type: 'success' }));
      } catch (error) {
          console.error("Error marking all notifications as read:", error);
          dispatch(addToast({ message: "Lỗi khi đánh dấu tất cả thông báo là đã đọc.", type: 'error' }));
      }
  };

  // --- RENDER LOGIC (Simplified) ---
  let content;
  if (authStatus === 'LOADING') {
    content = (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full"></div>
      </div>
    );
  } else if (!currentUser) {
    content = <AuthPage authError={authError} />;
  } else if (view === 'PROJECT_SELECT') {
    content = ( // For guest users, currentProject is already set, so this view is skipped.
      <ProjectSelectScreen
        currentUser={currentUser}
        projects={projects}
        onSelectProject={handlers.handleSelectProject}
        onCreateProject={handlers.handleCreateProject}
        onLogout={handlers.handleLogout}
      />
    );
  } else { // view === 'WORKSPACE'
    content = (
      <WorkspaceScreen
        currentUser={currentUser}
        currentProject={currentProject} // For guests, this will be the sampleProject
        settings={settings}
        isOnline={isOnline}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userMgmtDefaultTab={userMgmtDefaultTab}
        setUserMgmtDefaultTab={setUserMgmtDefaultTab}
        systemPendingUsers={systemPendingUsers}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        myNotifications={myNotifications}
        unreadCount={unreadCount}
        markAsRead={markAsRead}
        handleNotificationClick={handleNotificationClick}
        markAllRead={markAllRead}
        onUpdateProjectDetails={handlers.handleUpdateProjectDetails}
        onUploadProjectDocument={handlers.handleUploadProjectDocument}
        onRemoveProjectDocument={handlers.handleRemoveProjectDocument}
        onAddTask={handlers.handleAddTask}
        onUpdateTask={handlers.handleUpdateTask}
        onDeleteTask={handlers.handleDeleteTask}
        onUpdateTaskWithLog={handlers.handleUpdateTaskWithLog}
        onAddCommentToTask={handlers.handleAddCommentToTask}
        onUploadTaskImage={handlers.handleUploadTaskImage}
        onUpdateUnitPrice={handlers.handleUpdateTaskUnitPrice}
        onAddPaymentLog={handlers.handleAddPaymentLog}
        onAddStakeholder={handlers.handleAddStakeholder}
        onRemoveStakeholder={handlers.handleRemoveStakeholder}
        onUpdateSettings={handlers.handleUpdateSettings}
        onGenerateExecutiveReport={handlers.handleGenerateReport}
        onAssignUserToProject={handlers.handleAssignUserToProject}
        onAddExistingUserToProject={handlers.handleAddExistingUserToProject}
        onRemoveUserFromCurrentProject={handlers.handleRemoveUserFromCurrentProject}
        onRejectUser={handlers.handleRejectUser}
        onAdminPasswordReset={handlers.handleAdminPasswordReset}
        onExitProject={() => { dispatch(setCurrentProject(null)); setView('PROJECT_SELECT'); }}
        onLogout={handlers.handleLogout}
        onUpdateUserProfile={handlers.handleUpdateUserProfile}
        onChangePassword={handlers.handleChangePassword}
      />
    );
  }

  return (
    <>
      <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 overflow-hidden">
        {content}

        <div className="fixed top-5 right-5 z-[100] space-y-3 w-96">
            {toasts.map((toast: { id: string, message: string, type: "success" | "error" | "info" | "warning" }) => (
                <Toast 
                    key={toast.id} 
                    id={toast.id}
                    message={toast.message} 
                    type={toast.type}
                    onDismiss={(id: string) => dispatch(removeToast(id))}
                />
            ))}
        </div>
      </div>

      {/* Generic Confirmation Modal */}
      {showConfirmModal && (
          <div className="absolute inset-0 z-[100] bg-gray-900/60 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                  <div className="p-6 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                      </div>
                      <h3 className="mt-5 text-lg font-medium text-gray-900 dark:text-gray-100">
                          Xác nhận hành động
                      </h3>
                      <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                          <p>{confirmMessage}</p>
                      </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse rounded-b-xl">
                      <Button
                          variant="danger"
                          onClick={confirmAction || (() => {})}
                          className="w-full sm:ml-3 sm:w-auto"
                      >
                          Xác nhận
                      </Button>
                      <Button variant="secondary" onClick={() => setShowConfirmModal(false)} className="mt-3 w-full sm:mt-0 sm:w-auto">Hủy bỏ</Button>
                  </div>
              </div>
          </div>
      )}
    </>
  );
}

export default App;
