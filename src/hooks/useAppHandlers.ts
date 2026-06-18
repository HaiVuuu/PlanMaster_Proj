import { useCallback } from 'react';
import {
  Project, User, UserRole, Task, ProjectDocument, Comment, PaymentLog, ProjectReport, AppNotification, Stakeholder, AppSettings, ModuleName, TaskLog, UserStatus
} from '@/types';
import {
  signOut, sendPasswordResetEmail, reauthenticateWithCredential, EmailAuthProvider, updatePassword
} from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { writeBatch, doc, updateDoc, arrayUnion, setDoc, arrayRemove } from 'firebase/firestore';
import { auth, db, storage } from '@/firebase';
import { AppDispatch } from '@/store/store';
import { addToast } from '@/store/uiSlice';
import { setCurrentProject } from '@/store/projectSlice';
import { setSettings } from '@/store/settingsSlice';

// Services
import { projectService } from '@/services/projectService';
import { userService } from '@/services/userService';
import { taskService } from '@/services/taskService';
import { costService } from '@/services/costService';
import { stakeholderService } from '@/services/stakeholderService';
import { reportService } from '@/services/reportService';

type SetViewType = (view: 'PROJECT_SELECT' | 'WORKSPACE') => void;
type SetActiveTabType = (tab: ModuleName) => void;
type SetShowConfirmModalType = (show: boolean) => void;
type SetConfirmActionType = (action: (() => Promise<void>) | null) => void;
type SetConfirmMessageType = (message: string) => void;
type SetSystemPendingUsersType = React.Dispatch<React.SetStateAction<User[]>>;

export const useAppHandlers = (
  currentUser: User | null,
  currentProject: Project | null,
  projects: Project[],
  dispatch: AppDispatch,
  setView: SetViewType,
  setActiveTab: SetActiveTabType,
  setShowConfirmModal: SetShowConfirmModalType,
  setConfirmAction: SetConfirmActionType,
  setConfirmMessage: SetConfirmMessageType,
  setSystemPendingUsers: SetSystemPendingUsersType
) => {

  // --- PROJECT HANDLERS ---
  const handleSelectProject = useCallback((p: Project) => {
    dispatch(setCurrentProject(p));
    setView('WORKSPACE');
    if (currentUser?.role === UserRole.NVNT || currentUser?.role === UserRole.NVTVGS || currentUser?.role === UserRole.QCNT) {
      setActiveTab('TASKS');
    } else {
      setActiveTab('DASHBOARD');
    }
  }, [dispatch, setView, currentUser, setActiveTab]);

  const handleCreateProject = useCallback(async () => {
    if (!currentUser) return;
    try {
        const newProject = await projectService.createProject(currentUser, projects.length);
        handleSelectProject(newProject);
    } catch (error) {
        console.error("Error creating new project: ", error);
        dispatch(addToast({ message: "Không thể tạo dự án mới. Vui lòng thử lại.", type: 'error' }));
    }
  }, [currentUser, projects, handleSelectProject, dispatch]);

  // --- ProjectInfo HANDLERS ---
  const handleUpdateProjectDetails = useCallback(async (updates: Partial<Pick<Project, 'name' | 'location' | 'description' | 'participants'>>) => {
    if (!currentProject) return;
    try {
        await projectService.updateProjectDetails(currentProject.id, updates);
        dispatch(addToast({ message: "Đã cập nhật thông tin dự án.", type: 'success' }));
    } catch (error) {
        console.error("Error updating project details:", error);
        dispatch(addToast({ message: "Lỗi khi cập nhật thông tin dự án.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  const handleUploadProjectDocument = useCallback(async (file: File, docName: string) => {
    if (!currentProject || !currentUser) return;
    try {
        await projectService.uploadProjectDocument(currentProject, currentUser, file, docName);
        dispatch(addToast({ message: "Tải tài liệu lên thành công.", type: 'success' }));
    } catch (error) {
        console.error("Error uploading file:", error);
        dispatch(addToast({ message: "Lỗi tải file lên, vui lòng thử lại.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleRemoveProjectDocument = useCallback(async (docToRemove: ProjectDocument) => {
    if (!currentProject) return;
    try {
        await projectService.removeProjectDocument(currentProject, docToRemove);
        dispatch(addToast({ message: "Đã xóa tài liệu.", type: 'success' }));
    } catch (error) {
        console.error("Error deleting document: ", error);
        dispatch(addToast({ message: "Có lỗi xảy ra khi xóa tài liệu.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  // --- TASK HANDLERS ---
  const handleAddTask = useCallback(async (parentId: string | null) => {
    if (!currentProject || !currentUser || !currentProject.tasks) return;
    try {
        await taskService.addTask(currentProject.id, parentId, currentProject.tasks);
    } catch (error) {
        console.error("Error adding task:", error);
        dispatch(addToast({ message: "Lỗi khi thêm công việc.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleUpdateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!currentProject || !currentUser) return;
    try {
        await taskService.updateTask(currentProject.id, taskId, updates);
    } catch (error) {
        console.error("Error updating task:", error);
        dispatch(addToast({ message: "Lỗi khi cập nhật công việc.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleDeleteTask = useCallback(async (taskToDelete: Task) => {
    if (!currentProject || !currentUser) return;
    setConfirmMessage(`Bạn có chắc muốn xóa công việc "${taskToDelete.name}" và tất cả công việc phụ của nó?`);
    setConfirmAction(async () => {
        try {
            const subTasks = currentProject.tasks.filter((t: Task) => t.parentId === taskToDelete.id);
            await taskService.deleteTask(currentProject.id, taskToDelete, subTasks);
            dispatch(addToast({ message: "Đã xóa công việc.", type: 'success' }));
        } catch (error) {
            console.error("Error deleting task:", error);
            dispatch(addToast({ message: "Lỗi khi xóa công việc.", type: 'error' }));
        } finally {
            setShowConfirmModal(false); setConfirmAction(null); setConfirmMessage('');
        }
    });
    setShowConfirmModal(true);
  }, [currentProject, currentUser, dispatch, setConfirmAction, setConfirmMessage, setShowConfirmModal]);

  // --- TASK LOG & COMMENT HANDLERS ---
  const handleUpdateTaskWithLog = useCallback(async (task: Task, logData: { log: TaskLog, updates: Partial<Task>, notification?: AppNotification }) => {
    if (!currentProject) return;
    const { log, updates, notification } = logData;
    try {
        const batch = writeBatch(db);
        const taskDocRef = doc(db, 'projects', currentProject.id, 'tasks', task.id);
        batch.update(taskDocRef, { ...updates, logs: arrayUnion(log) });
        if (notification) {
            const projectDocRef = doc(db, 'projects', currentProject.id);
            batch.update(projectDocRef, { notifications: arrayUnion(notification) });
        }
        await batch.commit();
        if (log.actionType === 'APPROVE' || log.actionType === 'REJECT') {
            dispatch(addToast({ message: "Đã cập nhật trạng thái nghiệm thu.", type: 'success' }));
        }
    } catch (error) {
        console.error("Error adding task log:", error);
        dispatch(addToast({ message: "Lỗi khi lưu nhật ký.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  const handleAddCommentToTask = useCallback(async (taskId: string, comment: Comment, notification?: AppNotification) => {
    if (!currentProject) return;
    try {
        await taskService.addCommentToTask(currentProject.id, taskId, comment);
        if (notification) {
            const projectDocRef = doc(db, 'projects', currentProject.id);
            await updateDoc(projectDocRef, { notifications: arrayUnion(notification) });
        }
    } catch (error) {
        console.error("Error adding comment:", error);
        dispatch(addToast({ message: "Lỗi khi gửi bình luận.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  const handleUploadTaskImage = useCallback(async (taskId: string, file: File): Promise<string | null> => {
    if (!currentProject) return null;
    try {
        return await taskService.uploadTaskImage(currentProject.id, taskId, file);
    } catch (error) {
        console.error("Error uploading task image:", error);
        dispatch(addToast({ message: "Lỗi khi tải ảnh lên.", type: 'error' }));
        return null;
    }
  }, [currentProject, dispatch]);

  // --- COST HANDLERS ---
  const handleUpdateTaskUnitPrice = useCallback(async (taskId: string, unitPrice: number) => {
    if (!currentProject || !currentUser) return;
    try {
        await costService.updateTaskUnitPrice(currentProject.id, taskId, unitPrice);
    } catch (error) {
        console.error("Error updating unit price:", error);
        dispatch(addToast({ message: "Lỗi khi cập nhật đơn giá.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleAddPaymentLog = useCallback(async (task: Task, log: Omit<PaymentLog, 'id' | 'payerId' | 'payerName'>) => {
    if (!currentProject || !currentUser) return;
    const fullLog: PaymentLog = { ...log, id: `pay_${Date.now()}`, payerId: currentUser.id, payerName: currentUser.fullname };
    try {
        await costService.addPaymentLog(currentProject.id, task, fullLog);
        dispatch(addToast({ message: "Đã thêm thanh toán.", type: 'success' }));
    } catch (error) {
        console.error("Error adding payment log:", error);
        dispatch(addToast({ message: "Lỗi khi thêm thanh toán.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  // --- STAKEHOLDER HANDLERS ---
  const handleAddStakeholder = useCallback(async (stakeholder: Omit<Stakeholder, 'id'>) => {
    if (!currentProject || !currentUser) return;
    const fullStakeholder: Stakeholder = { ...stakeholder, id: `sh_${Date.now()}` };
    try {
        await stakeholderService.addStakeholder(currentProject.id, fullStakeholder);
        dispatch(addToast({ message: "Đã thêm bên liên quan.", type: 'success' }));
    } catch (error) {
        console.error("Error adding stakeholder:", error);
        dispatch(addToast({ message: "Lỗi khi thêm bên liên quan.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleRemoveStakeholder = useCallback(async (stakeholderId: string) => {
    if (!currentProject) return;
    try {
        // Logic được implement trực tiếp để sửa lỗi build. Lý tưởng nhất, logic này nên nằm trong `stakeholderService.ts`.
        const projectDocRef = doc(db, 'projects', currentProject.id);
        const stakeholderToRemove = currentProject.stakeholders?.find(sh => sh.id === stakeholderId);
        if (stakeholderToRemove) {
            await updateDoc(projectDocRef, {
                stakeholders: arrayRemove(stakeholderToRemove)
            });
        } else {
            throw new Error("Không tìm thấy bên liên quan trong dự án hiện tại.");
        }
        dispatch(addToast({ message: "Đã xóa bên liên quan.", type: 'success' }));
    } catch (error) {
        console.error("Error removing stakeholder:", error);
        dispatch(addToast({ message: "Lỗi khi xóa bên liên quan.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  // --- REPORT HANDLER ---
  const handleGenerateReport = useCallback(async (report: ProjectReport) => {
    if (!currentProject) return;
    try {
        await reportService.addReport(currentProject.id, report);
        dispatch(addToast({ message: "Đã tạo báo cáo quản trị thành công.", type: 'success' }));
    } catch (error) {
        console.error("Error generating executive report:", error);
        dispatch(addToast({ message: "Lỗi khi tạo báo cáo.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  // --- SETTINGS HANDLER ---
  const handleUpdateSettings = useCallback(async (newSettings: AppSettings) => {
    if (!currentUser) return;
    localStorage.setItem('planmaster-theme', newSettings.theme);
    dispatch(setSettings(newSettings));
    const settingsDocRef = doc(db, 'userSettings', currentUser.id);
    try {
      await setDoc(settingsDocRef, newSettings, { merge: true });
    } catch (error) {
      console.error("Error updating settings: ", error);
    }
  }, [currentUser, dispatch]);

  // --- USER MANAGEMENT HANDLERS ---
  const handleAssignUserToProject = useCallback(async (userToAssign: User) => {
    if (!currentProject || !currentUser || currentUser.role !== UserRole.ADMIN) {
        dispatch(addToast({ message: "Bạn không có quyền thực hiện thao tác này.", type: 'error' }));
        return;
    }
    if (currentProject.memberUids?.includes(userToAssign.id)) {
        dispatch(addToast({ message: "Nhân sự này đã có trong dự án.", type: 'info' }));
        return;
    }
    try {
        // Logic được implement trực tiếp để sửa lỗi build. Lý tưởng nhất, logic này nên nằm trong `userService.ts`.
        const batch = writeBatch(db);
        const userDocRef = doc(db, 'users', userToAssign.id);
        batch.update(userDocRef, { status: UserStatus.ACTIVE });
        const projectDocRef = doc(db, 'projects', currentProject.id);
        batch.update(projectDocRef, { memberUids: arrayUnion(userToAssign.id) });
        await batch.commit();

        dispatch(addToast({ message: `Đã duyệt và thêm ${userToAssign.fullname} vào dự án.`, type: 'success' }));
        setSystemPendingUsers((prev: User[]) => prev.filter(u => u.id !== userToAssign.id));
    } catch (error: any) {
        console.error("Error assigning user to project: ", error);
        dispatch(addToast({ message: `Có lỗi xảy ra khi gán nhân sự: ${error.message || 'Lỗi không xác định'}`, type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch, setSystemPendingUsers]);

  const handleRejectUser = useCallback(async (userId: string) => {
    if (!currentUser || (!currentUser.role.toString().startsWith('Quản trị') && currentUser.role !== UserRole.ADMIN)) {
        dispatch(addToast({ message: "Bạn không có quyền từ chối nhân sự.", type: 'error' }));
        return;
    }
    setConfirmMessage("Bạn có chắc muốn từ chối vĩnh viễn và xóa tài khoản của người dùng này khỏi hệ thống? Hành động này không thể hoàn tác.");
    setConfirmAction(async () => {
        try {
            await userService.rejectUser(userId);
            dispatch(addToast({ message: "Đã từ chối và xóa yêu cầu của người dùng.", type: 'success' }));
            setSystemPendingUsers((prev: User[]) => prev.filter(u => u.id !== userId));
        } catch (error: any) {
            console.error("Error rejecting user: ", error);
            dispatch(addToast({ message: `Có lỗi xảy ra khi từ chối người dùng: ${error.message || 'Lỗi không xác định'}`, type: 'error' }));
        } finally {
            setShowConfirmModal(false); setConfirmAction(null); setConfirmMessage('');
        }
    });
    setShowConfirmModal(true);
  }, [currentUser, dispatch, setConfirmAction, setConfirmMessage, setShowConfirmModal, setSystemPendingUsers]);

  const handleAddExistingUserToProject = useCallback(async (userToAdd: User) => {
    if (!currentProject) return;
    if (currentProject.memberUids?.includes(userToAdd.id)) {
        dispatch(addToast({ message: "Người dùng này đã có trong dự án.", type: 'info' }));
        return;
    }
    try {
        await userService.addUserToProject(currentProject.id, userToAdd.id);
        dispatch(addToast({ message: `Đã thêm ${userToAdd.fullname} vào dự án.`, type: 'success' }));
    } catch (error) {
        console.error("Error adding existing user to project:", error);
        dispatch(addToast({ message: "Có lỗi xảy ra khi thêm người dùng.", type: 'error' }));
    }
  }, [currentProject, dispatch]);

  const handleRemoveUserFromCurrentProject = useCallback(async (userToRemove: User) => {
    if (!currentProject || !userToRemove || !currentUser) return;
    if (userToRemove.id === currentUser.id) {
        dispatch(addToast({ message: "Bạn không thể xóa chính mình khỏi dự án.", type: 'error' }));
        return;
    }
    if (userToRemove.id === currentProject.ownerId) {
        dispatch(addToast({ message: "Không thể xóa chủ sở hữu dự án.", type: 'error' }));
        return;
    }
    try {
        await userService.removeUserFromProject(currentProject.id, userToRemove.id);
        dispatch(addToast({ message: `Đã xóa ${userToRemove.fullname} khỏi dự án.`, type: 'success' }));
    } catch (error) {
        console.error("Error removing user from project:", error);
        dispatch(addToast({ message: "Có lỗi xảy ra khi xóa người dùng.", type: 'error' }));
    }
  }, [currentProject, currentUser, dispatch]);

  const handleAdminPasswordReset = useCallback(async (userToReset: User) => {
    if (!currentUser) return;
    setConfirmMessage(`Bạn có chắc muốn gửi email khôi phục mật khẩu cho ${userToReset.fullname}?`);
    setConfirmAction(async () => {
        const email = userToReset.phone.includes('@') ? userToReset.phone : `${userToReset.phone}@planmaster.vn`;
        try {
            await sendPasswordResetEmail(auth, email);
            dispatch(addToast({ message: `Đã gửi email khôi phục mật khẩu tới ${email}.`, type: 'success' }));
        } catch (error: any) {
            console.error("Error sending password reset email:", error);
            dispatch(addToast({ message: "Không thể gửi email khôi phục.", type: 'error' }));
        } finally {
            setShowConfirmModal(false); setConfirmAction(null); setConfirmMessage('');
        }
    });
    setShowConfirmModal(true);
  }, [currentUser, dispatch, setConfirmAction, setConfirmMessage, setShowConfirmModal]);

  // --- USER PROFILE & AUTH HANDLERS ---
  const handleUpdateUserProfile = useCallback(async (updates: { fullname?: string; avatarFile?: File | null }) => {
    if (!currentUser) return;
    let newAvatarUrl: string | undefined = undefined;
    if (updates.avatarFile) {
      try {
        const avatarRef = ref(storage, `avatars/${currentUser.id}/${updates.avatarFile.name}`);
        const snapshot = await uploadBytes(avatarRef, updates.avatarFile);
        newAvatarUrl = await getDownloadURL(snapshot.ref);
      } catch (error) {
        console.error("Error uploading avatar:", error);
        dispatch(addToast({ message: "Lỗi khi tải ảnh đại diện.", type: 'error' }));
        throw error;
      }
    }
    const dataToUpdate: Partial<User> = {};
    if (updates.fullname) dataToUpdate.fullname = updates.fullname;
    if (newAvatarUrl) dataToUpdate.avatar = newAvatarUrl;
    if (Object.keys(dataToUpdate).length > 0) {
      try {
        await userService.updateUser(currentUser.id, dataToUpdate);
      } catch (error) {
        console.error("Error updating user profile:", error);
        dispatch(addToast({ message: "Lỗi khi cập nhật hồ sơ.", type: 'error' }));
        throw error;
      }
    }
  }, [currentUser, dispatch]);

  const handleChangePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Không tìm thấy thông tin người dùng hoặc email.");
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
    } catch (error: any) {
      console.error("Password change error:", error);
      if (error.code === 'auth/wrong-password') throw new Error("Mật khẩu hiện tại không đúng.");
      throw new Error("Đã xảy ra lỗi khi đổi mật khẩu.");
    }
  }, []);

  const handleLogout = useCallback(() => signOut(auth), []);

  return {
    handleSelectProject, handleCreateProject,
    handleUpdateProjectDetails, handleUploadProjectDocument, handleRemoveProjectDocument,
    handleAddTask, handleUpdateTask, handleDeleteTask,
    handleUpdateTaskWithLog, handleAddCommentToTask, handleUploadTaskImage,
    handleUpdateTaskUnitPrice, handleAddPaymentLog,
    handleAddStakeholder, handleRemoveStakeholder,
    handleGenerateReport,
    handleUpdateSettings,
    handleAssignUserToProject, handleRejectUser, handleAddExistingUserToProject, handleRemoveUserFromCurrentProject, handleAdminPasswordReset,
    handleUpdateUserProfile, handleChangePassword, handleLogout
  };
};