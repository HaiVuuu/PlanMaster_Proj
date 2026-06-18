import {
  doc,
  setDoc,
  arrayUnion,
  updateDoc,
  deleteDoc,
  collection,
  writeBatch,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { Task, TaskLog, TaskStatus, Comment, AppNotification, User, UserRole } from '../types';
import { generateUniqueId } from '../utils/idUtils';

export const taskService = {
  async addTask(projectId: string, parentId: string | null, existingTasks: Task[]): Promise<void> {
    const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
    
    let newCode = '';
    if (parentId) {
        const parentTask = existingTasks.find((t: Task) => t.id === parentId);
        if (parentTask) {
            const subtaskCount = existingTasks.filter((t: Task) => t.parentId === parentId).length;
            newCode = `${parentTask.code}.${subtaskCount + 1}`;
        }
    } else {
        newCode = `NEW-${existingTasks.filter((t: Task) => !t.parentId).length + 1}`;
    }

    const newTask: Task = {
        id: generateUniqueId('task'),
        parentId: parentId,
        order: existingTasks.length,
        code: newCode,
        name: parentId ? 'Công việc phụ/phát sinh' : 'Công việc mới',
        unit: '',
        quantity: 0,
        completedQuantity: 0,
        logs: [],
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        progress: 0,
        status: TaskStatus.NEW,
        assignees: []
    };
    const taskDocRef = doc(tasksCollectionRef, newTask.id);
    await setDoc(taskDocRef, newTask);
  },

  async addMultipleTasks(projectId: string, tasks: Task[]): Promise<void> {
    const batch = writeBatch(db);
    const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
    tasks.forEach((task: Task) => {
      // Ensure IDs are unique if not already set by the generator
      const finalTask = { ...task, id: task.id || generateUniqueId('task') };
      const taskDocRef = doc(tasksCollectionRef, finalTask.id);
      batch.set(taskDocRef, finalTask);
    });
    await batch.commit();
  },

  async updateTask(projectId: string, taskId: string, updates: Partial<Task>): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskDocRef, updates);
  },

  async batchUpdateTasks(projectId: string, taskUpdates: { id: string, startDate: string, endDate: string }[]): Promise<void> {
    const batch = writeBatch(db);
    const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');
    taskUpdates.forEach((update: { id: string, startDate: string, endDate: string }) => {
        const taskDocRef = doc(tasksCollectionRef, update.id);
        batch.update(taskDocRef, { startDate: update.startDate, endDate: update.endDate });
    });
    await batch.commit();
  },

  async updateTaskWithNewLog(projectId: string, taskId: string, log: TaskLog, taskUpdates: Partial<Task>): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskDocRef, {
      ...taskUpdates,
      logs: arrayUnion(log)
    });
  },

  async addCommentToTask(projectId: string, taskId: string, comment: Comment): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskDocRef, {
      comments: arrayUnion(comment)
    });
  },

  async deleteTask(projectId: string, taskToDelete: Task, subTasks: Task[]): Promise<void> {
    const batch = writeBatch(db);
    const tasksCollectionRef = collection(db, 'projects', projectId, 'tasks');

    const allTasksToDelete = [taskToDelete, ...subTasks];
    
    for (const task of allTasksToDelete) {
        const taskDocRef = doc(tasksCollectionRef, task.id);
        batch.delete(taskDocRef);

        for (const log of task.logs) {
            if (log.images) {
                for (const imageUrl of log.images) {
                    try {
                        const imageRef = ref(storage, imageUrl);
                        await deleteObject(imageRef);
                    } catch (error: any) {
                        if (error.code !== 'storage/object-not-found') console.error("Error deleting image from storage: ", error);
                    }
                }
            }
        }
    }
    await batch.commit();
  },

  async uploadTaskImage(projectId: string, taskId: string, file: File): Promise<string> {
    const uniqueName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `projects/${projectId}/tasks/${taskId}/${uniqueName}`);
    const uploadResult = await uploadBytes(storageRef, file);
    return await getDownloadURL(uploadResult.ref);
  },

  // --- NEW LOGIC MOVED FROM COMPONENT ---

  createNotification(title: string, message: string, type: AppNotification['type'], recipientIds: string[], taskId: string, senderName: string): AppNotification {
    return {
        id: generateUniqueId('notif'),
        title,
        message,
        timestamp: new Date().toISOString(),
        isRead: false,
        type,
        recipientIds,
        taskId,
        senderName
    };
  },

  async toggleAssignee(projectId: string, taskId: string, userId: string, currentUser: User): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    const taskSnapshot = await getDoc(taskDocRef);
    if (!taskSnapshot.exists()) return;

    const task = taskSnapshot.data() as Task;
    const isAssigned = task.assignees?.includes(userId);

    const updatePayload = {
        assignees: isAssigned ? arrayRemove(userId) : arrayUnion(userId)
    };

    await updateDoc(taskDocRef, updatePayload);

    // Create notification for the user being assigned/unassigned
    const userToNotify = [userId];
    if (userToNotify.length > 0 && userId !== currentUser.id) {
        const title = isAssigned ? 'Bỏ giao việc' : '✅ Giao việc mới';
        const message = `${currentUser.fullname} đã ${isAssigned ? 'bỏ giao' : 'giao'} bạn công việc "${task.code}"`;
        const notification = this.createNotification(title, message, 'INFO', userToNotify, taskId, currentUser.fullname);
        
        const projectDocRef = doc(db, 'projects', projectId);
        await updateDoc(projectDocRef, { notifications: arrayUnion(notification) });
    }
  },

  async processTaskAction(projectId: string, task: Task, action: 'SUBMIT_QC' | 'CONFIRM_QC' | 'REJECT_QC', currentUser: User, team: User[], logNote: string, processingTime: number): Promise<void> {
    const getUsersByRole = (roles: UserRole[]) => {
        return team.filter((u: User) => roles.includes(u.role)).map((u: User) => u.id);
    };

    let newStatus = task.status;
    let notification: AppNotification | null = null;

    if (action === 'SUBMIT_QC') {
        newStatus = TaskStatus.WAITING_QC;
        const recipients = getUsersByRole([UserRole.QCNT, UserRole.QSNT, UserRole.QTNT]);
        if (recipients.length > 0) {
            notification = this.createNotification('🔔 Yêu cầu kiểm tra (QC)', `${currentUser.fullname} báo hoàn thành "${task.code}". Mời QC kiểm tra.`, 'INFO', recipients, task.id, currentUser.fullname);
        }
    } else if (action === 'CONFIRM_QC') {
        newStatus = TaskStatus.WAITING_APPROVAL;
        const recipients = [...getUsersByRole([UserRole.QTTVGS, UserRole.NVTVGS]), ...(task.assignees || [])];
        if (recipients.length > 0) {
           notification = this.createNotification('🚀 Yêu cầu nghiệm thu (RFI)', `QC đã duyệt "${task.code}". Gửi RFI đến TVGS.`, 'INFO', recipients, task.id, currentUser.fullname);
        }
    } else if (action === 'REJECT_QC') {
        newStatus = TaskStatus.REJECTED;
        const recipients = task.assignees || [];
        if (recipients.length > 0) {
            notification = this.createNotification('❌ QC Không đạt', `QC từ chối "${task.code}". Cần khắc phục gấp!`, 'WARNING', recipients, task.id, currentUser.fullname);
        }
    }

    const log: TaskLog = {
        id: generateUniqueId('log'),
        timestamp: new Date().toISOString(),
        amount: 0,
        userId: currentUser.id,
        userName: currentUser.fullname,
        userRole: currentUser.role,
        note: logNote,
        actionType: action,
        processingTime: processingTime > 0 ? processingTime : undefined
    };

    await this.updateTaskWithNewLog(projectId, task.id, log, { status: newStatus });
    if (notification) {
        const projectDocRef = doc(db, 'projects', projectId);
        await updateDoc(projectDocRef, { notifications: arrayUnion(notification) });
    }
  }
};