import React, { useState, useRef, useEffect } from 'react';
import { Project, User, ProjectDocument, ProjectParticipant, UserRole, PERMISSION_CONFIG } from '@/types';
import { FileText, MapPin, Calendar, Briefcase, Eye, EyeOff, Trash2, Plus, Upload, FileUp, Paperclip, FileClock, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/Button';
import { useDispatch } from 'react-redux';
import { storageService } from '@/services/storageService'; // Import storageService
import VietnameseInput from '@/components/VietnameseInput';
import { formatBytes } from '@/utils/helpers'; // Import formatBytes from utils
import { addToast } from '@/store/uiSlice';

interface Props {
  project: Project;
  onUpdateDetails: (updates: Partial<Pick<Project, 'name' | 'location' | 'description' | 'participants'>>) => void;
  onUploadDocument: (file: File, docName: string) => Promise<void>;
  onRemoveDocument: (docToRemove: ProjectDocument) => Promise<void>;
  currentUser?: User; // Optional for safety, but usually required
}

export const ProjectInfo: React.FC<Props> = ({ project, onUpdateDetails, onUploadDocument, onRemoveDocument, currentUser }) => {
  // Local state to manage form edits without triggering DB writes on every keystroke.
  const [localProject, setLocalProject] = useState(project);
  const [docName, setDocName] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const dispatch = useDispatch();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null);

  // Sync local state if the project prop changes from an external source (e.g., Firestore listener)
  useEffect(() => {
    setLocalProject(project);
  }, [project]);

  // Update local state on input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalProject(prev => ({ ...prev, [name]: value }));
  };

  // Update local state for participants
  const handleParticipantChange = (id: string, value: string) => {
    setLocalProject(prev => ({
      ...prev,
      participants: prev.participants.map(p => (p.id === id ? { ...p, value } : p)),
    }));
  };

  // On blur, check for changes and save to the database if necessary.
  // This prevents saving on every keystroke and showing unnecessary toasts.
  const handleSaveChanges = () => {
    // Use a simple JSON string comparison to detect any changes.
    if (JSON.stringify(localProject) !== JSON.stringify(project)) {
      const updates: Partial<Pick<Project, 'name' | 'location' | 'description' | 'participants'>> = {};
      if (localProject.name !== project.name) updates.name = localProject.name;
      if (localProject.location !== project.location) updates.location = localProject.location;
      if (localProject.description !== project.description) updates.description = localProject.description;
      if (JSON.stringify(localProject.participants) !== JSON.stringify(project.participants)) updates.participants = localProject.participants;

      if (Object.keys(updates).length > 0) {
        onUpdateDetails(updates);
      }
    }
  };

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Permissions
  const canEditDetails = currentUser ? PERMISSION_CONFIG[currentUser.role].INFO.edit : false;
  const canEditParticipantsStructure = currentUser ? (currentUser.role === UserRole.QTCDT || currentUser.role === UserRole.ADMIN) : false;
  
  // Clean up object URLs when unmounting or when documents change (optional but good practice)
  useEffect(() => {
    return () => {
      project.documents.forEach(doc => {
          if (doc.url && doc.url.startsWith('blob:')) {
              URL.revokeObjectURL(doc.url);
          }
      });
    };
  }, [project.documents]);

  // Handlers for Documents
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          setSelectedFile(file);
          // Auto-fill doc name if empty
          if (!docName.trim()) {
              setDocName(file.name.split('.').slice(0, -1).join('.'));
          }
      }
  };

  const handleUpload = async () => {
    if (!docName || !selectedFile || !project.id) return;
    
    setIsUploading(true);

    try {
        await onUploadDocument(selectedFile, docName); // Call parent's handler, which uses projectService
        // Reset form on success
        setDocName('');
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    } catch (error) {
        // Error is handled by the parent component (App.tsx)
        console.error("Upload failed from ProjectInfo component:", error);
    } finally {
        setIsUploading(false);
    }
  };

  const handleView = (doc: ProjectDocument) => {
      if (doc.url) {
          window.open(doc.url, '_blank');
      }
  };

  const handleDownload = (doc: ProjectDocument) => {
      if (!doc.url) return;
      // Directly implement download logic here as storageService doesn't expose it
      const link = document.createElement('a');
      link.href = doc.url;
      link.setAttribute('download', doc.name);
      // Important for cross-origin downloads
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      dispatch(addToast({ message: `Đang tải xuống: ${doc.name}`, type: 'info' }));
      // Original call: storageService.downloadFileFromUrl(doc.url, doc.name);
      // This line is removed because the method does not exist on storageService
  };

  const removeDoc = async (docToRemove: ProjectDocument) => {
    if (!canEditDetails || !project.id) {
        dispatch(addToast({ message: "Chỉ quản trị viên mới được xóa tài liệu.", type: 'error' }));
        return;
    }
    setConfirmMessage("Bạn có chắc chắn muốn xóa tài liệu này? Hành động này không thể hoàn tác.");
    setConfirmAction(async () => {
        await onRemoveDocument(docToRemove); // Call the prop function
        setShowConfirmModal(false);
        setConfirmAction(null);
    });
    setShowConfirmModal(true);
  };

  // Handlers for Participants
  const updateParticipant = (id: string, value: string) => {
      // Allow editing value for managers involved, or just let QTCDT/Admin edit everything
      if (!canEditDetails || !project.id) return;
      handleParticipantChange(id, value);
  };

  const toggleVisibility = (id: string) => {
      if (!canEditParticipantsStructure || !project.id) return;
      const updatedParticipants = project.participants.map(p => p.id === id ? { ...p, isVisible: !p.isVisible } : p);
      onUpdateDetails({ participants: updatedParticipants });
  };

  const removeParticipantField = (id: string) => {
      if (!canEditParticipantsStructure || !project.id) return;
      setConfirmMessage("Bạn có chắc chắn muốn xóa trường thông tin này? Hành động này không thể hoàn tác.");
      setConfirmAction(async () => {
          const updatedParticipants = project.participants.filter(p => p.id !== id);
          onUpdateDetails({ participants: updatedParticipants }); // Call the prop function
          setShowConfirmModal(false);
          setConfirmAction(null);
      });
      setShowConfirmModal(true);
  };

  const addParticipantField = () => {
      if (!canEditParticipantsStructure || !newFieldLabel || !project.id) return;
      const newPart: ProjectParticipant = {
          id: `p-${Date.now()}`,
          label: newFieldLabel,
          value: '',
          isVisible: true,
          isSystem: false
      };
      const updatedParticipants = [...project.participants, newPart];
      onUpdateDetails({ participants: updatedParticipants });
      setNewFieldLabel('');
  };

  return (
    <>
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          Thông tin chung
        </h2>
        
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tên dự án</label>
            <VietnameseInput 
              type="text" 
              name="name"
              value={localProject.name}
              onChange={handleInputChange}
              onBlur={handleSaveChanges}
              readOnly={!canEditDetails || !project.id}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> Địa điểm
            </label>
            <VietnameseInput 
              type="text" 
              name="location"
              value={localProject.location}
              onChange={handleInputChange}
              onBlur={handleSaveChanges}
              readOnly={!canEditDetails || !project.id}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
            />
          </div>
          <div className="col-span-1 md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-gray-700">Mô tả dự án</label>
            <VietnameseInput
              as="textarea"
              rows={3}
              name="description"
              value={localProject.description}
              onChange={handleInputChange}
              onBlur={handleSaveChanges}
              readOnly={!canEditDetails || !project.id}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
            />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Ngày khởi tạo
            </label>
            <div className="p-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300">
              {new Date(project.createdAt).toLocaleDateString('vi-VN')}
            </div>
          </div>
        </div>

        {/* Dynamic Participants Section */}
        <div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2"><Briefcase className="w-4 h-4" /> Các bên tham gia dự án</span>
                {canEditParticipantsStructure && <span className="text-xs font-normal text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded">Chế độ chỉnh sửa (Admin/QTCDT)</span>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.participants.map(p => {
                    // Only show if visible OR if current user is QTCDT (to edit hidden fields)
                    if (!p.isVisible && !canEditParticipantsStructure) return null;

                    return (
                        <div key={p.id} className={`relative p-3 rounded-lg border ${p.isVisible ? 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-700/50' : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30 opacity-70'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{p.label}</label>
                                {canEditParticipantsStructure && (
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => toggleVisibility(p.id)} className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-1" title={p.isVisible ? "Ẩn" : "Hiện"}>
                                            {p.isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                        </button>
                                        {!p.isSystem && (
                                            <button onClick={() => removeParticipantField(p.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1" title="Xóa trường">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <VietnameseInput 
                                className="w-full text-sm font-medium text-gray-800 dark:text-gray-200 bg-transparent outline-none border-b border-transparent focus:border-blue-500 dark:focus:border-blue-400 placeholder-gray-400 dark:placeholder-gray-500"
                                value={localProject.participants.find(lp => lp.id === p.id)?.value || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateParticipant(p.id, e.target.value)}
                                onBlur={handleSaveChanges}
                                readOnly={!canEditDetails || !project.id}
                                placeholder={`Nhập tên ${p.label}...`}
                            />
                        </div>
                    );
                })}

                {/* Add New Field for QTCDT */}
                {canEditParticipantsStructure && (
                    <div className="p-3 rounded-lg border-2 border-dashed border-blue-200 bg-blue-50 dark:bg-blue-900/30 flex items-center gap-2">
                        <VietnameseInput 
                            className="flex-1 bg-transparent text-sm outline-none placeholder-blue-400 dark:placeholder-blue-600 text-blue-800 dark:text-blue-300"
                            placeholder="Tên trường mới (VD: Tư vấn môi trường)..."
                            value={newFieldLabel}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewFieldLabel(e.target.value)}
                        />
                        <button 
                            onClick={addParticipantField}
                            disabled={!newFieldLabel}
                            className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" />
          Tài liệu dự án
        </h2>
        
        {canEditDetails && project.id && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                    <div className="flex-1">
                         <VietnameseInput 
                            type="text"
                            placeholder="Nhập tên tài liệu..."
                            value={docName}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocName(e.target.value)}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700"
                        />
                    </div>
                    
                    {/* Hidden File Input */}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />

                    <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="whitespace-nowrap" disabled={isUploading}>
                        <FileUp className="w-4 h-4" /> {selectedFile ? 'Đổi file khác' : 'Chọn file từ máy'}
                    </Button>

                    <Button onClick={handleUpload} disabled={!docName || !selectedFile || isUploading} isLoading={isUploading} className="whitespace-nowrap">
                        <Plus className="w-4 h-4" /> {isUploading ? 'Đang tải lên...' : 'Thêm tài liệu'}
                    </Button>
                </div>
                
                {/* File Status Indicator */}
                {selectedFile && (
                    <div className="mt-2 text-sm text-green-700 dark:text-green-400 flex items-center gap-2 bg-green-50 dark:bg-green-900/30 w-fit px-3 py-1 rounded-full border border-green-100 dark:border-green-800">
                        <Paperclip className="w-3 h-3" />
                        <span className="font-semibold">{selectedFile.name}</span>
                        <span className="text-xs text-green-600 dark:text-green-500">({formatBytes(selectedFile.size)})</span>
                    </div>
                )}
                
                <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <FileClock className="w-3 h-3" />
                    <span>Hệ thống không hỗ trợ version control, hãy đặt tên file khác nhau.</span>
                </div>
            </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Tên tài liệu</th>
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Ver</th>
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Loại</th>
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Ngày tải lên</th>
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Người tải</th>
                <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Kích thước</th>
                <th className="p-3 text-right font-semibold text-gray-600 dark:text-gray-300 text-sm">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {project.documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    Chưa có tài liệu nào
                  </td>
                </tr>
              ) : (
                project.documents.map(doc => (
                  <tr key={doc.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{doc.name}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-300 text-sm">
                        <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px] font-bold">v{doc.version || 1}</span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-300 text-sm">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold">{doc.type}</span>
                    </td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-sm">{new Date(doc.uploadDate).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-sm">{doc.uploadedBy || '--'}</td>
                    <td className="p-3 text-gray-600 dark:text-gray-400 text-sm">{doc.size}</td>
                    <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                             <button 
                                onClick={() => handleView(doc)}
                                className="text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Xem tài liệu"
                                disabled={!doc.url}
                             >
                                <Eye className="w-4 h-4" />
                             </button>
                             <button 
                                onClick={() => handleDownload(doc)}
                                className="text-gray-500 hover:text-green-600 dark:hover:text-green-400 p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Tải về"
                                disabled={!doc.url}
                             >
                                <Download className="w-4 h-4" />
                             </button>
                             {canEditDetails && (
                                <button 
                                    onClick={() => removeDoc(doc)} // Note: Uses confirm(). Consider replacing with a modal.
                                    className="text-gray-500 hover:text-red-600 dark:hover:text-red-400 p-1"
                                    title="Xóa"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             )}
                        </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generic Confirmation Modal for ProjectInfo */}
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
    </>
  );
};