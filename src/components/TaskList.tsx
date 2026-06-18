import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/Button';
import { Project, Task, User, UserRole, TaskStatus, AppNotification, PERMISSION_CONFIG, TaskLog, Comment } from '@/types';
import { generateUniqueId } from '@/utils/idUtils'; // Import from new utils file
import { Plus, Sparkles, Timer, FileUp, FileDown, ChevronDown, X, History, AlertTriangle, PlayCircle, XCircle, CheckCircle, ShieldCheck, Play, PauseCircle, Trash, CornerDownRight, MessageCircle, Search, Filter } from 'lucide-react';
import VietnameseInput from '@/components/VietnameseInput';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { TaskHistoryModal } from '@/components/TaskHistoryModal'; // This component is fine to keep
import { taskService } from '@/services/taskService'; // Import taskService
// import { generateTasksWithAI, optimizeScheduleWithAI } from '@/services/geminiService'; // COMMENTED OUT FOR SECURITY
import { parseCSV, exportTasksToCSV } from '@/utils/csvUtils'; // Import CSV utilities
import { Dispatch } from '@reduxjs/toolkit';
import { notificationService } from '@/services/notificationService'; // Centralized notification utility

const STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.NEW]: 'Mới tạo',
    [TaskStatus.IN_PROGRESS]: 'Đang thi công',
    [TaskStatus.BLOCKED]: 'Tạm dừng',
    [TaskStatus.WAITING_QC]: 'Chờ QC',
    [TaskStatus.WAITING_APPROVAL]: 'Chờ Nghiệm thu',
    [TaskStatus.COMPLETED]: 'Hoàn thành',
    [TaskStatus.REJECTED]: 'Khắc phục'
};

interface TaskRowProps {
    task: Task;
    idx: number;
    isManager: boolean;
    isViewer: boolean;
    isNVNT: boolean;
    isQCNT: boolean;
    isTVGS: boolean;
    isNVCDT: boolean;
    canEdit: boolean;
    userMap: Map<string, User>;
    project: Project;
    currentUser: User;
    managedUsers: User[];
    isDropdownOpen: boolean;
    onToggleAssigneeDropdown: (id: string | null) => void;
    onToggleAssignee: (taskId: string, userId: string) => void;
    onChange: (id: string, field: keyof Task, value: any) => void;
    onRemove: (task: Task) => void;
    onOpenHistory: (task: Task, isBlocking?: boolean) => void;
    onProcessAction: (task: Task, action: 'SUBMIT_QC' | 'CONFIRM_QC' | 'REJECT_QC') => void;
    onAddSubTask: (parentId: string) => void;
};

const TaskRow = React.memo(({ 
    task, idx, isManager, isViewer, isNVNT, isQCNT, isTVGS, isNVCDT, canEdit, 
    userMap, managedUsers, isDropdownOpen, project, currentUser,
    onToggleAssigneeDropdown, onToggleAssignee, onChange, onRemove, onOpenHistory, onProcessAction, onAddSubTask
}: TaskRowProps) => {

    const isOverdue = useMemo(() => {
        if (task.status === TaskStatus.COMPLETED) return false;
        return new Date(task.endDate) < new Date(new Date().setHours(0,0,0,0));
    }, [task.endDate, task.status]);

    const statusColor = useMemo(() => {
        switch(task.status) {
            case TaskStatus.NEW: return 'bg-gray-100 text-gray-600';
            case TaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
            case TaskStatus.BLOCKED: return 'bg-red-50 text-red-600 border border-red-200 animate-pulse';
            case TaskStatus.WAITING_QC: return 'bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300';
            case TaskStatus.WAITING_APPROVAL: return 'bg-purple-100 text-purple-700 ring-1 ring-purple-300';
            case TaskStatus.COMPLETED: return 'bg-green-100 text-green-700';
            case TaskStatus.REJECTED: return 'bg-red-100 text-red-700 font-bold';
            default: return 'bg-gray-100';
        }
    }, [task.status]);

    const isEditable = !isViewer && canEdit && (!isNVNT || task.parentId || task.status === TaskStatus.NEW);

    return (
        <tr className={`border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 group ${task.parentId ? 'bg-gray-50 dark:bg-gray-800/60' : ''} ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
            <td className="p-2 border-r dark:border-gray-700 text-sm text-center text-gray-500">
                {task.parentId ? <div className="flex justify-end pr-2"><CornerDownRight className="w-3 h-3 text-gray-400 dark:text-gray-500" /></div> : idx + 1}
            </td>
            
            <td className="p-2 border-r dark:border-gray-700">
                <VietnameseInput 
                    className="w-full bg-transparent border-transparent focus:ring-0 outline-none text-sm"
                    value={task.code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'code', e.target.value)}
                    readOnly={!isEditable}
                />
            </td>
            <td className="p-2 border-r dark:border-gray-700 relative">
                {isOverdue && <div className="absolute top-2 right-2"><AlertTriangle className="w-4 h-4 text-red-500" /></div>}
                <VietnameseInput 
                    className={`w-full bg-transparent border-transparent focus:ring-0 outline-none text-sm font-medium ${task.parentId ? 'pl-4 text-gray-600' : ''}`}
                    value={task.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'name', e.target.value)}
                    readOnly={!isEditable}
                />
                {!task.parentId && canEdit && (
                        <button onClick={() => onAddSubTask(task.id)} className="text-[10px] text-blue-500 hover:underline mt-1 block">+ Thêm việc phụ</button>
                )}
            </td>
            
            <td className="p-2 border-r dark:border-gray-700 relative">
                {isManager ? (
                    <>
                        <button onClick={() => onToggleAssigneeDropdown(isDropdownOpen ? null : task.id)} className="w-full text-left text-sm flex items-center justify-between px-2 py-1 rounded hover:bg-white dark:hover:bg-gray-700 border border-transparent hover:border-gray-300 dark:hover:border-gray-600">
                            <span className="truncate block max-w-[150px]">
                                {(!task.assignees || task.assignees.length === 0) 
                                    ? <span className="text-gray-400 italic">Chọn nhân sự...</span>
                                    : <div className="flex -space-x-1 overflow-hidden py-1">
                                        {task.assignees.map((userId: string) => {
                                            const u = userMap.get(userId);
                                            return u ? <img key={u.id} src={u.avatar} title={u.fullname} className="inline-block h-6 w-6 rounded-full ring-2 ring-white" alt="avt" /> : null;
                                        })}
                                        <span className="ml-2 text-xs text-blue-700 self-center font-medium">({task.assignees.length})</span>
                                        </div>
                                }
                            </span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2">
                                <div className="flex justify-between items-center mb-2 px-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <div className="text-xs font-bold text-gray-500 uppercase">Chọn người thực hiện</div>
                                    <button 
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                            e.stopPropagation();
                                            onToggleAssigneeDropdown(null);
                                        }} 
                                        className="text-gray-400 hover:text-red-500 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                                        title="Đóng"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div> 
                                <div className="max-h-48 overflow-y-auto space-y-1">
                                    {managedUsers.map((u: User) => (
                                        <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded cursor-pointer">
                                            <input type="checkbox" className="rounded border-gray-300 text-blue-600" checked={task.assignees?.includes(u.id) || false} onChange={() => onToggleAssignee(task.id, u.id)} />
                                            <div className="flex items-center gap-2">
                                                <img src={u.avatar} className="w-6 h-6 rounded-full" alt="avt"/>
                                                <div><div className="text-sm font-medium text-gray-700">{u.fullname}</div><div className="text-[10px] text-gray-400">{u.role}</div></div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex -space-x-1 overflow-hidden px-2">
                        {task.assignees?.map((userId: string) => {
                            const u = userMap.get(userId);
                            return u ? <img key={u.id} src={u.avatar} title={u.fullname} className="inline-block h-6 w-6 rounded-full ring-2 ring-white" alt="avt" /> : null;
                        })}
                    </div>
                )}
            </td>

            <td className="p-2 border-r dark:border-gray-700">
                <VietnameseInput 
                    className="w-full bg-transparent border-transparent focus:ring-0 outline-none text-sm" 
                    value={task.unit} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'unit', e.target.value)}
                    readOnly={!isEditable} />
            </td>
            <td className="p-2 border-r dark:border-gray-700"><input type="number" className="w-full bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded-md transition-colors duration-150 outline-none text-sm" value={task.quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'quantity', Number(e.target.value))} readOnly={!isEditable} /></td>
            <td className="p-2 border-r dark:border-gray-700 text-center cursor-pointer" onClick={() => onOpenHistory(task)}>
                <div className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-1">{(task.completedQuantity || 0).toLocaleString()} <History className="w-3 h-3 text-gray-400" /></div>
                <div className="text-[10px] text-gray-400">{task.progress}%</div>
            </td>
            <td className="p-2 border-r dark:border-gray-700"><input type="date" className="w-full bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded-md transition-colors duration-150 outline-none text-sm text-gray-600 dark:text-gray-400" value={task.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'startDate', e.target.value)} readOnly={!isEditable} /></td>
            <td className="p-2 border-r dark:border-gray-700"><input type="date" className={`w-full bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded-md transition-colors duration-150 outline-none text-sm ${isOverdue ? 'text-red-600 font-bold' : 'text-gray-600 dark:text-gray-400'}`} value={task.endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(task.id, 'endDate', e.target.value)} readOnly={!isEditable} /></td>
            <td className="p-2 border-r dark:border-gray-700"><span className={`px-2 py-1 rounded text-xs font-semibold ${statusColor} block text-center truncate`}>{task.status}</span></td>
            
            <td className="p-2 border-r dark:border-gray-700 text-center min-w-[120px]">
                <div className="flex gap-2 justify-center">
                    {isNVNT && (['IN_PROGRESS', 'REJECTED', 'NEW'].includes(task.status)) && <button onClick={() => onProcessAction(task, 'SUBMIT_QC')} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-1 rounded" title="Báo cáo hoàn thành (Gửi QC)"><PlayCircle className="w-5 h-5" /></button>}
                    {isQCNT && task.status === TaskStatus.WAITING_QC && <><button onClick={() => onProcessAction(task, 'REJECT_QC')} className="text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 p-1 rounded" title="Từ chối"><XCircle className="w-5 h-5" /></button><button onClick={() => onProcessAction(task, 'CONFIRM_QC')} className="text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded" title="Xác nhận đạt (Gửi TVGS)"><CheckCircle className="w-5 h-5" /></button></>}
                    {isTVGS && task.status === TaskStatus.WAITING_APPROVAL && <button onClick={() => onOpenHistory(task)} className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs font-bold"><ShieldCheck className="w-4 h-4" /> Nghiệm thu</button>}
                    {isNVCDT && task.status === TaskStatus.COMPLETED && <span className="text-xs text-green-600 dark:text-green-400 font-bold">OK</span>}
                    {canEdit && task.status !== TaskStatus.COMPLETED && (
                        task.status === TaskStatus.BLOCKED 
                        ? <button onClick={() => onOpenHistory(task)} className="text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 p-1 rounded" title="Tiếp tục thi công"><Play className="w-5 h-5" /></button>
                        : <button onClick={() => onOpenHistory(task, true)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-1 rounded" title="Báo cáo vướng mắc"><PauseCircle className="w-5 h-5" /></button>
                    )}
                </div>
            </td>
            {!isViewer && <td className="p-2 text-center"><button onClick={() => onRemove(task)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400"><Trash className="w-4 h-4" /></button></td>}
        </tr>
    );
});

interface Props {
  project: Project;
  // onUpdate: (project: Project) => void; // No longer needed, taskService handles updates
  currentUser: User;
  // Callbacks from App.tsx, now directly used by TaskList
  onAddTask: (parentId: string | null) => Promise<void>;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskToDelete: Task) => Promise<void>;
  onUpdateTaskWithLog: (task: Task, logData: { log: TaskLog, updates: Partial<Task>, notification?: AppNotification }) => Promise<void>;
  onAddCommentToTask: (taskId: string, comment: Comment, notification?: AppNotification) => Promise<void>;
  onUploadTaskImage: (taskId: string, file: File) => Promise<string | null>;
}
export const TaskList: React.FC<Props> = ({ 
    project, currentUser, 
    onAddTask, onUpdateTask, onDeleteTask, onUpdateTaskWithLog, onAddCommentToTask, onUploadTaskImage 
}) => {

  const dispatch = useDispatch();
  // const [isGenerating, setIsGenerating] = useState(false); // COMMENTED OUT FOR SECURITY
  const [selectedTaskForHistory, setSelectedTaskForHistory] = useState<Task | null>(null);
  const [activeAssignDropdownId, setActiveAssignDropdownId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [pendingImportTasks, setPendingImportTasks] = useState<Task[]>([]);
  // const [showAiOptModal, setShowAiOptModal] = useState(false);  // COMMENTED OUT FOR SECURITY
  // const [isOptimizing, setIsOptimizing] = useState(false); // COMMENTED OUT FOR SECURITY
  // --- NEW: State for Search and Filter ---
  const [inputValue, setInputValue] = useState(''); // Immediate value from input
  const [searchTerm, setSearchTerm] = useState(''); // Debounced value for filtering
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');

  const isNVNT = currentUser.role === UserRole.NVNT;
  const isQCNT = currentUser.role === UserRole.QCNT;
  const isQTNT = currentUser.role === UserRole.QTNT;
  const isNVCDT = currentUser.role === UserRole.NVCDT;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  const isTVGS = currentUser.role === UserRole.NVTVGS || currentUser.role === UserRole.QTTVGS;
  const isManager = [UserRole.QTCDT, UserRole.QTNT, UserRole.QTTVTK, UserRole.QTTVGS, UserRole.ADMIN].includes(currentUser.role);
  const canEdit = PERMISSION_CONFIG[currentUser.role].TASKS.edit;
  const isViewer = !canEdit;
  const canSuggestAi = isAdmin || currentUser.role === UserRole.QTCDT || isQTNT;

  const userMap = useMemo(() => {
      const map = new Map<string, User>();
      project.team.forEach((u: User) => map.set(u.id, u));
      return map;
  }, [project.team]);

  const managedUsers = useMemo(() => {
      return project.team.filter((u: User) => {
        if (isAdmin) return true;
        return u.managerPhone === currentUser.phone || u.id === currentUser.id;
      });
  }, [project.team, isAdmin, currentUser.phone, currentUser.id]);

  // --- HELPER: Create Notification ---
  // Moved to notificationService.ts (now accessed via notificationService.createNotification)
  const createNotification = useCallback((title: string, message: string, type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR', recipientIds: string[], taskId?: string): AppNotification => {
    return notificationService.createNotification(title, message, type, recipientIds, taskId, currentUser.fullname);
  }, [currentUser.fullname]);

  // Debounce search term to avoid re-filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
        setSearchTerm(inputValue);
    }, 300); // 300ms delay

    return () => {
        clearTimeout(timer);
    };
  }, [inputValue]); // Re-run effect only when inputValue changes

  const filteredTasks = useMemo(() => {
    return project.tasks
      .filter((t: Task) => { // 1. Role-based visibility filter
        if (isManager || isViewer) return true;
        return t.assignees && t.assignees.includes(currentUser.id);
      })
      .filter((t: Task) => { // 2. Status filter
        if (statusFilter === 'ALL') return true;
        return t.status === statusFilter;
      })
      .filter((t: Task) => { // 3. Search term filter
        if (!searchTerm.trim()) return true;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return (
          t.name.toLowerCase().includes(lowerCaseSearch) ||
          t.code.toLowerCase().includes(lowerCaseSearch)
        );
      });
  }, [project.tasks, isManager, isViewer, currentUser.id, statusFilter, searchTerm]);

  const getUsersByRole = useCallback((roles: UserRole[]) => {
      return project.team.filter((u: User) => roles.includes(u.role)).map((u: User) => u.id);
  }, [project.team]);

  // --- OPTIMIZED HANDLERS (useCallback to prevent recreating functions) ---

  const handleChange = useCallback(async (id: string, field: keyof Task, value: any) => {
    if (!canEdit) return;
    await onUpdateTask(id, { [field]: value });
  }, [canEdit, onUpdateTask]);

  // useCallback is fine here as it depends on project.id and currentUser which are stable or in the dep array.
  const toggleAssignee = useCallback(async (taskId: string, userId: string) => {
      if (!canEdit) return;
      // taskService will handle the update and notification
      await taskService.toggleAssignee(project.id, taskId, userId, currentUser);
  }, [canEdit, project.id, currentUser]); // taskService is a stable object
  
  const removeTask = useCallback(async (taskToDelete: Task) => {
    await onDeleteTask(taskToDelete); // Call parent's handler
  }, [onDeleteTask]);

  // Process Action Logic (QC, Approve, etc.)
  // Removed useCallback to ensure this function always has the latest project data
  const handleProcessAction = useCallback(async (task: Task, action: 'SUBMIT_QC' | 'CONFIRM_QC' | 'REJECT_QC') => {
      let newStatus = task.status;
      let logNote = '';
      let notification: AppNotification | null = null;
      let processingTime = 0;

      // Helper to calculate time
      const calcTime = (targetStatus: TaskStatus) => {
          const triggerLog = task.logs.find((l: TaskLog) => {
              if (targetStatus === TaskStatus.WAITING_QC) return l.actionType === 'SUBMIT_QC';
              if (targetStatus === TaskStatus.WAITING_APPROVAL) return l.actionType === 'CONFIRM_QC';
              return false;
          });
          if (triggerLog) {
              return Math.round((new Date().getTime() - new Date(triggerLog.timestamp).getTime()) / (1000 * 60));
          }
          return 0;
      };

      if (action === 'SUBMIT_QC') {
          newStatus = TaskStatus.WAITING_QC;
          logNote = 'NVNT báo hoàn thành -> Gửi QCNT xác nhận';
          // Notify QC Team
          const recipients = getUsersByRole([UserRole.QCNT, UserRole.QSNT, UserRole.QTNT]);
          if (recipients.length > 0) {
              notification = createNotification('🔔 Yêu cầu kiểm tra (QC)', `${currentUser.fullname} báo hoàn thành "${task.code}". Mời QC kiểm tra.`, 'INFO', recipients, task.id);
          }
      } else if (action === 'CONFIRM_QC') {
          newStatus = TaskStatus.WAITING_APPROVAL;
          logNote = 'QCNT xác nhận đạt -> RFI TVGS';
          processingTime = calcTime(TaskStatus.WAITING_QC);
          // Notify TVGS Team and NVNT
          const recipients = [...getUsersByRole([UserRole.QTTVGS, UserRole.NVTVGS]), ...(task.assignees || [])];
          if (recipients.length > 0) {
             notification = createNotification('🚀 Yêu cầu nghiệm thu (RFI)', `QC đã duyệt "${task.code}". Gửi RFI đến TVGS.`, 'INFO', recipients, task.id);
          }
      } else if (action === 'REJECT_QC') {
          newStatus = TaskStatus.REJECTED;
          logNote = 'QCNT từ chối';
          processingTime = calcTime(TaskStatus.WAITING_QC);
          // Notify Assignees (NVNT)
          const recipients = task.assignees || [];
          if (recipients.length > 0) {
              notification = createNotification('❌ QC Không đạt', `QC từ chối "${task.code}". Cần khắc phục gấp!`, 'WARNING', recipients, task.id);
          }
      }

      // Call taskService to handle the action, which will create log and notification
      // Instead of calling taskService directly, we should use the onUpdateTaskWithLog prop
      // which is designed to handle both log and notification updates in App.tsx.
      const log: TaskLog = {
          id: generateUniqueId('log'), timestamp: new Date().toISOString(), startTime: new Date().toISOString(), endTime: new Date().toISOString(),
          amount: 0, userId: currentUser.id, userName: currentUser.fullname, userRole: currentUser.role,
          note: logNote, images: [], actionType: action,
      };
      if (processingTime > 0) log.processingTime = processingTime;

      const updates: Partial<Task> = { status: newStatus };
      await onUpdateTaskWithLog(task, { log, updates, notification });
  }, [getUsersByRole, createNotification, onUpdateTaskWithLog]);

  // Log Modal Handlers
  const openHistoryModal = useCallback((task: Task, isBlocking: boolean = false) => {
    setSelectedTaskForHistory(task);
    // Pass the blocking intent to the modal
    // The modal will now manage its own internal state, including 'isBlocking'
  }, []);

  // AI & File Handlers
  // const handleGenerateAI = async () => {
  //     if (!confirm("AI sẽ tạo danh sách công việc. Tiếp tục?")) return;
  //     if (!project.id) return;
  //     setIsGenerating(true);
  //     const aiTasks = await generateTasksWithAI(project.name, project.description);
  //     if (aiTasks.length > 0) {
  //         await taskService.addMultipleTasks(project.id, aiTasks);
  //         dispatch(addToast({ message: `Đã tạo ${aiTasks.length} công việc mẫu.`, type: 'success' }));
  //     } else dispatch(addToast({ message: "Lỗi tạo việc (Kiểm tra API Key).", type: 'error' }));
  //     setIsGenerating(false);
  // };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) return;
          
          const importedTasks = parseCSV(text, project.tasks.length);

          if (importedTasks.length > 0) {
              setPendingImportTasks(importedTasks);
              setShowImportModal(true);
          } else {
              dispatch(addToast({ message: "Không tìm thấy dữ liệu hợp lệ trong file.", type: 'info' }));
          }
          
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleExportExcel = () => {
      if (!project.id) return;
      exportTasksToCSV(project.tasks, userMap, project.id);
      dispatch(addToast({ message: "Đã xuất dữ liệu công việc ra file CSV.", type: 'success' }));
  };
  return (
    <>
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col h-[calc(100vh-200px)] relative">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-3 items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-t-xl flex-shrink-0">
        <div className="flex gap-2 items-center flex-wrap">
            {!isViewer && <Button onClick={() => onAddTask(null)} variant="primary" className="text-sm" disabled={!project.id} title={!project.id ? "Đang chờ dữ liệu dự án..." : "Thêm công việc mới"}><Plus className="w-4 h-4" /> Thêm công việc</Button>}
            {/* {!isViewer && canSuggestAi && (
                <>
                    <Button onClick={handleGenerateAI} isLoading={isGenerating} variant="secondary" className="text-purple-600 border-purple-200 hover:bg-purple-50 text-sm"><Sparkles className="w-4 h-4 mr-1" /> AI Plan</Button>
                    <Button onClick={() => setShowAiOptModal(true)} variant="secondary" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-sm"><Timer className="w-4 h-4 mr-1" /> Optimize</Button>
                </>
            )} */}
        </div>
        {/* --- NEW: Search and Filter Controls --- */}
        <div className="flex gap-2 items-center flex-grow md:flex-grow-0">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                    type="text"
                    placeholder="Tìm theo tên, mã CV..."
                    value={inputValue}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                />
            </div>
            <select
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as TaskStatus | 'ALL')}
                className="py-2 pl-3 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
            >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                ))}
            </select>
        </div>
        <div className="flex gap-1 ml-auto">
            {!isViewer && (
                <>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileImport} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Import CSV"><FileUp className="w-5 h-5"/></button>
                </>
            )}
            <button onClick={handleExportExcel} className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Export"><FileDown className="w-5 h-5"/></button>
        </div>
      </div>

      <div className="hidden md:block overflow-auto flex-1 relative min-h-[400px]">
        <table className="w-full text-left border-collapse min-w-[1300px]">
          <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm dark:shadow-none">
            <tr>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">STT</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-24">Mã CV</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[200px]">Tên công việc</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-52">Giao việc</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-20">ĐVT</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-24">Khối lượng</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-blue-600 dark:text-blue-400 w-28">Thực hiện</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-32">Bắt đầu</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-32">Hoàn thành</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-32">Trạng thái</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-40 text-center">Hành động</th>
              {!isViewer && <th className="p-3 border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">Xóa</th>}
            </tr>
          </thead>
          <tbody>
            {filteredTasks.map((task: Task, idx) => (
                <TaskRow 
                    key={task.id} 
                    task={task} 
                    idx={idx}
                    isManager={isManager}
                    isViewer={isViewer}
                    isNVNT={isNVNT}
                    isQCNT={isQCNT}
                    isTVGS={isTVGS}
                    project={project} // Pass project and currentUser for TaskRow's internal logic
                    currentUser={currentUser}
                    isNVCDT={isNVCDT}
                    canEdit={canEdit}
                    userMap={userMap}
                    managedUsers={managedUsers}
                    isDropdownOpen={activeAssignDropdownId === task.id}
                    onToggleAssigneeDropdown={setActiveAssignDropdownId}
                    onToggleAssignee={toggleAssignee}
                    onChange={handleChange}
                    onRemove={removeTask}
                    onOpenHistory={openHistoryModal}
                    onProcessAction={handleProcessAction}
                    onAddSubTask={onAddTask}
                />
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE LIST (Optimized) */}
      <div className="md:hidden overflow-auto flex-1 p-4 bg-gray-50 dark:bg-gray-900/50 space-y-4">
          {filteredTasks.map((task: Task) => (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 relative">
                  <div className="flex justify-between items-start mb-2">
                      <div className="font-bold text-gray-800 dark:text-gray-200 text-sm">{task.code} - <span className={`px-2 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700`}>{task.status}</span></div>
                      <button onClick={() => openHistoryModal(task)} className="p-1.5 bg-blue-50 text-blue-600 rounded flex items-center gap-1 text-xs font-bold"><History className="w-4 h-4"/> Log</button>
                  </div>
                  <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">{task.name}</div>
              </div>
          ))}
      </div>

      {/* MODALS (Fixed Height Layout) */}
      {selectedTaskForHistory && (
        <TaskHistoryModal
            task={selectedTaskForHistory}
            team={project.team}
            currentUser={currentUser}
            canEdit={canEdit}
            isBlocking={selectedTaskForHistory.status === TaskStatus.BLOCKED || (selectedTaskForHistory.status !== TaskStatus.COMPLETED && selectedTaskForHistory.status !== TaskStatus.WAITING_APPROVAL)}
            isTVGS={isTVGS}
            project={project} // Pass project for notification logic
            onClose={() => setSelectedTaskForHistory(null)}
            onUpdateTaskWithLog={onUpdateTaskWithLog}
            onAddCommentToTask={onAddCommentToTask}
            onUploadTaskImage={onUploadTaskImage}
        />
      )}

      {/* IMPORT MODAL */}
      {showImportModal && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full text-gray-800 dark:text-gray-200">
                  <h3 className="font-bold mb-4">Xác nhận nhập {pendingImportTasks.length} công việc</h3>
                  <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => {setPendingImportTasks([]); setShowImportModal(false);}}>Hủy</Button>
                      <Button onClick={() => { 
                          if (project.id) taskService.addMultipleTasks(project.id, pendingImportTasks);
                          setShowImportModal(false); 
                      }}>Xác nhận</Button>
                  </div>
              </div>
          </div>
      )}

      {/* OPTIMIZE MODAL - COMMENTED OUT FOR SECURITY
      {showAiOptModal && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full space-y-4 text-gray-800 dark:text-gray-200 animate-in zoom-in-95">
                  <h3 className="font-bold text-indigo-700">AI Tối ưu tiến độ</h3>
                  <p className="text-sm text-gray-600">Tính năng này đang được phát triển và sẽ sớm ra mắt.</p>
                  <Button onClick={async () => { // TODO: Implement taskService.optimizeSchedule
                      setIsOptimizing(true);
                      const optimizedSchedules = await optimizeScheduleWithAI(project.tasks, new Date().toISOString().split('T')[0], 30);
                      await taskService.batchUpdateTasks(project.id, optimizedSchedules);
                      setIsOptimizing(false);
                      setShowAiOptModal(false);
                  }} isLoading={isOptimizing} className="w-full" disabled>Chạy Tối ưu</Button>
                  <button onClick={() => setShowAiOptModal(false)} className="w-full text-center text-xs text-gray-500 hover:underline">Đóng</button>
              </div>
          </div>
       )} */}
    </div>
    </>
  );
};
