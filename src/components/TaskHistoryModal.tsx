import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Task, User, TaskLog, Comment, UserRole, TaskStatus, AppNotification, Project } from '@/types';
import { Button } from '@/components/Button';
import { X, Mic, Camera, Siren, Clock, CheckCircle2, Send } from 'lucide-react';
import VietnameseInput from '@/components/VietnameseInput';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { taskService } from '@/services/taskService'; // Import taskService
import { generateUniqueId } from '@/utils/idUtils';
import { notificationService } from '@/services/notificationService'; // Import the notificationService object
import { storageService } from '@/services/storageService'; // Import storageService

interface Props {
    task: Task;
    team: User[];
    currentUser: User;
    project: Project; // Added project for notification context
    canEdit: boolean;
    isTVGS: boolean;
    isBlocking: boolean; // New prop to control initial state
    onClose: () => void;
    onUpdateTaskWithLog: (task: Task, logData: { log: TaskLog, updates: Partial<Task>, notification?: AppNotification }) => Promise<void>; // This is fine
    onAddCommentToTask: (taskId: string, comment: Comment, notification?: AppNotification) => Promise<void>; // Changed from void to Promise<void>
    onUploadTaskImage: (taskId: string, file: File) => Promise<string | null>;
}

export const TaskHistoryModal: React.FC<Props> = ({ task, team, currentUser, project, canEdit, isTVGS, isBlocking: initialIsBlocking, onClose, onUpdateTaskWithLog, onAddCommentToTask, onUploadTaskImage }) => {
    const dispatch = useDispatch();
    const [modalTab, setModalTab] = useState<'LOG' | 'DISCUSS'>('LOG');
    const [newComment, setNewComment] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [safetyIssues, setSafetyIssues] = useState<string[]>([]);
    const [tvgsDecision, setTvgsDecision] = useState<'OK' | 'NOT_OK' | null>(null); // For TVGS approval
    const [isBlocking, setIsBlocking] = useState(initialIsBlocking); // Controlled by prop
    const [isUrgent, setIsUrgent] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const [newLog, setNewLog] = useState<{ amount: number, note: string, images: string[], startTime: string, endTime: string }>({
        amount: 0, note: '', images: [], startTime: '', endTime: ''
    });

    const getUsersByRole = useCallback((roles: UserRole[]) => {
        return team.filter((u: User) => roles.includes(u.role)).map((u: User) => u.id);
    }, [team]);

    useEffect(() => {
        const now = new Date();
        const formatDT = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        setNewLog({ amount: 0, note: '', images: [], startTime: formatDT(now), endTime: formatDT(now) });
        setModalTab('LOG');
        setIsBlocking(initialIsBlocking); // Reset blocking state based on prop
        setTvgsDecision(null);
        setSafetyIssues([]);
        setIsUrgent(false);
    }, [task, initialIsBlocking]);

    const handleAddLog = async () => {
        let note = newLog.note;
        let actionType: TaskLog['actionType'] = 'UPDATE';
        let nextStatus = task.status;
        let notification: AppNotification | undefined;
        let processingTime = 0;

        if (isUrgent) {
            note = `[KHẨN CẤP] ${note}`;
            const managers = getUsersByRole([UserRole.QTCDT, UserRole.QTNT, UserRole.QTTVGS, UserRole.QTTVTK, UserRole.ADMIN, UserRole.QCNT, UserRole.QSNT]);
            const assignees = task.assignees || []; // Ensure assignees are notified
            const recipients = Array.from(new Set([...managers, ...assignees])).filter(id => id !== currentUser.id);
            if (recipients.length > 0) { // Use the centralized utility
                notification = notificationService.createNotification('🚨 BÁO CÁO KHẨN CẤP', `Có vấn đề khẩn cấp tại "${task.code}": ${newLog.note}`, 'ERROR', recipients, task.id, currentUser.fullname);
            }
        }

        if (isBlocking) {
            if (!note) return dispatch(addToast({ message: "Vui lòng nhập lý do tạm dừng.", type: 'error' }));
            actionType = 'BLOCK'; nextStatus = TaskStatus.BLOCKED; note = `[TẠM DỪNG] ${note}`;
            if (!isUrgent) { // Use the centralized utility
                const recipients = getUsersByRole([UserRole.QTCDT, UserRole.QTNT, UserRole.QTTVGS, UserRole.ADMIN]);
                if (recipients.length > 0) { // Ensure project managers are notified
                    notification = notificationService.createNotification('⚠️ Báo cáo vướng mắc', `Công việc "${task.code}" bị tạm dừng: ${newLog.note}`, 'WARNING', recipients, task.id, currentUser.fullname);
                }
            }
        } else if (task.status === TaskStatus.BLOCKED) {
            actionType = 'UNBLOCK'; nextStatus = TaskStatus.IN_PROGRESS; note = `[TIẾP TỤC] ${note || 'Đã khắc phục'}`;
        } else if (isTVGS && task.status === TaskStatus.WAITING_APPROVAL) {
            if (!tvgsDecision || !note) return dispatch(addToast({ message: "Vui lòng nhập đủ thông tin nghiệm thu.", type: 'error' }));
            const triggerLog = task.logs.find((l: TaskLog) => l.actionType === 'CONFIRM_QC'); // This is correct
            if (triggerLog) processingTime = Math.round((new Date().getTime() - new Date(triggerLog.timestamp).getTime()) / 60000);

            if (tvgsDecision === 'OK') {
                actionType = 'APPROVE'; nextStatus = TaskStatus.COMPLETED; note = `[TVGS OK] ${note}`;
                if (!isUrgent) { // Use the centralized utility
                    const recipients = [...(task.assignees || []), ...getUsersByRole([UserRole.QCNT, UserRole.QTNT, UserRole.QTCDT])];
                    if (recipients.length > 0) notification = notificationService.createNotification('✅ Nghiệm thu ĐẠT', `TVGS đã duyệt "${task.code}".`, 'SUCCESS', recipients, task.id, currentUser.fullname);
                }
            } else {
                actionType = 'REJECT'; nextStatus = TaskStatus.REJECTED; note = `[TVGS Not OK] ${note}`;
                if (!isUrgent) { // Use the centralized utility
                    const recipients = [...(task.assignees || []), ...getUsersByRole([UserRole.QCNT])];
                    if (recipients.length > 0) notification = notificationService.createNotification('⛔ Nghiệm thu KHÔNG ĐẠT', `TVGS từ chối "${task.code}": ${note}`, 'ERROR', recipients, task.id, currentUser.fullname);
                }
            }
        }

        const safeAmount = isNaN(newLog.amount) ? 0 : newLog.amount;
        const log: TaskLog = {
            id: generateUniqueId('log'), timestamp: new Date().toISOString(), startTime: newLog.startTime, endTime: newLog.endTime,
            amount: safeAmount, userId: currentUser.id, userName: currentUser.fullname, userRole: currentUser.role,
            note: note, images: newLog.images, actionType: actionType,
        };

        if (safetyIssues.length > 0) log.safetyIssues = safetyIssues;
        if (processingTime > 0) log.processingTime = processingTime;

        const newCompleted = (task.completedQuantity || 0) + safeAmount;
        const taskUpdates: Partial<Task> = {
            completedQuantity: newCompleted,
            progress: Math.min(100, Math.round((newCompleted / (task.quantity || 1)) * 100)),
            status: nextStatus === TaskStatus.NEW ? TaskStatus.IN_PROGRESS : nextStatus
        };

        await onUpdateTaskWithLog(task, { log, updates: taskUpdates, notification });
        onClose(); // Close modal on success
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadPromises = Array.from(files).map(file => storageService.uploadFile(project.id, `task_images/${task.id}`, file));
            const urls = (await Promise.all(uploadPromises)).filter((url): url is string => url !== null);
            setNewLog(prev => ({ ...prev, images: [...prev.images, ...urls] }));
        } catch (error) {
            console.error("Error uploading images: ", error);
            dispatch(addToast({ message: "Có lỗi xảy ra trong quá trình tải ảnh lên.", type: 'error' }));
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddComment = () => {
        if (!newComment.trim()) return;
        const comment: Comment = {
            id: generateUniqueId('cmt'),
            userId: currentUser.id,
            userName: currentUser.fullname,
            userAvatar: currentUser.avatar,
            content: newComment,
            timestamp: new Date().toISOString()
        };

        const recipients = (task.assignees || []).filter((uid: string) => uid !== currentUser.id);
        let notification: AppNotification | undefined = undefined;
        if (recipients.length > 0) {
            notification = notificationService.createNotification('💬 Bình luận mới', `${currentUser.fullname} đã bình luận trong "${task.code}".`, 'INFO', recipients, task.id, currentUser.fullname);
        }

        onAddCommentToTask(task.id, comment, notification);
        setNewComment('');
    };

    const startListening = () => {
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            dispatch(addToast({ message: 'Trình duyệt không hỗ trợ nhận diện giọng nói.', type: 'error' }));
            return;
        }
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'vi-VN';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        setIsListening(true);
        recognition.onresult = (event: any) => { // Using 'any' here as SpeechRecognitionEvent might not be standard on all browsers
            const text = event.results[0][0].transcript;
            setNewLog(prev => ({ ...prev, note: (prev.note ? prev.note + ' ' : '') + text }));
            setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognition.start();
    };

    return (
        <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[85vh] max-h-[700px] text-gray-800 dark:text-gray-200">
                <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-700/50">
                    <div><h3 className="font-bold text-gray-800 dark:text-gray-200">Chi tiết công việc</h3><p className="text-xs text-gray-500 dark:text-gray-400">{task.code}</p></div>
                    <button onClick={onClose}><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700">
                    <button onClick={() => setModalTab('LOG')} className={`flex-1 py-3 text-sm ${modalTab === 'LOG' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Nhật ký</button>
                    <button onClick={() => setModalTab('DISCUSS')} className={`flex-1 py-3 text-sm ${modalTab === 'DISCUSS' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`}>Thảo luận</button>
                </div>

                {modalTab === 'LOG' && (
                    <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-4">
                        {canEdit && (
                            <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg space-y-3 shadow-inner">
                                {isTVGS && task.status === TaskStatus.WAITING_APPROVAL && (
                                    <div className="flex gap-2 mb-2">
                                        <button onClick={() => setTvgsDecision('OK')} className={`flex-1 py-2 rounded border ${tvgsDecision === 'OK' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>ĐẠT</button>
                                        <button onClick={() => setTvgsDecision('NOT_OK')} className={`flex-1 py-2 rounded border ${tvgsDecision === 'NOT_OK' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600'}`}>KHÔNG ĐẠT</button>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-2 bg-blue-100/50 dark:bg-blue-800/20 p-2 rounded">
                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian hiện tại</label>
                                        <input type="datetime-local" className="w-full p-1 rounded border border-gray-300 dark:border-gray-600 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500" value={newLog.startTime} readOnly />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Thời gian hoàn thành</label>
                                        <input type="datetime-local" className="w-full p-1 rounded border border-blue-200 dark:border-gray-600 text-xs bg-white dark:bg-gray-700" value={newLog.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLog({ ...newLog, endTime: e.target.value })} />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <input type="number" className="w-1/3 p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700" placeholder="Khối lượng" value={newLog.amount || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLog({ ...newLog, amount: parseFloat(e.target.value) })} />
                                    <VietnameseInput className="flex-1 p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700" placeholder="Ghi chú..." value={newLog.note} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLog({ ...newLog, note: e.target.value })} />
                                </div>
                                <div className="flex items-center">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" className="peer appearance-none w-4 h-4 border border-red-300 rounded checked:bg-red-600 checked:border-red-600 transition-colors" checked={isUrgent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsUrgent(e.target.checked)} />
                                            <CheckCircle2 className="absolute w-3 h-3 text-white hidden peer-checked:block pointer-events-none left-0.5" />
                                        </div>
                                        <span className="text-xs font-bold text-red-600 flex items-center gap-1 group-hover:text-red-700"><Siren className="w-3 h-3 animate-pulse" /> Báo cáo KHẨN CẤP (Gửi thông báo ngay)</span>
                                    </label>
                                </div>
                                <div className="flex gap-2 items-center">
                                    <button onClick={startListening} className={`p-2 rounded border dark:border-gray-600 ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-white dark:bg-gray-700 text-gray-500 hover:text-blue-500 dark:hover:text-blue-400'}`}><Mic className="w-4 h-4" /></button>
                                    <label className="flex-1 flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-700 border dark:border-gray-600 p-2 rounded text-sm text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 justify-center">
                                        <Camera className="w-4 h-4" /> Ảnh/Chụp
                                        <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                </div>
                                <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                    {newLog.images.map((img: string, i: number) => (
                                        <div key={i} className="relative w-16 h-16 border dark:border-gray-600 rounded overflow-hidden shrink-0 group">
                                            <img src={img} className="w-full h-full object-cover" alt="prev" />
                                        </div>
                                    ))}
                                    {isUploading && (
                                        <div className="w-16 h-16 border dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                                            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={handleAddLog} className="w-full text-xs" disabled={isUploading}>Lưu Nhật Ký</Button>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar border-t dark:border-gray-700 pt-2">
                            {task.logs?.map((log: TaskLog) => (
                                <div key={log.id} className="bg-white dark:bg-gray-700/50 p-3 border dark:border-gray-700 rounded shadow-sm">
                                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                        <span className="font-bold text-gray-700 dark:text-gray-300">{log.userName}</span>
                                        <span>{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                                    </div>
                                    <div className="text-sm mt-1">{log.actionType && <span className="font-bold text-blue-600">[{log.actionType}]</span>} {log.note}</div>
                                    {log.images && log.images.length > 0 && (
                                        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                                            {log.images.map((img: string, idx: number) => (
                                                <img key={idx} src={img} className="w-16 h-16 object-cover rounded border border-gray-200 dark:border-gray-600 cursor-pointer hover:opacity-80" alt="evidence" onClick={() => { const w = window.open(""); w?.document.write(`<img src="${img}" style="max-width:100%; height:auto;"/>`); }} />
                                            ))}
                                        </div>
                                    )}
                                    {log.amount > 0 && <div className="text-xs font-bold text-green-600">+{log.amount}</div>}
                                    {log.endTime && (<div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Hoàn thành: {new Date(log.endTime).toLocaleString('vi-VN')}</div>)}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {modalTab === 'DISCUSS' && (
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900/50 space-y-3 custom-scrollbar">
                            {(task.comments || []).length === 0 ? (
                                <div className="text-center text-gray-400 dark:text-gray-500 text-sm pt-10">Chưa có thảo luận nào. Hãy bắt đầu!</div>
                            ) : (
                                task.comments?.map((comment: Comment) => (
                                    <div key={comment.id} className={`flex gap-3 ${comment.userId === currentUser.id ? 'flex-row-reverse' : ''}`}>
                                        <img src={comment.userAvatar} className="w-8 h-8 rounded-full border border-white shadow-sm" alt="avt" />
                                        <div className={`max-w-[80%] p-3 rounded-lg shadow-sm text-sm ${comment.userId === currentUser.id ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 rounded-tr-none' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none'}`}>
                                            <div className="font-bold text-xs mb-1 opacity-70">{comment.userName}</div>
                                            {comment.content}
                                            <div className="text-[10px] text-right mt-1 opacity-50 dark:opacity-40">{new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <div className="flex gap-2">
                                <VietnameseInput className="flex-1 border dark:border-gray-600 rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700" placeholder="Viết bình luận (@Tag tên)..." value={newComment} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewComment(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAddComment()} />
                                <button onClick={handleAddComment} className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"><Send className="w-4 h-4" /></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};