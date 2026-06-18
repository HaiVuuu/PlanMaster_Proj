import React, { useState } from 'react';
import { Project, Stakeholder, InfluenceLevel, InterestLevel } from '@/types';
import { generateUniqueId } from '@/utils/idUtils'; // Import from new utils file
import { Users, UserPlus, Target, MessageSquare, AlertCircle, TrendingUp, Download, Upload, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import VietnameseInput from '@/components/VietnameseInput';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';

interface Props {
  project: Project;
  onAddStakeholder: (stakeholder: Omit<Stakeholder, 'id'>) => void;
  onRemoveStakeholder: (stakeholderId: string) => void;
}

const DEFAULT_ORG_TYPES = [
    'Cơ quan quản lý nhà nước',
    'Địa phương',
    'Chủ Đầu Tư',
    'Tư vấn',
    'Nhà thầu',
    'Nhà cung cấp',
    'Người hưởng thụ'
];

export const StakeholderMgmt: React.FC<Props> = ({ project, onAddStakeholder, onRemoveStakeholder }) => {
  const dispatch = useDispatch();
  const [isAdding, setIsAdding] = useState(false);
  const [orgTypes, setOrgTypes] = useState<string[]>(DEFAULT_ORG_TYPES);
  const [isAddingNewType, setIsAddingNewType] = useState(false);
  const [newCustomType, setNewCustomType] = useState('');

  const [newSH, setNewSH] = useState<Partial<Stakeholder>>({
    name: '',
    title: '',
    organization: '',
    organizationType: 'Chủ Đầu Tư',
    contact: '',
    influence: 'Low',
    interest: 'Low',
    communicationPlan: '',
    concerns: ''
  });

  const getStrategy = (influence: InfluenceLevel, interest: InterestLevel): string => {
    if (influence === 'High' && interest === 'High') return 'Quản lý chặt chẽ (Manage Closely)';
    if (influence === 'High' && interest === 'Low') return 'Giữ hài lòng (Keep Satisfied)';
    if (influence === 'Low' && interest === 'High') return 'Giữ thông báo (Keep Informed)';
    return 'Theo dõi (Monitor)';
  };

  const getStrategyColor = (strategy: string) => {
    if (strategy.includes('Manage Closely')) return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
    if (strategy.includes('Keep Satisfied')) return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700';
    if (strategy.includes('Keep Informed')) return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
  };

  const handleAddCustomType = () => {
      if(newCustomType && !orgTypes.includes(newCustomType)) {
          setOrgTypes([...orgTypes, newCustomType]);
          setNewSH({...newSH, organizationType: newCustomType});
          setNewCustomType('');
          setIsAddingNewType(false);
      }
  };

  const handleAdd = () => {
    if (!newSH.name || !newSH.organization) {
      dispatch(addToast({ message: "Vui lòng nhập tên và tổ chức", type: 'error' }));
      return;
    }
    
    const stakeholder: Omit<Stakeholder, 'id'> = {
      name: newSH.name!,
      title: newSH.title || '',
      organization: newSH.organization!,
      organizationType: newSH.organizationType || 'Khác',
      contact: newSH.contact || '',
      influence: newSH.influence as InfluenceLevel || 'Low',
      interest: newSH.interest as InterestLevel || 'Low',
      strategy: getStrategy(newSH.influence as InfluenceLevel, newSH.interest as InterestLevel),
      communicationPlan: newSH.communicationPlan || '',
      concerns: newSH.concerns || ''
    };

    onAddStakeholder(stakeholder);
    
    setIsAdding(false);
    setNewSH({
        name: '', title: '', organization: '', organizationType: 'Chủ Đầu Tư', contact: '', influence: 'Low', interest: 'Low', communicationPlan: '', concerns: ''
    });
  };

  const removeStakeholder = (id: string) => {
      onRemoveStakeholder(id);
  };

  // --- EXPORT CSV ---
  const handleExport = () => {
    const headers = ["Họ tên", "Chức vụ", "Tổ chức", "Loại tổ chức", "Liên hệ", "Quyền lực", "Quan tâm", "Chiến lược", "Kế hoạch", "Lo ngại"];
    const csvRows = [headers.join(',')];

    (project.stakeholders || []).forEach((sh: Stakeholder) => {
        const row = [
            sh.name,
            sh.title,
            sh.organization,
            sh.organizationType || '',
            sh.contact,
            sh.influence,
            sh.interest,
            sh.strategy,
            sh.communicationPlan,
            sh.concerns
        ].map((item: string) => `"${(item || '').replace(/"/g, '""')}"`); // Escape quotes and wrap in quotes
        csvRows.push(row.join(','));
    });

    // Create BOM for Excel to recognize UTF-8
    const bom = "\uFEFF";
    const blob = new Blob([bom + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stakeholders_${project.id}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPORT SIMULATION ---
  
  const processCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = (event.target?.result as string) || '';
        if (!text) return;

        const parseCsvRows = (csvText: string) => {
            const rows: string[][] = [];
            let currentRow: string[] = [];
            let currentCell = '';
            let inQuotes = false;
            for (let i = 0; i < csvText.length; i++) {
                const char = csvText[i];
                const nextChar = csvText[i + 1];
                if (char === '"') {
                    if (inQuotes && nextChar === '"') {
                        currentCell += '"';
                        i++;
                    } else {
                        inQuotes = !inQuotes;
                    }
                } else if (char === ',' && !inQuotes) {
                    currentRow.push(currentCell.trim());
                    currentCell = '';
                } else if ((char === '\r' || char === '\n') && !inQuotes) {
                    if (char === '\r' && nextChar === '\n') i++;
                    if (currentCell || currentRow.length > 0) currentRow.push(currentCell.trim());
                    if (currentRow.length > 0 && currentRow.some(c => c)) rows.push(currentRow);
                    currentRow = [];
                    currentCell = '';
                } else {
                    currentCell += char;
                }
            }
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                if (currentRow.some(c => c)) rows.push(currentRow);
            }
            return rows;
        };

        const rows = parseCsvRows(text.trim()).slice(1); // Skip header

        const newStakeholders: Stakeholder[] = rows.map(row => {
            if (row.length < 10) return null; // Basic validation
            const [name, title, organization, orgType, contact, influence, interest, _strategyIgnored, communicationPlan, concerns] = row;
            const strategy = getStrategy(influence as InfluenceLevel, interest as InterestLevel);
            return {
                id: generateUniqueId(),
                name: name,
                title: title,
                organization: organization,
                organizationType: orgType || 'Khác', // Provide a default if empty
                contact: contact,
                influence: (influence === 'High' || influence === 'Low') ? (influence as InfluenceLevel) : 'Low',
                interest: (interest === 'High' || interest === 'Low') ? (interest as InterestLevel) : 'Low',
                strategy: strategy,
                communicationPlan: communicationPlan,
                concerns: concerns
            };
        }).filter(sh => sh !== null);

        newStakeholders.forEach(sh => onAddStakeholder(sh));
        dispatch(addToast({ message: `Đã nhập dữ liệu từ file ${file.name} thành công!`, type: 'success' }));
    };
    reader.readAsText(file);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if(file.type === "text/csv") {
        processCSV(file);
      } else {
        dispatch(addToast({ message: "Vui lòng tải lên file CSV.", type: 'error' }));
      }
      e.target.value = '';
    }
  };


  // Matrix Counts
  const matrix = {
      manageClosely: project.stakeholders?.filter((s: Stakeholder) => s.influence === 'High' && s.interest === 'High').length || 0,
      keepSatisfied: project.stakeholders?.filter((s: Stakeholder) => s.influence === 'High' && s.interest === 'Low').length || 0,
      keepInformed: project.stakeholders?.filter((s: Stakeholder) => s.influence === 'Low' && s.interest === 'High').length || 0,
      monitor: project.stakeholders?.filter((s: Stakeholder) => s.influence === 'Low' && s.interest === 'Low').length || 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div> 
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Quản lý Bên liên quan (Stakeholders)
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Nhận diện, phân tích và lên kế hoạch tương tác với các bên liên quan.</p>
        </div> 
        <div className="flex gap-2">
            <div className="relative">
                <Button variant="secondary" className="text-sm">
                    <Upload className="w-4 h-4" /> Import Excel
                </Button>
                <input 
                    type="file"
                    accept=".csv"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImport}
                />
            </div>
            <Button variant="secondary" className="text-sm" onClick={handleExport}>
                <Download className="w-4 h-4" /> Export Excel
            </Button>
            <Button onClick={() => setIsAdding(!isAdding)}>
                <UserPlus className="w-4 h-4" /> Thêm mới
            </Button>
        </div>
      </div>

      {/* Analysis Matrix Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 flex flex-col items-center justify-center text-center text-gray-800 dark:text-gray-200">
              <span className="text-2xl font-bold text-red-600 dark:text-red-400">{matrix.manageClosely}</span>
              <span className="text-xs font-semibold text-red-800 dark:text-red-300 uppercase mt-1">Quản lý chặt chẽ</span>
              <span className="text-[10px] text-red-500 dark:text-red-400">(Quyền lực cao, Quan tâm cao)</span>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-100 dark:border-orange-800 flex flex-col items-center justify-center text-center text-gray-800 dark:text-gray-200">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{matrix.keepSatisfied}</span>
              <span className="text-xs font-semibold text-orange-800 dark:text-orange-300 uppercase mt-1">Giữ hài lòng</span>
              <span className="text-[10px] text-orange-500 dark:text-orange-400">(Quyền lực cao, Quan tâm thấp)</span>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800 flex flex-col items-center justify-center text-center text-gray-800 dark:text-gray-200">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{matrix.keepInformed}</span>
              <span className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase mt-1">Giữ thông báo</span>
              <span className="text-[10px] text-blue-500 dark:text-blue-400">(Quyền lực thấp, Quan tâm cao)</span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center text-gray-800 dark:text-gray-200">
              <span className="text-2xl font-bold text-gray-600 dark:text-gray-300">{matrix.monitor}</span>
              <span className="text-xs font-semibold text-gray-800 dark:text-gray-300 uppercase mt-1">Theo dõi</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">(Quyền lực thấp, Quan tâm thấp)</span>
          </div>
      </div>

      {isAdding && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-blue-200 dark:border-blue-800 shadow-md space-y-4 relative text-gray-800 dark:text-gray-200">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 pb-2">Nhập thông tin Stakeholder mới</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Họ và tên</label>
                      <VietnameseInput 
                        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                        value={newSH.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSH({...newSH, name: e.target.value})}
                        placeholder="VD: Ông Phạm Văn B"
                      /> 
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Chức vụ / Vai trò</label>
                      <VietnameseInput 
                        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                        value={newSH.title}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSH({...newSH, title: e.target.value})}
                        placeholder="Giám đốc dự án, Tổ trưởng dân phố..."
                      /> 
                  </div>
                  
                  {/* Organization & Type */}
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Tên Tổ chức / Đơn vị</label>
                      <VietnameseInput 
                        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                        value={newSH.organization}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSH({...newSH, organization: e.target.value})}
                        placeholder="UBND Quận, Công ty ABC..."
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Phân loại Tổ chức</label>
                      <div className="flex gap-2">
                          <select 
                            className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                            value={newSH.organizationType}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSH({...newSH, organizationType: e.target.value})}
                          >
                            {orgTypes.map((t: string) => <option key={t} value={t}>{t}</option>)}
                          </select>
                          <button onClick={() => setIsAddingNewType(!isAddingNewType)} className="p-2 border rounded bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600" title="Thêm loại mới">
                              <Plus className="w-4 h-4"/>
                          </button>
                      </div>
                      {isAddingNewType && (
                          <div className="flex gap-2 mt-2 animate-in fade-in slide-in-from-top-1">
                              <input 
                                className="flex-1 p-1 text-sm border rounded outline-none border-blue-300"
                                placeholder="Nhập tên loại mới..."
                                value={newCustomType}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCustomType(e.target.value)}
                              />
                              <button onClick={handleAddCustomType} className="bg-blue-600 text-white text-xs px-2 rounded">Thêm</button>
                          </div>
                      )}
                  </div>

                  <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Thông tin liên hệ</label>
                      <VietnameseInput 
                        className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600"
                        value={newSH.contact}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewSH({...newSH, contact: e.target.value})}
                        placeholder="Email hoặc SĐT"
                      /> 
                  </div>
                  
                  {/* Analysis Section */}
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-600 space-y-3">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1"><Target className="w-3 h-3"/> Phân tích (Analysis)</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Quyền lực / Ảnh hưởng</label>
                            <select
                                className="w-full p-1 border rounded text-sm bg-white dark:bg-gray-600 dark:border-gray-500"
                                value={newSH.influence}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSH({...newSH, influence: e.target.value as InfluenceLevel})}
                            >
                                <option value="Low">Thấp</option>
                                <option value="High">Cao</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Mức độ quan tâm</label>
                            <select
                                className="w-full p-1 border rounded text-sm bg-white dark:bg-gray-600 dark:border-gray-500"
                                value={newSH.interest}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewSH({...newSH, interest: e.target.value as InterestLevel})}
                            >
                                <option value="Low">Thấp</option>
                                <option value="High">Cao</option>
                            </select>
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                          Chiến lược đề xuất: {getStrategy(newSH.influence as InfluenceLevel || 'Low', newSH.interest as InterestLevel || 'Low')}
                      </div>
                  </div>

                  <div className="space-y-1">
                       <label className="text-xs font-semibold text-gray-600">Mối quan tâm / Kỳ vọng chính</label>
                       <VietnameseInput
                           as="textarea"
                           className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                           rows={2}
                           value={newSH.concerns}
                           onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSH({...newSH, concerns: e.target.value})}
                           placeholder="Họ lo ngại điều gì? Họ mong đợi gì?"
                       />
                  </div>
                  <div className="col-span-1 md:col-span-2 space-y-1">
                       <label className="text-xs font-semibold text-gray-600">Kế hoạch giao tiếp (Communication Plan)</label>
                       <VietnameseInput
                           as="textarea"
                           className="w-full p-2 border rounded outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-700 dark:border-gray-600"
                           rows={2}
                           value={newSH.communicationPlan}
                           onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewSH({...newSH, communicationPlan: e.target.value})}
                           placeholder="Tần suất báo cáo? Hình thức (Họp, Email)? Nội dung gửi?"
                       />
                  </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                   <Button variant="secondary" onClick={() => setIsAdding(false)}>Hủy bỏ</Button>
                   <Button onClick={handleAdd}>Lưu Stakeholder</Button>
              </div>
          </div>
      )}

      {/* Stakeholder List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-left">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                      <th className="p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Họ tên & Tổ chức</th>
                      <th className="p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Phân tích</th>
                      <th className="p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase">Chiến lược & Giao tiếp</th>
                      <th className="p-4 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase text-right">Thao tác</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {(!project.stakeholders || project.stakeholders.length === 0) ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-400 dark:text-gray-500">Chưa có dữ liệu stakeholder.</td></tr>
                  ) : (
                      project.stakeholders.map((sh: Stakeholder) => (
                          <tr key={sh.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 group">
                              <td className="p-4 align-top">
                                  <div className="font-bold text-gray-800 dark:text-gray-200">{sh.name}</div>
                                  <div className="text-sm text-blue-600 dark:text-blue-400">{sh.title}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                      <span className="font-semibold text-xs text-gray-700 dark:text-gray-300">{sh.organization}</span>
                                      {sh.organizationType && <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">{sh.organizationType}</span>}
                                  </div>
                                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                      {sh.contact}
                                  </div>
                              </td>
                              <td className="p-4 align-top">
                                  <div className="flex flex-col gap-1 text-xs">
                                      <div className="flex justify-between w-32">
                                          <span className="text-gray-500 dark:text-gray-400">Quyền lực:</span>
                                          <span className={`font-semibold ${sh.influence === 'High' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-300'}`}>{sh.influence === 'High' ? 'Cao' : 'Thấp'}</span>
                                      </div>
                                      <div className="flex justify-between w-32">
                                          <span className="text-gray-500 dark:text-gray-400">Quan tâm:</span>
                                          <span className={`font-semibold ${sh.interest === 'High' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>{sh.interest === 'High' ? 'Cao' : 'Thấp'}</span>
                                      </div>
                                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 italic border-l-2 border-gray-200 dark:border-gray-600 pl-2">
                                          "{sh.concerns}"
                                      </div>
                                  </div>
                              </td>
                              <td className="p-4 align-top space-y-2">
                                  <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getStrategyColor(sh.strategy)}`}>
                                      <TrendingUp className="w-3 h-3 inline mr-1"/>
                                      {sh.strategy}
                                  </div>
                                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                      <MessageSquare className="w-4 h-4 mt-0.5 text-gray-400 dark:text-gray-500 shrink-0" />
                                      <p className="text-xs leading-relaxed">{sh.communicationPlan}</p>
                                  </div>
                              </td>
                              <td className="p-4 text-right align-top">
                                  <button 
                                    onClick={() => removeStakeholder(sh.id)}
                                    className="text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
                                  >
                                      Xóa
                                  </button>
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
      </div>
    </div>
  );
};
