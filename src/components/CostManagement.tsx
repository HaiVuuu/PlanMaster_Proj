
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Project, Task, User, PaymentLog, UserRole, PERMISSION_CONFIG, PaymentCategory } from '@/types';
import { DollarSign, Save, History, X, Receipt, Camera, CornerDownRight, Trash2, ChevronDown, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import VietnameseInput from '@/components/VietnameseInput';
import { costService } from '@/services/costService';
import { storageService } from '@/services/storageService'; // Import storageService

interface Props {
  project: Project;
  currentUser: User;
  onUpdateUnitPrice: (taskId: string, price: number) => void;
  onAddPaymentLog: (task: Task, log: Omit<PaymentLog, 'id' | 'payerId' | 'payerName'>) => void;
}

export const CostManagement: React.FC<Props> = ({ project, currentUser, onUpdateUnitPrice, onAddPaymentLog }) => {
  const dispatch = useDispatch();
  const [selectedTaskForPayment, setSelectedTaskForPayment] = useState<Task | null>(null);
  const [newPayment, setNewPayment] = useState<{ amount: number; category: PaymentCategory; note: string; date: string; images: string[] }>({
    amount: 0,
    category: 'PROGRESS',
    note: '',
    date: new Date().toISOString().slice(0, 16),
    images: []
  });
  const [isUploading, setIsUploading] = useState(false);
  
  // Independent Assignee Dropdown State for Cost
  const [activeAssignDropdownId, setActiveAssignDropdownId] = useState<string | null>(null);

  // Confirmation modal state for deleting payment log
  const [logToDelete, setLogToDelete] = useState<PaymentLog | null>(null);

  const canEdit = PERMISSION_CONFIG[currentUser.role].COST.edit;

  // --- HELPER: Format Currency ---
  const formatMoney = (amount: number | undefined) => {
    if (amount === undefined || amount === null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const handleUnitPriceChange = (taskId: string, price: number) => {
    if (!canEdit || !project.id) return;
    onUpdateUnitPrice(taskId, isNaN(price) ? 0 : price);
  };
  
  // --- INDEPENDENT COST ASSIGNEE LOGIC ---
  const toggleCostAssignee = async (taskId: string, userId: string) => {
    if (!canEdit || !project.id) return;
    const task = project.tasks.find(t => t.id === taskId);
    if (!task) return;

    const currentAssignees = task.costAssignees || [];
    const exists = currentAssignees.includes(userId);
    const newAssignees = exists ? currentAssignees.filter(id => id !== userId) : [...currentAssignees, userId];
    
    await costService.updateCostAssignees(project.id, taskId, newAssignees);
  };

  // --- PAYMENT LOGIC ---
  const openPaymentModal = (task: Task) => {
    if (!canEdit) return;
    setSelectedTaskForPayment(task);
    setNewPayment({
      amount: 0,
      category: 'PROGRESS',
      note: '',
      date: new Date().toISOString().slice(0, 16),
      images: []
    });
  };

  const handleAddPayment = () => {
    if (!selectedTaskForPayment || newPayment.amount <= 0 || !project.id) {
        dispatch(addToast({ message: "Vui lòng nhập số tiền thanh toán hợp lệ > 0.", type: 'error' }));
        return;
    }

    const log: Omit<PaymentLog, 'id' | 'payerId' | 'payerName'> = {
      timestamp: new Date(newPayment.date).toISOString(),
      amount: newPayment.amount,
      category: newPayment.category,
      note: newPayment.note,
      images: newPayment.images
    };
    onAddPaymentLog(selectedTaskForPayment, log);
    
    // Reset Form but keep modal open for convenience
    setNewPayment({
      amount: 0,
      category: 'PROGRESS',
      note: '',
      date: new Date().toISOString().slice(0, 16),
      images: []
    });
    // The modal will re-render with new data from the parent's onSnapshot listener.
    // To make it feel instant, we can optimistically update the selected task.
    const updatedTaskForModal = {
        ...selectedTaskForPayment,
        paidAmount: (selectedTaskForPayment.paidAmount || 0) + newPayment.amount,
        paymentLogs: [{...log, id: 'temp', payerId: currentUser.id, payerName: currentUser.fullname}, ...(selectedTaskForPayment.paymentLogs || [])]
    };
    setSelectedTaskForPayment(updatedTaskForModal as Task);
  };
  
  const confirmDeletePaymentLog = async () => {
      if (!selectedTaskForPayment || !project.id || !logToDelete) return;
      
      await costService.removePaymentLog(project.id, selectedTaskForPayment, logToDelete);
      
      // Update the modal view and close the confirmation
      // The onSnapshot listener will handle the UI update.
      setLogToDelete(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!navigator.onLine) {
        dispatch(addToast({ message: "Bạn đang offline. Không thể tải ảnh lên lúc này.", type: 'info' }));
        if (e.target) e.target.value = ''; // Reset file input
        return;
    }

    setIsUploading(true);
    const uploadPromises = Array.from(files).map(file => storageService.uploadFile(project.id, 'payment_proofs', file));
    
    try {
        const urls = await Promise.all(uploadPromises);
        setNewPayment(prev => ({ ...prev, images: [...prev.images, ...urls] }));
    } catch (error) {
        console.error("Error uploading images: ", error);
        dispatch(addToast({ message: "Có lỗi xảy ra trong quá trình tải ảnh lên.", type: 'error' }));
    } finally {
        setIsUploading(false);
    }
  };

  // --- USER MAP FOR AVATAR ---
  const userMap = useMemo(() => {
      const map = new Map<string, User>();
      project.team.forEach(u => map.set(u.id, u));
      return map;
  }, [project.team]);

  // --- AGGREGATE STATS ---
  const { totalBudget, totalCompletedValue, totalPaid, totalRemaining } = useMemo(() => {
    const budget = project.tasks.reduce((sum, t) => sum + ((t.quantity || 0) * (t.unitPrice || 0)), 0);
    const completed = project.tasks.reduce((sum, t) => sum + ((t.completedQuantity || 0) * (t.unitPrice || 0)), 0);
    const paid = project.tasks.reduce((sum, t) => sum + (t.paidAmount || 0), 0);
    return { totalBudget: budget, totalCompletedValue: completed, totalPaid: paid, totalRemaining: budget - paid };
  }, [project.tasks]);

  const getCategoryLabel = (cat: PaymentCategory) => {
      switch(cat) {
          case 'ADVANCE': return 'Tạm ứng';
          case 'PROGRESS': return 'TT Đợt';
          case 'SETTLEMENT': return 'Quyết toán';
          default: return 'Khác';
      }
  };
  
  const getCategoryColor = (cat: PaymentCategory) => {
      switch(cat) {
          case 'ADVANCE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
          case 'PROGRESS': return 'bg-green-100 text-green-800 border-green-200';
          case 'SETTLEMENT': return 'bg-purple-100 text-purple-800 border-purple-200';
          default: return 'bg-gray-100 text-gray-800';
      }
  };

  return (
    <>
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[calc(100vh-100px)] relative">
      {/* Header Stats */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-xl grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Tổng giá trị Hợp đồng</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatMoney(totalBudget)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Giá trị thực hiện</p>
            <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatMoney(totalCompletedValue)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Đã thanh toán (Tất cả)</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatMoney(totalPaid)}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Còn lại</p>
            <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{formatMoney(totalRemaining)}</p>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-auto flex-1 relative bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead className="sticky top-0 bg-white dark:bg-gray-800 z-10 shadow-sm dark:shadow-none">
            <tr>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-12 text-center">STT</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-24">Mã CV</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 min-w-[200px]">Tên công việc</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-40">Phụ trách CP</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-16 text-center">ĐVT</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-24 text-right">Khối lượng</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-32 text-right bg-blue-50/50 dark:bg-blue-900/20">Đơn giá</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-gray-600 dark:text-gray-400 w-36 text-right">Thành tiền</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-green-700 dark:text-green-400 w-32 text-right">Đã hoàn thành</th>
              <th className="p-3 border-r border-b dark:border-gray-700 text-xs font-semibold text-purple-700 dark:text-purple-400 w-32 text-right">Đã thanh toán</th>
              <th className="p-3 border-b dark:border-gray-700 text-xs font-semibold text-orange-700 dark:text-orange-400 w-32 text-right">Còn lại</th>
            </tr>
          </thead>
          <tbody>
            {project.tasks.map((task, idx) => {
                const totalAmount = (task.quantity || 0) * (task.unitPrice || 0);
                const completedValue = (task.completedQuantity || 0) * (task.unitPrice || 0);
                const paid = task.paidAmount || 0;
                const remaining = totalAmount - paid;

                return (
                  <tr key={task.id} className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${task.parentId ? 'bg-gray-50 dark:bg-gray-800/60' : ''}`}>
                    <td className="p-2 border-r dark:border-gray-700 text-sm text-center text-gray-500 dark:text-gray-400">
                         {task.parentId ? <CornerDownRight className="w-3 h-3 ml-auto text-gray-400 dark:text-gray-500" /> : idx + 1}
                    </td>
                    <td className="p-2 border-r dark:border-gray-700 text-sm">{task.code}</td>
                    <td className="p-2 border-r dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span className={task.parentId ? 'pl-4' : ''}>{task.name}</span>
                    </td>
                    {/* COST ASSIGNEES COLUMN - INDEPENDENT FROM CONSTRUCTION */}
                    <td className="p-2 border-r dark:border-gray-700 relative">
                         {canEdit ? (
                             <>
                                <button
                                    onClick={() => setActiveAssignDropdownId(activeAssignDropdownId === task.id ? null : task.id)}
                                    className="w-full text-left text-sm flex items-center justify-between px-2 py-1 rounded hover:bg-white border border-transparent hover:border-gray-300"
                                    disabled={!project.id}
                                >
                                    <span className="truncate block max-w-[150px] text-gray-800 dark:text-gray-200">
                                        {(!task.costAssignees || task.costAssignees.length === 0) 
                                            ? <span className="text-gray-400 italic">Chọn QS/KT...</span>
                                            : <div className="flex -space-x-1 overflow-hidden py-1">
                                                {task.costAssignees.map((userId: string) => {
                                                    const u = userMap.get(userId);
                                                    return u ? <img key={u.id} src={u.avatar} title={u.fullname} className="inline-block h-6 w-6 rounded-full ring-2 ring-white" alt="avt" /> : null;
                                                })}
                                                </div>
                                        }
                                    </span>
                                    <ChevronDown className="w-3 h-3 text-gray-400" />
                                </button>
                                {activeAssignDropdownId === task.id && (
                                    <div className="absolute top-full left-0 z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-2">
                                        <div className="flex justify-between items-center mb-2 px-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Phụ trách chi phí</div>
                                            <button // text-gray-400 hover:text-red-500
                                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                    e.stopPropagation();
                                                    setActiveAssignDropdownId(null);
                                                }} 
                                                className="text-gray-400 hover:text-red-500 p-1 hover:bg-gray-100 rounded"
                                                title="Đóng"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="max-h-48 overflow-y-auto space-y-1">
                                            {project.team.map((u: User) => (
                                                <label key={u.id} className="flex items-center gap-2 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300 text-blue-600" 
                                                        checked={task.costAssignees?.includes(u.id) || false} 
                                                        onChange={() => toggleCostAssignee(task.id, u.id)} 
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <img src={u.avatar} className="w-6 h-6 rounded-full border dark:border-gray-700" alt="avt"/>
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
                                {task.costAssignees?.map(userId => {
                                    const u = userMap.get(userId); // ring-2 ring-white
                                    return u ? <img key={u.id} src={u.avatar} className="w-6 h-6 rounded-full ring-2 ring-white dark:ring-gray-800" title={u.fullname} alt="avt"/> : null;
                                })}
                            </div>
                         )}
                    </td>

                    <td className="p-2 border-r dark:border-gray-700 text-sm text-center">{task.unit}</td>
                    <td className="p-2 border-r dark:border-gray-700 text-sm text-right font-medium">{task.quantity?.toLocaleString()}</td>
                    
                    {/* Unit Price (Editable) */}
                    <td className="p-2 border-r dark:border-gray-700 text-right bg-blue-50/30 dark:bg-blue-900/20">
                        {canEdit ? (
                             <input
                                type="number"
                                className="w-full text-right bg-transparent border-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded-md transition-colors duration-150 outline-none text-sm font-medium text-blue-700 dark:text-blue-400"
                                value={task.unitPrice || 0}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleUnitPriceChange(task.id, parseFloat(e.target.value) || 0)}
                                disabled={!project.id}
                            />
                        ) : (
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatMoney(task.unitPrice)}</span>
                        )}
                    </td>

                    <td className="p-2 border-r dark:border-gray-700 text-sm text-right font-bold text-gray-800 dark:text-gray-200">{formatMoney(totalAmount)}</td>
                    <td className="p-2 border-r dark:border-gray-700 text-sm text-right font-semibold text-green-600 dark:text-green-400">{formatMoney(completedValue)}</td>
                    
                    {/* Paid Amount (Interactive) */}
                    <td className="p-2 border-r dark:border-gray-700 text-right">
                        <button 
                            onClick={() => openPaymentModal(task)}
                            className="text-purple-600 dark:text-purple-400 font-bold hover:underline flex items-center justify-end gap-1 w-full text-sm"
                            disabled={!canEdit || !project.id}
                        >
                            {formatMoney(paid)}
                            {canEdit && <History className="w-3 h-3 text-gray-400" />}
                        </button>
                    </td>

                    <td className="p-2 text-sm text-right font-bold text-orange-600 dark:text-orange-400">{formatMoney(remaining)}</td>
                  </tr>
                );
            })}
          </tbody>
        </table>
      </div>
      {/* Payment Modal (Fixed Height Layout) */}
      {selectedTaskForPayment && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[85vh] max-h-[700px] text-gray-800 dark:text-gray-200">
                  <div className="flex-shrink-0 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-purple-50 dark:bg-purple-900/30">
                      <div>
                          <h3 className="font-bold text-purple-900 flex items-center gap-2">
                             <DollarSign className="w-5 h-5"/> Cập nhật thanh toán
                          </h3>
                          <p className="text-xs text-purple-600 truncate max-w-[300px]">{selectedTaskForPayment.code} - {selectedTaskForPayment.name}</p>
                      </div>
                      <button onClick={() => setSelectedTaskForPayment(null)}><X className="w-5 h-5 text-gray-500"/></button>
                  </div>

                  <div className="flex flex-col flex-1 overflow-hidden p-4 space-y-4">
                      {/* Form (Fixed Top) */}
                      <div className="flex-shrink-0 bg-purple-50/50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-100 dark:border-purple-800 space-y-3">
                           <div className="grid grid-cols-2 gap-3">
                               <div>
                                   <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Ngày thanh toán</label>
                                   <input 
                                        type="datetime-local"
                                        className="w-full p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                        value={newPayment.date}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment({...newPayment, date: e.target.value})}
                                   />
                               </div>
                               <div>
                                   <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Số tiền (VND)</label>
                                   <input 
                                        type="number"
                                        className="w-full p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 font-bold text-purple-700 dark:text-purple-400"
                                        value={newPayment.amount || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})}
                                        placeholder="0"
                                   />
                               </div>
                           </div>

                           <div> 
                               <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-1 block">Loại thanh toán</label>
                               <div className="grid grid-cols-3 gap-2">
                                   {(['ADVANCE', 'PROGRESS', 'SETTLEMENT'] as PaymentCategory[]).map(cat => (
                                       <button 
                                            key={cat}
                                            onClick={() => setNewPayment({ ...newPayment, category: cat })}
                                            className={`text-xs py-2 rounded font-medium border transition-colors
                                                ${newPayment.category === cat
                                                    ? 'bg-purple-600 text-white border-purple-600'
                                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}
                                            `}
                                       >
                                           {getCategoryLabel(cat)}
                                       </button>
                                   ))}
                               </div>
                           </div>
                           
                           <div> 
                               <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">Ghi chú / Số phiếu chi</label>
                               <VietnameseInput 
                                    className="w-full p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700"
                                    value={newPayment.note}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPayment({...newPayment, note: e.target.value})}
                                    placeholder="VD: TT Đợt 1 - UNC số 123..."
                               />
                           </div>

                           {/* Image Upload */}
                           <div>
                                <label className={`flex items-center gap-2 cursor-pointer text-xs text-purple-600 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/20 bg-white dark:bg-gray-700 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800 transition-colors w-fit ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    {isUploading ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
                                            Đang tải lên...
                                        </>
                                    ) : (
                                        <> 
                                            <Camera className="w-4 h-4" /> Đính kèm chứng từ (Hóa đơn/UNC)
                                        </>
                                    )}
                                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={isUploading} />
                                </label>
                                <div className="flex gap-2 mt-2 overflow-x-auto">
                                    {newPayment.images.map((img, i) => (
                                        <div key={i} className="relative w-16 h-16 border dark:border-gray-600 rounded overflow-hidden">
                                            <img src={img} alt="doc" className="w-full h-full object-cover"/>
                                        </div>
                                    ))}
                                    {isUploading && (
                                        <div className="w-16 h-16 border dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                           </div>
                           
                           <Button onClick={handleAddPayment} className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isUploading}> 
                               <Save className="w-4 h-4" /> Lưu thanh toán
                           </Button>
                      </div>
                      {/* History Log (Scrollable) */}
                      <div className="flex flex-col flex-1 overflow-hidden"> 
                          <h4 className="flex-shrink-0 font-bold text-gray-700 dark:text-gray-300 text-sm mb-2 flex items-center gap-1"><History className="w-4 h-4"/> Lịch sử thanh toán</h4>
                          <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar"> 
                              {selectedTaskForPayment.paymentLogs && selectedTaskForPayment.paymentLogs.length > 0 ? (
                                  selectedTaskForPayment.paymentLogs.map(log => (
                                      <div key={log.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded border border-gray-100 dark:border-gray-700 text-sm relative group">
                                          <div className="flex justify-between items-start">
                                              <span className="font-bold text-purple-700 dark:text-purple-400">{formatMoney(log.amount)}</span>
                                              <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(log.timestamp).toLocaleDateString('vi-VN')}</span>
                                          </div>
                                          
                                          <div className="flex items-center gap-2 mt-1 mb-1">
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${getCategoryColor(log.category || 'PROGRESS')}`}>
                                                  {getCategoryLabel(log.category || 'PROGRESS')}
                                              </span>
                                          </div>

                                          <div className="text-xs text-gray-600 mt-1">
                                              <span className="font-semibold text-gray-800 dark:text-gray-200">{log.payerName}</span>: {log.note}
                                          </div>
                                          {log.images && log.images.length > 0 && (
                                              <div className="flex gap-1 mt-1">
                                                   {log.images.map((img, i) => (
                                                        <a key={i} href={img} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 underline flex items-center gap-0.5">
                                                            <Receipt className="w-3 h-3"/> Chứng từ {i+1}
                                                        </a>
                                                   ))}
                                              </div>
                                          )}
                                          
                                          {/* Delete Action */}
                                          <button 
                                            onClick={() => setLogToDelete(log)}
                                            className="absolute top-2 right-2 p-1 text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Xóa lịch sử thanh toán này"
                                          >
                                              <Trash2 className="w-4 h-4" />
                                          </button>
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center text-gray-400 text-xs py-4">Chưa có lịch sử thanh toán.</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal for Deleting Payment Log */}
      {logToDelete && (
           <div className="absolute inset-0 z-[60] bg-gray-900/60 flex items-center justify-center backdrop-blur-sm p-4">
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                   <div className="p-6 text-center">
                       <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                           <AlertTriangle className="h-6 w-6 text-red-600" />
                       </div>
                       <h3 className="mt-5 text-lg font-medium text-gray-900 dark:text-gray-100">
                           Xóa lịch sử thanh toán?
                       </h3>
                       <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                           <p>Bạn có chắc muốn xóa khoản thanh toán <span className="font-bold">{formatMoney(logToDelete.amount)}</span> vào ngày <span className="font-bold">{new Date(logToDelete.timestamp).toLocaleDateString('vi-VN')}</span>?</p>
                           <p>Số tiền đã thanh toán của hạng mục sẽ được hoàn lại. Hành động này không thể hoàn tác.</p>
                       </div>
                   </div>
                   <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
                       <Button
                           variant="danger"
                           onClick={confirmDeletePaymentLog}
                           className="w-full sm:ml-3 sm:w-auto"
                       >
                           Xác nhận Xóa
                       </Button>
                       <Button variant="secondary" onClick={() => setLogToDelete(null)} className="mt-3 w-full sm:mt-0 sm:w-auto">Hủy bỏ</Button>
                   </div>
               </div>
           </div>
       )}

    </div>
    </>
  );
};
