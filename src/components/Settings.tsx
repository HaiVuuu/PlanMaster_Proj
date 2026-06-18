
import React, { useState, useMemo } from 'react';
import { AppSettings, Project } from '@/types';
import { Settings as SettingsIcon, Moon, Sun, Layout, DollarSign, Database, HardDrive, Download, RefreshCw, AlertTriangle, Archive, CheckCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { storageService } from '@/services/storageService'; // Import storageService
import VietnameseInput from '@/components/VietnameseInput';

interface Props {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  // Extended props to handle data manipulation
  project?: Project;
}

export const Settings: React.FC<Props> = ({ settings, onUpdate, project }) => {
  const dispatch = useDispatch();
  const [retentionDays, setRetentionDays] = useState(90); // Default 3 months
  const [isCompressing, setIsCompressing] = useState(false);

  // --- NOTE: The storage analysis and optimization logic is temporarily disabled. ---
  // The original logic was designed for base64 strings stored in Firestore, but the app now correctly
  // uses Firebase Storage URLs. Calculating storage size from URLs is not practical on the client-side.
  // This feature needs to be re-implemented using server-side functions (e.g., Firebase Functions)
  // to analyze the storage bucket directly. For now, we'll mock it or provide a placeholder.
  const analyzeStorage = useMemo(() => {
      // Placeholder/Mock data for now, as actual client-side analysis is complex
      // In a real app, this would come from a serverless function or a dedicated service.
      if (!project) return {
          count: 'N/A', sizeMB: 'N/A', oldImagesCount: 'N/A', oldImagesSizeMB: 'N/A'
      };

      // Simple mock based on number of logs with images
      const allImageLogs = project.tasks.flatMap(t => t.logs.filter(l => l.images && l.images.length > 0));
      const totalImages = allImageLogs.reduce((sum, log) => sum + (log.images?.length || 0), 0);
      const mockTotalSizeMB = (totalImages * 0.5).toFixed(1); // Assume 0.5MB per image

      // Mock old images (e.g., 30% of images are old)
      const oldImages = Math.floor(totalImages * 0.3);
      const mockOldImagesSizeMB = (oldImages * 0.5 * 0.7).toFixed(1); // Old images are compressed to 70%
      return {
          count: totalImages.toString(),
          sizeMB: mockTotalSizeMB,
          oldImagesCount: oldImages.toString(),
          oldImagesSizeMB: mockOldImagesSizeMB
      };
  }, [project]);

  // --- THEME TOGGLE HANDLER ---
  // This handler makes the theme change feel instantaneous and robust,
  // especially for mobile app (WebView) environments.
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    // 1. Apply class directly to the <html> element for immediate visual feedback.
    document.documentElement.classList.toggle('dark', newTheme === 'dark');

    // 2. Call the parent onUpdate handler to persist the change to Redux state,
    // localStorage, and Firestore.
    onUpdate({ ...settings, theme: newTheme });
  };

  // --- ACTION: Download Backup ---
  const handleDownloadBackup = () => {
      if (!project) return;
      storageService.downloadProjectBackup(project);
      dispatch(addToast({ message: "Đã tải xuống file Backup. Hãy lưu trữ file này vào ổ cứng máy tính.", type: 'success' }));
  };

  // --- ACTION: Execute Compression ---
  const handleOptimize = async () => {
      if (!project) return;
      setIsCompressing(true);
      // In a real scenario, this would trigger a serverless function
      // await storageService.optimizeOldImages(project.id, retentionDays);
      dispatch(addToast({ 
          message: "Tính năng này đang được xây dựng lại để tương thích với Firebase Storage. Sẽ sớm có mặt!", 
          type: 'info' 
      }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-fade-in max-w-3xl mx-auto pb-20">
      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2 border-b dark:border-gray-700 pb-4">
        <SettingsIcon className="w-5 h-5 text-gray-600" />
        Cài đặt hệ thống
      </h2>

      <div className="space-y-8">
        {/* SECTION 1: APPEARANCE */}
        <section>
            <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase mb-3">Giao diện & Hiển thị</h3>
            <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded shadow-sm text-gray-600 dark:text-gray-300">
                        {settings.theme === 'light' ? <Sun className="w-5 h-5"/> : <Moon className="w-5 h-5"/>}
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">Giao diện (Theme)</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Chuyển đổi giữa chế độ sáng và tối</p>
                    </div>
                </div>
                <div className="flex bg-gray-200 dark:bg-gray-900 rounded-lg p-1">
                    <button 
                        onClick={() => handleThemeChange('light')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${settings.theme === 'light' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >Sáng</button>
                    <button 
                        onClick={() => handleThemeChange('dark')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${settings.theme === 'dark' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
                    >Tối</button>
                </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white dark:bg-gray-600 rounded shadow-sm text-gray-600 dark:text-gray-300">
                        <Layout className="w-5 h-5"/>
                    </div>
                    <div>
                        <p className="font-medium text-gray-800 dark:text-gray-200">Chế độ hiển thị thu gọn</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Giảm khoảng cách dòng trong bảng</p>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        checked={settings.compactMode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onUpdate({...settings, compactMode: e.target.checked})}
                        className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
                </div>
            </div>
        </section>

        {/* SECTION 2: DATA OPTIMIZATION (NEW) */}
        {project && (
            <section className="animate-in fade-in slide-in-from-bottom-4">
                <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4" /> Quản lý dữ liệu & Lưu trữ (Storage)
                </h3>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-5">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-gray-600 text-center">
                            <div className="text-xs text-gray-500 uppercase">Tổng số ảnh</div>
                            <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{analyzeStorage.count}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-100 dark:border-gray-600 text-center">
                            <div className="text-xs text-gray-500 uppercase">Dung lượng hiện tại</div>
                            <div className="text-xl font-bold text-blue-600">{analyzeStorage.sizeMB}{analyzeStorage.sizeMB !== 'N/A' && ' MB'}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-orange-100 dark:border-orange-800 text-center relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-orange-100 px-2 py-0.5 text-[10px] text-orange-600 font-bold rounded-bl">Cũ &gt; {retentionDays} ngày</div>
                            <div className="text-xs text-gray-500 uppercase mt-2">Ảnh cần tối ưu</div>
                            <div className="text-xl font-bold text-orange-600">{analyzeStorage.oldImagesCount}</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-orange-100 dark:border-orange-800 text-center">
                            <div className="text-xs text-gray-500 uppercase mt-2">Có thể giảm</div>
                            <div className="text-xl font-bold text-green-600">~{analyzeStorage.oldImagesSizeMB}{analyzeStorage.oldImagesSizeMB !== 'N/A' && ' MB'}</div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian lưu trữ ảnh chất lượng gốc:</label>
                            <select 
                                value={retentionDays}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setRetentionDays(Number(e.target.value))}
                                className="p-2 border rounded-lg text-sm bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value={30}>1 tháng</option>
                                <option value={90}>3 tháng (Khuyến nghị)</option>
                                <option value={180}>6 tháng</option>
                                <option value={365}>1 năm</option>
                            </select>
                        </div>

                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                            <div className="flex items-start gap-3">
                                <HardDrive className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Bước 1: Sao lưu dữ liệu về máy (Local Backup)</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Tải xuống toàn bộ ảnh gốc và nhật ký dưới dạng file JSON/Zip để lưu trữ an toàn trên máy tính cá nhân.</p>
                                </div>
                                <Button variant="secondary" onClick={handleDownloadBackup} className="ml-auto text-xs whitespace-nowrap">
                                    <Download className="w-4 h-4" /> Tải Backup
                                </Button>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
                            <div className="flex items-start gap-3">
                                <RefreshCw className="w-5 h-5 text-gray-400 mt-1" />
                                <div>
                                    <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">Bước 2: Nén ảnh cũ trên Cloud</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Hệ thống sẽ tự động giảm chất lượng các ảnh cũ hơn {retentionDays} ngày để giải phóng bộ nhớ. 
                                        <span className="text-red-500 font-bold ml-1">Không thể hoàn tác sau khi nén.</span>
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleOptimize} 
                                    disabled={analyzeStorage.oldImagesCount === '0' || analyzeStorage.oldImagesCount === 'N/A' || isCompressing}
                                    isLoading={isCompressing}
                                    className="ml-auto text-xs whitespace-nowrap bg-orange-600 hover:bg-orange-700 border-orange-600 text-white dark:bg-orange-700 dark:hover:bg-orange-800"
                                >
                                    <Archive className="w-4 h-4" /> Nén {analyzeStorage.oldImagesCount === 'N/A' ? '' : analyzeStorage.oldImagesCount} ảnh
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}
      </div>
    </div>
  );
};
