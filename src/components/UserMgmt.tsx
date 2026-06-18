import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Project, User, UserRole, UserStatus, PERMISSION_CONFIG, ModuleName, ROLE_HIERARCHY } from '@/types';
import { Button } from '@/components/Button'; // Assuming Button component is available
import { Phone, Mail, Pencil, Lock, ShieldCheck, AlertCircle, UserPlus, Crown, KeyRound, UserCheck, X, Trash2, AlertTriangle, CornerDownRight } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { userService } from '@/services/userService'; // Import userService
import { UserMembersTab } from '@/components/UserMembersTab'; // Import the new sub-component
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import { db } from '@/firebase';
import { formatLastActive } from '@/utils/helpers';

interface Props {
  project: Project;
  currentUser: User;
  systemPendingUsers?: User[]; // Users pending approval system-wide
  defaultTab?: 'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING';
  onAssignUserToProject?: (user: User) => Promise<void>; // Approve and add to current project
  onAddExistingUserToProject?: (user: User) => Promise<void>; // Add an ACTIVE user to project
  onRemoveUserFromProject?: (user: User) => Promise<void>;
  onSetUserMgmtDefaultTab?: (tab: 'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING') => void; // For external tab control
  onRejectUser?: (userId: string) => void; // System-level rejection
  onAdminPasswordReset?: (user: User) => void;
};

export const UserMgmt: React.FC<Props> = ({ 
    project, 
    currentUser, 
    systemPendingUsers = [], 
    defaultTab, 
    onAddExistingUserToProject,
    onRemoveUserFromProject,
    onAssignUserToProject,
    onSetUserMgmtDefaultTab,
    onRejectUser,
    onAdminPasswordReset,
}) => {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'PENDING' | 'PERMISSIONS' | 'SYSTEM_PENDING'>(defaultTab || 'MEMBERS'); // Keep activeTab state here

  // Sync tab if defaultTab changes (e.g. from notification click)
  useEffect(() => {
      if (defaultTab && defaultTab !== activeTab) {
          setActiveTab(defaultTab);
          if (onSetUserMgmtDefaultTab) onSetUserMgmtDefaultTab(defaultTab); // Notify parent if tab changed
      }
  }, [defaultTab]);

  // New Logic: Show join requests from system-wide pending users who specified the current user as manager.
  const joinRequestsForManager = useMemo(() => {
    return systemPendingUsers.filter((u: User) =>
        u.managerPhone === currentUser.phone
    );
  }, [systemPendingUsers, currentUser.phone]);

  const activeUsers = useMemo(() => {
    return project.team.filter((u: User) => u.status !== UserStatus.PENDING); // Still needed for other tabs
  }, [project.team]);

  // Permission Check
  const canEditUsers = PERMISSION_CONFIG[currentUser.role].USERS.edit;

  // Helper to check if a user is already in the current project
  const isUserInProject = useCallback((userId: string): boolean => {
    return project.memberUids?.includes(userId) ?? false;
  }, [project.memberUids]);
  
  const handleApprove = (userId: string) => {
    // This is now handled by onAssignUserToProject which also approves
    console.warn("handleApprove is deprecated. Use onAssignUserToProject.");
    // Find user and call onAssignUserToProject
  };
  
  const handleAssign = (user: User) => {
    if (!canEditUsers || !onAssignUserToProject) return;
    onAssignUserToProject(user);
  };
  
  const handleSystemReject = (userId: string) => {
    if (!canEditUsers || !onRejectUser) {
        dispatch(addToast({ message: "Bạn không có quyền thực hiện hành động này.", type: 'error' }));
        return;
    }
    setConfirmMessage("Bạn có chắc muốn từ chối vĩnh viễn và xóa tài khoản của người dùng này khỏi hệ thống? Hành động này không thể hoàn tác.");
    setConfirmAction(() => {
        onRejectUser(userId); // Call the prop function
        setShowConfirmModal(false); // Close modal after action
        setConfirmAction(null); // Clear action
    });
  };

  const handleRejectJoinRequest = (userId: string) => { // Renamed for clarity
    if (!canEditUsers) return;
    // Re-use the system-level rejection logic, which is passed via props.
    handleSystemReject(userId); // This is a system-level rejection for pending join requests
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b overflow-x-auto">
          <button
              onClick={() => setActiveTab('MEMBERS')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 shrink-0 ${activeTab === 'MEMBERS' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
          >
              Danh sách nhân sự
          </button>
          {currentUser.role === UserRole.ADMIN && (
              <button
                  onClick={() => setActiveTab('SYSTEM_PENDING')}
                  className={`px-4 py-2 text-sm font-medium flex items-center gap-2 shrink-0 ${activeTab === 'SYSTEM_PENDING' ? 'border-b-2 border-purple-500 text-purple-600' : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
                  <Crown className="w-4 h-4"/> Phê duyệt hệ thống
                  {systemPendingUsers.length > 0 && (
                      <span className="bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{systemPendingUsers.length}</span>
                  )}
              </button>
          )}
          <button
              onClick={() => setActiveTab('PENDING')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 shrink-0 ${activeTab === 'PENDING' ? 'border-b-2 border-amber-500 text-amber-600' : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
              Yêu cầu trong dự án
              {joinRequestsForManager.length > 0 && (
                  <span className="bg-amber-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">{joinRequestsForManager.length}</span>
              )}
          </button>
          <button
              onClick={() => setActiveTab('PERMISSIONS')}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 shrink-0 ${activeTab === 'PERMISSIONS' ? 'border-b-2 border-blue-500 text-blue-600' : 'border-b-2 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
              Phân quyền
          </button>
      </div>

      {activeTab === 'MEMBERS' && (
           <UserMembersTab
               project={project}
               currentUser={currentUser}
               canEditUsers={canEditUsers}
               onAddExistingUserToProject={onAddExistingUserToProject!}
               onRemoveUserFromProject={onRemoveUserFromProject!}
               onAdminPasswordReset={onAdminPasswordReset!}
           />
       )}

      {activeTab === 'SYSTEM_PENDING' && ( // bg-white dark:bg-gray-800
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {systemPendingUsers.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                        <Crown className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Không có tài khoản nào chờ duyệt trên toàn hệ thống.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800">
                            <tr>
                                <th className="p-4 font-semibold text-purple-800 dark:text-purple-300 text-sm">Người đăng ký</th>
                                <th className="p-4 font-semibold text-purple-800 dark:text-purple-300 text-sm">Vai trò & Quản lý</th>
                                <th className="p-4 font-semibold text-purple-800 dark:text-purple-300 text-sm text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-800 dark:text-gray-200">
                             {systemPendingUsers.map((user: User) => (
                                 <tr key={user.id} className="border-b border-gray-100">
                                     <td className="p-4">
                                        <div className="font-bold">{user.fullname}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><Phone className="w-3 h-3"/>{user.phone}</div>
                                     </td>
                                     <td className="p-4 text-sm">
                                        <div>Vai trò: <span className="font-medium text-gray-800 dark:text-gray-200">{user.role}</span></div>
                                        <div className="text-xs">QL duyệt: <span className="font-medium text-gray-600">{user.managerPhone}</span></div>
                                     </td>
                                     <td className="p-4 text-right">
                                        {canEditUsers ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => handleSystemReject(user.id)}>Từ chối</Button>
                                                {/* "Phê duyệt" is now combined into "Thêm vào DA" */}
                                                <Button 
                                                    className="h-8 px-3 text-xs flex items-center gap-1" 
                                                    onClick={() => handleAssign(user)}
                                                    disabled={isUserInProject(user.id)}
                                                    title={isUserInProject(user.id) ? "Nhân sự đã có trong dự án" : "Phê duyệt và gán vào dự án này"}
                                                >
                                                    <UserPlus className="w-3 h-3" /> Thêm vào DA
                                                </Button>
                                            </div>
                                        ) : <span className="text-xs text-gray-400">Không có quyền duyệt</span>}
                                     </td> 
                                 </tr>
                             ))}
                        </tbody>
                    </table>
                )}
           </div>
       )}
       
       {activeTab === 'PENDING' && ( // bg-white dark:bg-gray-800
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {joinRequestsForManager.length === 0 ? (
                    <div className="p-10 text-center text-gray-500 dark:text-gray-400 flex flex-col items-center">
                        <ShieldCheck className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-gray-800 dark:text-gray-200">Không có yêu cầu phê duyệt nào trong dự án này.</p>
                        <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">Các yêu cầu từ nhân viên nhập SĐT của bạn ({currentUser.phone}) làm quản lý sẽ hiện ở đây.</p>
                    </div>
                ) : (
                    <table className="w-full text-left">
                        <thead className="bg-yellow-50 dark:bg-yellow-900/30 border-b border-yellow-100 dark:border-yellow-800">
                            <tr>
                                <th className="p-4 font-semibold text-yellow-800 dark:text-yellow-300 text-sm">Người đăng ký</th>
                                <th className="p-4 font-semibold text-yellow-800 dark:text-yellow-300 text-sm">SĐT</th>
                                <th className="p-4 font-semibold text-yellow-800 dark:text-yellow-300 text-sm text-right">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-800 dark:text-gray-200">
                             {joinRequestsForManager.map((user: User) => (
                                 <tr key={user.id} className="border-b border-gray-100">
                                     <td className="p-4">
                                        <div className="font-bold">{user.fullname}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">Xin vào vị trí: {user.role}</div>
                                     </td>
                                     <td className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200">{user.phone}</td>
                                     <td className="p-4 text-right text-gray-800 dark:text-gray-200">
                                        {canEditUsers ? (
                                            <div className="flex gap-2 justify-end">
                                                <Button variant="danger" className="h-8 px-3 text-xs" onClick={() => handleSystemReject(user.id)}>Từ chối</Button>
                                                <Button className="h-8 px-3 text-xs" onClick={() => handleAssign(user)}>Duyệt & Thêm</Button> {/* This assigns to the current project */}
                                            </div>
                                        ) : <span className="text-xs text-gray-400">Không có quyền duyệt</span>}
                                     </td>
                                 </tr>
                             ))}
                        </tbody>
                    </table>
                )}
           </div>
       )}
       
       {activeTab === 'PERMISSIONS' && ( // bg-white dark:bg-gray-800
           <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-6">
               <div className="mb-4 flex items-center gap-2 text-orange-600 bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-100 dark:border-orange-800">
                   <AlertCircle className="w-5 h-5" />
                   <span className="text-sm text-gray-800 dark:text-gray-200">Bảng phân quyền hệ thống (Chỉ xem). Cấu hình này được áp dụng tự động cho các vai trò.</span>
               </div>
               
               <div className="overflow-x-auto">
                   <table className="w-full border-collapse text-sm">
                       <thead>
                           <tr className="bg-gray-100 dark:bg-gray-700/50">
                               <th className="p-3 border dark:border-gray-700 text-left text-gray-700 dark:text-gray-300 min-w-[150px]">Module</th>
                               {(Object.values(UserRole) as UserRole[]).map(role => (
                                   <th key={role} className="p-3 border text-center text-gray-700 font-semibold min-w-[120px] text-[10px]">{role}</th>
                               ))}
                           </tr>
                       </thead>
                       <tbody>
                           {(Object.keys(PERMISSION_CONFIG[UserRole.ADMIN]) as ModuleName[]).map((module: ModuleName) => (
                               <tr key={module}>
                                   <td className="p-3 border dark:border-gray-700 font-medium text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50">{module}</td>
                                   {(Object.values(UserRole) as UserRole[]).map(role => {
                                       const rights = PERMISSION_CONFIG[role][module];
                                       return (
                                           <td key={role} className="p-3 border dark:border-gray-700 text-center">
                                               <div className="flex flex-col gap-1 items-center">
                                                   <span className={`text-[10px] px-2 py-0.5 rounded-full w-12 ${rights.view ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                                       {rights.view ? 'Xem' : '-'}
                                                   </span>
                                                   <span className={`text-[10px] px-2 py-0.5 rounded-full w-12 ${rights.edit ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'}`}>
                                                       {rights.edit ? 'Sửa' : '-'}
                                                   </span>
                                               </div>
                                           </td>
                                       )
                                   })}
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
       )}

       {/* Generic Confirmation Modal for UserMgmt */}
       {showConfirmModal && (
           <div className="absolute inset-0 z-50 bg-gray-900/60 flex items-center justify-center backdrop-blur-sm p-4">
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
                   <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
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
    </div>
  );
};
