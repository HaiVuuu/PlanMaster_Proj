import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Project, User, UserRole, AppSettings, ModuleName, AppNotification, Task, ProjectDocument, ProjectReport, PaymentLog, Stakeholder, TaskLog, Comment, PERMISSION_CONFIG } from '@/types';
import { LayoutDashboard, ListTodo, Users, Settings as SettingsIcon, LogOut, FolderOpen, Info, Network, Star, Menu, X, Bell, DollarSign, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/Button';
import { ProjectInfo } from '@/components/ProjectInfo';
import { Dashboard } from '@/components/Dashboard';
import { TaskList } from '@/components/TaskList';
import { CostManagement } from '@/components/CostManagement';
import { UserMgmt } from '@/components/UserMgmt';
import { StakeholderMgmt } from '@/components/StakeholderMgmt';
import { UserEvaluation } from '@/components/UserEvaluation';
import { Settings } from '@/components/Settings';
import { UserProfileScreen } from '@/components/UserProfileScreen'; // Import new screen
import { authService } from '@/services/authService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebase';

interface SidebarItemProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
    {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5' })}
    {label}
  </button>
);

interface WorkspaceScreenProps {
  currentUser: User;
  currentProject: Project | null;
  settings: AppSettings;
  isOnline: boolean;
  activeTab: ModuleName;
  setActiveTab: (tab: ModuleName) => void;
  userMgmtDefaultTab: 'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING';
  setUserMgmtDefaultTab: (tab: 'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING') => void;
  systemPendingUsers: User[];
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (isOpen: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (show: boolean) => void;
  myNotifications: AppNotification[];
  unreadCount: number;
  markAsRead: (notifId: string) => void;
  handleNotificationClick: (n: AppNotification) => void;
  markAllRead: () => void;
  onExitProject: () => void;
  onLogout: () => void;

  // Handlers passed from App.tsx
  onUpdateProjectDetails: (updates: Partial<Pick<Project, 'name' | 'location' | 'description' | 'participants'>>) => Promise<void>;
  onUploadProjectDocument: (file: File, docName: string) => Promise<void>;
  onRemoveProjectDocument: (docToRemove: ProjectDocument) => Promise<void>;
  onAddTask: (parentId: string | null) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskToDelete: Task) => Promise<void>;
  onUpdateTaskWithLog: (task: Task, logData: { log: TaskLog, updates: Partial<Task>, notification?: AppNotification }) => Promise<void>;
  onAddCommentToTask: (taskId: string, comment: Comment, notification?: AppNotification) => Promise<void>;
  onUploadTaskImage: (taskId: string, file: File) => Promise<string | null>;
  onUpdateUnitPrice: (taskId: string, price: number) => void;
  onAddPaymentLog: (task: Task, log: Omit<PaymentLog, 'id' | 'payerId' | 'payerName'>) => void;
  onAddStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  onRemoveStakeholder: (stakeholderId: string) => void;
  onUpdateSettings: (newSettings: AppSettings) => Promise<void>;
  onGenerateExecutiveReport: (report: ProjectReport) => void;
  onAssignUserToProject: (userToAssign: User) => Promise<void>;
  onAddExistingUserToProject: (userToAdd: User) => Promise<void>;
  onRemoveUserFromCurrentProject: (userToRemove: User) => Promise<void>;
  onRejectUser: (userId: string) => Promise<void>;
  onAdminPasswordReset: (userToReset: User) => Promise<void>;
  onUpdateUserProfile: (updates: { fullname?: string; avatarFile?: File | null; }) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const WorkspaceScreen: React.FC<WorkspaceScreenProps> = ({
  currentUser,
  currentProject,
  settings,
  isOnline,
  activeTab,
  setActiveTab,
  userMgmtDefaultTab,
  setUserMgmtDefaultTab,
  systemPendingUsers,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  showNotifications,
  setShowNotifications,
  myNotifications,
  unreadCount,
  markAsRead,
  handleNotificationClick,
  markAllRead,
  onExitProject,
  onLogout,
  // Handlers
  onUpdateProjectDetails, onUploadProjectDocument, onRemoveProjectDocument,
  onAddTask, onUpdateTask, onDeleteTask, onUpdateTaskWithLog, onAddCommentToTask, onUploadTaskImage,
  onUpdateUnitPrice, onAddPaymentLog,
  onAddStakeholder, onRemoveStakeholder,
  onUpdateSettings,
  onGenerateExecutiveReport,
  onAssignUserToProject, onAddExistingUserToProject, onRemoveUserFromCurrentProject, onRejectUser, onAdminPasswordReset,
  onUpdateUserProfile, onChangePassword
}) => {
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // --- USER ACTIVITY TRACKER ---
  useEffect(() => {
    if (!currentUser?.id) return;

    const updateUserActivity = async () => {
      const userDocRef = doc(db, 'users', currentUser.id);
      try {
        await updateDoc(userDocRef, {
          lastActiveAt: new Date().toISOString()
        });
      } catch (error) {
        console.error("Failed to update user activity:", error);
      }
    };

    const initialUpdateTimeout = setTimeout(updateUserActivity, 5000);
    const intervalId = setInterval(updateUserActivity, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialUpdateTimeout);
      clearInterval(intervalId);
    };
  }, [currentUser?.id]);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  const canView = useCallback((module: ModuleName) => {
    return currentUser ? PERMISSION_CONFIG[currentUser.role][module].view : false;
  }, [currentUser]);

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl text-blue-600 flex items-center gap-2"><FolderOpen className="w-6 h-6" /> PlanMaster</h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate max-w-[180px]">{currentProject?.name}</p>
          </div>
          <button className="md:hidden text-gray-500 dark:text-gray-400" onClick={() => setIsMobileMenuOpen(false)}><X className="w-6 h-6" /></button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {canView('INFO') && <SidebarItem active={activeTab === 'INFO'} onClick={() => { setActiveTab('INFO'); setIsMobileMenuOpen(false); }} icon={<Info />} label="Thông tin dự án" />}
          {canView('DASHBOARD') && <SidebarItem active={activeTab === 'DASHBOARD'} onClick={() => { setActiveTab('DASHBOARD'); setIsMobileMenuOpen(false); }} icon={<LayoutDashboard />} label="Tổng quan" />}
          {canView('TASKS') && <SidebarItem active={activeTab === 'TASKS'} onClick={() => { setActiveTab('TASKS'); setIsMobileMenuOpen(false); }} icon={<ListTodo />} label="Thi công & Nghiệm thu" />}
          {canView('COST') && <SidebarItem active={activeTab === 'COST'} onClick={() => { setActiveTab('COST'); setIsMobileMenuOpen(false); }} icon={<DollarSign />} label="Quản lý chi phí" />}
          {canView('USERS') && <SidebarItem active={activeTab === 'USERS'} onClick={() => { setActiveTab('USERS'); setIsMobileMenuOpen(false); }} icon={<Users />} label="Nhân sự" />}
          {canView('EVALUATION') && <SidebarItem active={activeTab === 'EVALUATION'} onClick={() => { setActiveTab('EVALUATION'); setIsMobileMenuOpen(false); }} icon={<Star />} label="Đánh giá & Xếp hạng" />}
          {canView('STAKEHOLDERS') && <SidebarItem active={activeTab === 'STAKEHOLDERS'} onClick={() => { setActiveTab('STAKEHOLDERS'); setIsMobileMenuOpen(false); }} icon={<Network />} label="Bên liên quan" />}
          {canView('SETTINGS') && <SidebarItem active={activeTab === 'SETTINGS'} onClick={() => { setActiveTab('SETTINGS'); setIsMobileMenuOpen(false); }} icon={<SettingsIcon />} label="Cài đặt" />}
        </nav>

        <div className="p-4 border-t dark:border-gray-700">
          <Button variant="ghost" onClick={onExitProject} className="w-full justify-start text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> Thoát dự án
          </Button>
        </div>
      </aside>

      {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4 md:px-8 shadow-sm z-20">
          <div className="flex items-center gap-2">
            <button className="md:hidden text-gray-600 dark:text-gray-300 p-1" onClick={() => setIsMobileMenuOpen(true)}><Menu className="w-6 h-6" /></button>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-sm md:text-lg truncate">
              {activeTab === 'PROFILE' ? 'Hồ sơ cá nhân' : activeTab.replace('_', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={notifDropdownRef}>
              <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50">
                  <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 rounded-t-xl"><h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Thông báo</h3><button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400">Đọc tất cả</button></div>
                  <div className="max-h-80 overflow-y-auto">
                    {(myNotifications || []).length === 0 ? <div className="p-6 text-center text-xs text-gray-400 dark:text-gray-500">Không có thông báo mới.</div> :
                      (myNotifications || []).map(n => (
                        <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-3 border-b border-gray-50 hover:bg-gray-50 ${!n.isRead ? 'bg-blue-50/40' : ''}`}>
                          <div className="flex justify-between items-start mb-1"><span className={`text-xs font-bold ${n.type === 'SUCCESS' ? 'text-green-600' : 'text-blue-600'}`}>{n.title}</span>{!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}</div>
                          <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                          <div className="mt-1 flex justify-between text-[10px] text-gray-400"><span>{n.senderName}</span><span>{new Date(n.timestamp).toLocaleString('vi-VN')}</span></div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
            
            {/* User Menu Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50">
                <img src={currentUser?.avatar} className="w-8 h-8 rounded-full border dark:border-gray-600" alt="avatar" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50 p-2">
                  <div className="px-2 py-2 border-b dark:border-gray-700 mb-2">
                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200 truncate">{currentUser.fullname}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                  </div>
                  <button onClick={() => { setActiveTab('PROFILE'); setIsUserMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                    <UserIcon className="w-4 h-4" /> Hồ sơ của tôi
                  </button>
                  <button onClick={() => { onLogout(); setIsUserMenuOpen(false); }} className="w-full text-left flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400">
                    <LogOut className="w-4 h-4" /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {!isOnline && (
          <div className="bg-yellow-500 text-white text-center text-sm font-semibold p-2 animate-pulse z-20">
            Bạn đang offline. Dữ liệu sẽ được đồng bộ khi có kết nối mạng.
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {/* The Profile screen has its own padding and max-width */}
          {activeTab === 'PROFILE' && currentUser && (
            <div className="p-4 md:p-8">
              <UserProfileScreen currentUser={currentUser} onUpdateProfile={onUpdateUserProfile} onChangePassword={onChangePassword} />
            </div>
          )}
          <div className={`p-4 md:p-8 ${activeTab === 'PROFILE' ? 'hidden' : 'block'}`}>
          {currentProject && currentUser && (
            <>
              {activeTab === 'INFO' && <ProjectInfo
                project={currentProject}
                currentUser={currentUser}
                onUpdateDetails={onUpdateProjectDetails}
                onUploadDocument={onUploadProjectDocument}
                onRemoveDocument={onRemoveProjectDocument}
              />}
              {activeTab === 'DASHBOARD' && <Dashboard
                project={currentProject}
                currentUser={currentUser}
                onGenerateReport={onGenerateExecutiveReport}
              />}
              {activeTab === 'TASKS' && <TaskList
                project={currentProject}
                currentUser={currentUser}
                onAddTask={onAddTask}
                onUpdateTask={onUpdateTask}
                onDeleteTask={onDeleteTask}
                onUpdateTaskWithLog={onUpdateTaskWithLog}
                onAddCommentToTask={onAddCommentToTask}
                onUploadTaskImage={onUploadTaskImage} />}
              {activeTab === 'COST' && <CostManagement
                project={currentProject}
                currentUser={currentUser}
                onUpdateUnitPrice={onUpdateUnitPrice}
                onAddPaymentLog={onAddPaymentLog} />}
              {activeTab === 'USERS' && <UserMgmt
                project={currentProject}
                currentUser={currentUser}
                systemPendingUsers={systemPendingUsers}
                defaultTab={userMgmtDefaultTab}
                onAssignUserToProject={onAssignUserToProject}
                onAddExistingUserToProject={onAddExistingUserToProject}
                onRemoveUserFromProject={onRemoveUserFromCurrentProject}
                onRejectUser={onRejectUser}
                onAdminPasswordReset={onAdminPasswordReset}
                onSetUserMgmtDefaultTab={setUserMgmtDefaultTab} // Pass setter for tab control
              />}
              {activeTab === 'EVALUATION' && <UserEvaluation project={currentProject} currentUser={currentUser} />}
              {activeTab === 'STAKEHOLDERS' && <StakeholderMgmt
                project={currentProject}
                onAddStakeholder={onAddStakeholder}
                onRemoveStakeholder={onRemoveStakeholder}
              />}
              {activeTab === 'SETTINGS' && <Settings settings={settings} onUpdate={onUpdateSettings} project={currentProject} />}
            </>
          )}
        </div>
        </div>
      </main>
    </>
  );
};