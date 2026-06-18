import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Activity, BarChart3, CheckCircle2, TrendingUp, Users, Moon, RefreshCw, Sparkles, DollarSign, Printer, Briefcase, X, FileOutput, FileText, Clock, ShieldAlert, ScrollText, CalendarRange, PieChart as PieIcon } from 'lucide-react';
import { generateUniqueId } from '@/utils/idUtils'; // Import from new utils file
import { Project, Task, TaskStatus, User, UserStatus, ReportTimeframe, ReportSection, UserRole, ProjectReport, TaskLog, PaymentLog } from '@/types';
import { Button } from '@/components/Button';
import VietnameseInput from '@/components/VietnameseInput';
import { generateDailyReport, generateExecutiveReport } from '@/services/geminiService';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { Stakeholder } from '@/types';
// Constants
const COLORS = ['#0088FE', '#0a2722', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_LABELS: Record<TaskStatus, string> = {
    [TaskStatus.NEW]: 'Mới tạo',
    [TaskStatus.IN_PROGRESS]: 'Đang thi công',
    [TaskStatus.BLOCKED]: 'Tạm dừng',
    [TaskStatus.WAITING_QC]: 'Chờ QC',
    [TaskStatus.WAITING_APPROVAL]: 'Chờ Nghiệm thu',
    [TaskStatus.COMPLETED]: 'Hoàn thành',
    [TaskStatus.REJECTED]: 'Khắc phục'
};

interface Props {
  project: Project;
  currentUser: User | null;
  onGenerateReport: (report: ProjectReport) => void;
}

export const Dashboard: React.FC<Props> = ({ project, currentUser, onGenerateReport }) => {
  const dispatch = useDispatch();
  const [dailyInsight, setDailyInsight] = useState<string>("Đang phân tích dữ liệu công trường...");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Executive Report State
  const [showExecModal, setShowExecModal] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  // Permission Logic
  const isAdmin = currentUser?.role === UserRole.ADMIN;
  const isAdminOrQTCDT = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.QTCDT;

  // Report Config (Print)
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportConfig, setReportConfig] = useState<{
      timeframe: ReportTimeframe;
      sections: ReportSection[];
  }>({
      timeframe: 'TODAY',
      sections: ['CONSTRUCTION', 'ACCEPTANCE', 'FINANCE', 'ISSUES']
  });

  // --- LOG EXPORT STATE (ADMIN ONLY) ---
  const [showLogExportModal, setShowLogExportModal] = useState(false);
  const [logExportMode, setLogExportMode] = useState<'DATE' | 'CODE'>('DATE');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetCode, setTargetCode] = useState('');

  // --- 1. MEMOIZED STATS ---
  const pieData = useMemo(() => {
    const statusCounts = project.tasks.reduce((acc, task: Task) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (Object.keys(statusCounts) as TaskStatus[]).map(key => ({
      name: STATUS_LABELS[key] || key, // Fallback to key if label not found
      value: statusCounts[key]
    })).filter((d: { name: string, value: number }) => d.value > 0);
  }, [project.tasks]);

  const stats = useMemo(() => {
      const totalTasks = project.tasks.length;
      const avgProgress = totalTasks ? Math.round(project.tasks.reduce((sum, t: Task) => sum + t.progress, 0) / totalTasks) : 0;
      const totalVolume = project.tasks.reduce((sum, t: Task) => sum + t.quantity, 0);
      const completedVolume = project.tasks.reduce((sum, t: Task) => sum + (t.completedQuantity || 0), 0);
      return { totalTasks, avgProgress, totalVolume, completedVolume };
  }, [project.tasks]);

  // --- 2. NEW: COST STATISTICS CHART DATA ---
  const costData = useMemo(() => {
      const totalBudget = project.tasks.reduce((sum, t: Task) => sum + ((t.quantity || 0) * (t.unitPrice || 0)), 0);
      const executedValue = project.tasks.reduce((sum, t: Task) => sum + ((t.completedQuantity || 0) * (t.unitPrice || 0)), 0);
      const paidValue = project.tasks.reduce((sum, t: Task) => sum + (t.paidAmount || 0), 0);

      return [
          { name: 'Ngân sách (HĐ)', value: totalBudget, fill: '#3b82f6' }, // Blue
          { name: 'Sản lượng', value: executedValue, fill: '#10b981' }, // Green
          { name: 'Đã thanh toán', value: paidValue, fill: '#8b5cf6' } // Purple
      ];
  }, [project.tasks]);

  const formatMoney = (val: number) => {
      if (val >= 1000000000) return (val / 1000000000).toFixed(1) + ' tỷ';
      if (val >= 1000000) return (val / 1000000).toFixed(0) + ' tr';
      return val.toLocaleString();
  };

  // --- 3. GANTT CHART DATA ---
  const { sortedTasks, minTime, totalDuration } = useMemo(() => {
    const sorted = [...project.tasks].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    let minT = new Date().getTime();
    let maxT = new Date().getTime();

    if (sorted.length > 0) {
        const allStartDates = sorted.map((t: Task) => new Date(t.startDate).getTime());
        const allEndDates = sorted.map((t: Task) => new Date(t.endDate).getTime());
        sorted.forEach((t: Task) => {
            if (t.logs && t.logs.length > 0) {
                t.logs.forEach((l: TaskLog) => {
                    // Consider log timestamp for chart boundaries
                    const logTime = new Date(l.timestamp).getTime();
                    allStartDates.push(logTime);
                    allEndDates.push(logTime);
                });
            }
        });
        minT = Math.min(...allStartDates);
        maxT = Math.max(...allEndDates);
    }
    // Add buffer
    minT = minT - (1000 * 60 * 60 * 24 * 2);
    const duration = (maxT - minT) + (1000 * 60 * 60 * 24 * 10); 
    return { sortedTasks: sorted, minTime: minT, totalDuration: duration };
  }, [project.tasks]);

  // Helper to get % position from absolute timestamp
  const getPosPercent = (time: number) => {
      return ((time - minTime) / totalDuration) * 100;
  };

  // --- 4. STAKEHOLDER & USER DATA ---
  const stakeholderData = useMemo(() => {
    const strategies = (project.stakeholders || []).reduce((acc, sh: Stakeholder) => {
        const key = sh.strategy.split('(')[0].trim();
        (acc as any)[key] = ((acc as any)[key] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    return Object.keys(strategies).map((k: string) => ({ name: k, count: strategies[k] }));
  }, [project.stakeholders]);

  const { onlineUsers, inactiveUsers, birthdayUsers, currentMonth } = useMemo(() => {
      const now = new Date();
      const onlineThreshold = 30 * 60 * 1000;
      const inactiveThreshold = 3 * 24 * 60 * 60 * 1000;
      const curMonth = now.getMonth() + 1;

      const online = project.team.filter((u: User) => u.status === UserStatus.ACTIVE && u.lastActiveAt && (now.getTime() - new Date(u.lastActiveAt).getTime() < onlineThreshold));
      const inactive = project.team.filter((u: User) => u.status === UserStatus.ACTIVE && u.lastActiveAt && (now.getTime() - new Date(u.lastActiveAt).getTime() > inactiveThreshold));
      const bday = project.team.filter((u: User) => u.dob && (new Date(u.dob).getMonth() + 1) === curMonth);

      return { onlineUsers: online, inactiveUsers: inactive, birthdayUsers: bday, currentMonth: curMonth };
  }, [project.team]);

  // --- AI SUMMARY ---
  const fetchSummary = async () => {
      setIsAnalyzing(true);
      const summary = await generateDailyReport(project.tasks);
      setDailyInsight(summary);
      setIsAnalyzing(false);
  };
  useEffect(() => { fetchSummary(); }, []);

  // --- EXECUTIVE REPORT LOGIC ---

  const getWeekNumber = (d: Date) => {
      const onejan = new Date(d.getFullYear(), 0, 1);
      return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
  };

  const handleGenerateExecutiveReport = useCallback(async () => {
    setIsGeneratingReport(true);
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7); // Last 7 days

    const content = await generateExecutiveReport(
        project.tasks, 
        project.issues || [], 
        startDate.toISOString().split('T')[0], 
        endDate.toISOString().split('T')[0]
    );

    const newReport: ProjectReport = {
        id: generateUniqueId('rep'),
        title: `Báo cáo Tuần ${getWeekNumber(endDate)}`,
        generatedAt: new Date().toISOString(),
        content: content,
        periodStart: startDate.toISOString(),
        periodEnd: endDate.toISOString(),
        createdBy: 'AI Assistant'
    };

    onGenerateReport(newReport);
    setIsGeneratingReport(false);
  }, [project.tasks, project.issues, onGenerateReport]);

  // --- AUTOMATIC REPORT GENERATION ON MONDAY ---
  const autoGenRef = useRef(false);
  
  useEffect(() => {
      // This effect is intended to run once per project load to check if a weekly report needs auto-generation.
      // The guards inside (autoGenRef, alreadyExists, isGeneratingReport) prevent re-triggering.
      if (autoGenRef.current) return;
      
      const checkAndGenerateAutoReport = async () => {
          // Only Admin or QTCDT can trigger write operations automatically
          if (!isAdminOrQTCDT) return;

          const now = new Date();
          // Check if it is Monday (Day 1)
          if (now.getDay() === 1) {
              const currentWeek = getWeekNumber(now);
              const reportTitle = `Báo cáo Tuần ${currentWeek}`;
              const currentYear = now.getFullYear();

              // Check if a report for this week already exists
              const alreadyExists = project.reports?.some((r: ProjectReport) => 
                  r.title.includes(reportTitle) && 
                  new Date(r.generatedAt).getFullYear() === currentYear
              );

              if (!alreadyExists && !isGeneratingReport) {
                  console.log("Auto-generating Monday Report...");
                  autoGenRef.current = true; // Mark as checked/triggering
                  // We set a flag to show UI feedback that auto-gen is happening if needed, 
                  // or just call the function.
                  await handleGenerateExecutiveReport();
              }
          }
      };
      
      checkAndGenerateAutoReport();
  }, [project, isAdminOrQTCDT, isGeneratingReport, handleGenerateExecutiveReport]); // Run when dependencies change


  // --- LOG EXPORT FUNCTION (ADMIN) ---
  const handleExportLogs = () => {
      let filteredLogs: { taskCode: string, taskName: string, log: TaskLog }[] = [];
      let title = "";

      if (logExportMode === 'DATE') {
          const sDate = new Date(targetDate);
          sDate.setHours(0, 0, 0, 0); // Start of day
          const eDate = new Date(targetDate);
          eDate.setHours(23, 59, 59, 999); // End of day

          title = `NHẬT KÝ THI CÔNG NGÀY ${sDate.toLocaleDateString('vi-VN')}`;

          project.tasks.forEach((t: Task) => {
              t.logs.forEach((l: TaskLog) => {
                  const lDate = new Date(l.timestamp);
                  if (lDate >= sDate && lDate <= eDate) {
                      filteredLogs.push({ taskCode: t.code, taskName: t.name, log: l });
                  }
              });
          });
      } else {
          // Export by CODE
          if (!targetCode) return dispatch(addToast({ message: "Vui lòng nhập Mã công việc", type: 'error' }));
          const task = project.tasks.find((t: Task) => t.code.toLowerCase() === targetCode.toLowerCase().trim());
          if (!task) return dispatch(addToast({ message: "Không tìm thấy mã công việc này!", type: 'error' }));

          title = `LỊCH SỬ THI CÔNG HẠNG MỤC: ${task.code} - ${task.name}`;
          
          task.logs.forEach((l: TaskLog) => {
              filteredLogs.push({ taskCode: task.code, taskName: task.name, log: l });
          });
      }

      // Sort by time DESC
      filteredLogs.sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());

      if (filteredLogs.length === 0) return dispatch(addToast({ message: "Không có dữ liệu nhật ký nào phù hợp.", type: 'info' }));

      // Generate HTML
      const printContent = `
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
                h1 { text-align: center; color: #1e40af; margin-bottom: 5px; font-size: 20px; }
                .meta { text-align: center; font-style: italic; color: #666; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
                th { background-color: #f3f4f6; font-weight: bold; }
                .time { white-space: nowrap; width: 120px; }
                .user { font-weight: bold; color: #4b5563; }
                .action { color: #2563eb; font-weight: 600; font-size: 11px; text-transform: uppercase; }
                .img-grid { display: flex; gap: 5px; margin-top: 5px; flex-wrap: wrap; }
                .img-grid img { width: 80px; height: 80px; object-fit: cover; border: 1px solid #eee; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="meta">
                Dự án: ${project.name}<br/>
                Ngày xuất: ${new Date().toLocaleString('vi-VN')}
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Thời gian</th>
                        <th>Hạng mục</th>
                        <th>Người thực hiện</th>
                        <th>Nội dung / Diễn giải</th>
                        <th>Hình ảnh</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredLogs.map((item: { taskCode: string, taskName: string, log: TaskLog }) => `
                        <tr>
                            <td class="time">${new Date(item.log.timestamp).toLocaleString('vi-VN')}</td>
                            <td><b>${item.taskCode}</b><br/>${item.taskName}</td>
                            <td class="user">${item.log.userName}<br/><span style="font-weight:normal; font-size:11px">(${item.log.userRole})</span></td>
                            <td>
                                ${item.log.actionType ? `<span class="action">[${item.log.actionType}]</span><br/>` : ''}
                                ${item.log.note || ''}
                                ${item.log.amount > 0 ? `<br/><b>Khối lượng: +${item.log.amount}</b>` : ''}
                                ${item.log.safetyIssues ? `<br/><span style="color:red">⚠️ ${item.log.safetyIssues.join(', ')}</span>` : ''}
                            </td>
                            <td>
                                ${item.log.images && item.log.images.length > 0 ? 
                                    `<div class="img-grid">${item.log.images.map((img: string) => `<img src="${img}"/>`).join('')}</div>` 
                                    : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            
            <div class="footer">
                <div><b>Người lập bảng</b><br/><br/>(Ký tên)</div>
                <div><b>Xác nhận TVGS</b><br/><br/>(Ký tên)</div>
            </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.print();
      }
      setShowLogExportModal(false);
  };
    // --- STANDARD REPORT GENERATION LOGIC (PRINT) ---
  const handleGenerateReport = () => {
    // 1. Define Time Range
    const now = new Date();
    let startTime = new Date(0); // Epoch for TOTAL
    let endTime = new Date(); // Now
    let timeframeLabel = "Lũy kế đến hiện tại";

    if (reportConfig.timeframe === 'TODAY') {
        startTime = new Date(now.setHours(0,0,0,0));
        timeframeLabel = `Ngày ${startTime.toLocaleDateString('vi-VN')}`;
    } else if (reportConfig.timeframe === 'WEEK') {
        const day = now.getDay() || 7; 
        if (day !== 1) now.setHours(-24 * (day - 1)); 
        startTime = new Date(now.setHours(0,0,0,0));
        timeframeLabel = `Tuần từ ${startTime.toLocaleDateString('vi-VN')}`;
    } else if (reportConfig.timeframe === 'MONTH') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1);
        timeframeLabel = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
    } else if (reportConfig.timeframe === 'YEAR') {
        startTime = new Date(now.getFullYear(), 0, 1);
        timeframeLabel = `Năm ${now.getFullYear()}`;
    }

    // 2. Filter Data
    const logsInRange: {task: string, log: TaskLog}[] = [];
    const paymentsInRange: {task: string, log: PaymentLog}[] = [];
    const approvedTasks: string[] = [];
    let executedVal = 0;
    let paymentVal = 0;

    project.tasks.forEach((t: Task) => {
        // Logs
        t.logs.forEach((l: TaskLog) => {
            const lTime = new Date(l.timestamp);
            if (lTime >= startTime && lTime <= endTime) {
                if (reportConfig.sections.includes('CONSTRUCTION') && (l.amount > 0 || l.note)) {
                    logsInRange.push({ task: t.name, log: l });
                    if (l.amount > 0) executedVal += (l.amount * (t.unitPrice || 0));
                }
                if (reportConfig.sections.includes('ACCEPTANCE') && l.actionType === 'APPROVE') {
                    approvedTasks.push(`${t.name} (Code: ${t.code})`);
                }
                if (reportConfig.sections.includes('ISSUES') && l.safetyIssues && l.safetyIssues.length > 0) {
                     // Add logic if needed, currently reusing logsInRange or separate list
                }
            }
        });
        
        // Payments
        if (reportConfig.sections.includes('FINANCE')) {
            t.paymentLogs?.forEach((p: PaymentLog) => {
                const pTime = new Date(p.timestamp);
                if (pTime >= startTime && pTime <= endTime) {
                    paymentsInRange.push({ task: t.name, log: p });
                    paymentVal += p.amount;
                }
            });
        }
    });

    // 3. Build HTML Content for Print
    const printContent = `
        <html>
        <head>
            <title>Báo cáo dự án - ${project.name}</title>
            <style>
                body { font-family: 'Times New Roman', serif; padding: 40px; color: #333; }
                h1 { text-align: center; color: #1e40af; margin-bottom: 5px; }
                h2 { border-bottom: 2px solid #ccc; padding-bottom: 5px; margin-top: 30px; font-size: 18px; color: #444; }
                .meta { text-align: center; font-style: italic; color: #666; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f3f4f6; }
                .amount { text-align: right; font-weight: bold; }
                .badge { padding: 2px 5px; border-radius: 4px; font-size: 11px; background: #eee; }
                .footer { margin-top: 50px; display: flex; justify-content: space-between; text-align: center; }
            </style>
        </head>
        <body>
            <h1>BÁO CÁO DỰ ÁN</h1>
            <div class="meta">
                Dự án: ${project.name}<br/>
                Kỳ báo cáo: ${timeframeLabel}<br/>
                Ngày xuất: ${new Date().toLocaleString('vi-VN')}
            </div>

            ${reportConfig.sections.includes('FINANCE') ? `
                <h2>I. TỔNG HỢP TÀI CHÍNH KỲ NÀY</h2>
                <table>
                    <tr><th>Hạng mục</th><th class="amount">Giá trị (VND)</th></tr>
                    <tr><td>Giá trị sản lượng thực hiện</td><td class="amount">${executedVal.toLocaleString()} ₫</td></tr>
                    <tr><td>Giá trị đã giải ngân/thanh toán</td><td class="amount">${paymentVal.toLocaleString()} ₫</td></tr>
                </table>
                ${paymentsInRange.length > 0 ? `
                    <h3>Chi tiết thanh toán:</h3>
                    <table>
                        <tr><th>Ngày</th><th>Hạng mục</th><th>Nội dung</th><th class="amount">Số tiền</th></tr>
                        ${paymentsInRange.map(p => `
                            <tr>
                                <td>${new Date(p.log.timestamp).toLocaleDateString('vi-VN')}</td>
                                <td>${p.task}</td>
                                <td>${p.log.note}</td>
                                <td class="amount">${p.log.amount.toLocaleString()}</td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p><i>Không có giao dịch thanh toán nào.</i></p>'}
            ` : ''}

            ${reportConfig.sections.includes('CONSTRUCTION') ? `
                <h2>II. TIẾN ĐỘ THI CÔNG & NHẬT KÝ</h2>
                ${logsInRange.length > 0 ? `
                    <table>
                        <tr><th>Thời gian</th><th>Công việc</th><th>Nhân sự</th><th>Nội dung / Khối lượng</th></tr>
                        ${logsInRange.map((l: {task: string, log: TaskLog}) => `
                            <tr>
                                <td>${new Date(l.log.timestamp).toLocaleString('vi-VN')}</td>
                                <td>${l.task}</td>
                                <td>${l.log.userName}</td>
                                <td>
                                    ${l.log.amount > 0 ? `<b>+${l.log.amount}</b> ` : ''} 
                                    ${l.log.note || ''}
                                    ${l.log.safetyIssues ? `<br/><span style="color:red">⚠️ ${l.log.safetyIssues.join(', ')}</span>` : ''}
                                </td>
                            </tr>
                        `).join('')}
                    </table>
                ` : '<p><i>Không có nhật ký thi công nào.</i></p>'}
            ` : ''}

            ${reportConfig.sections.includes('ACCEPTANCE') ? `
                <h2>III. CÔNG TÁC NGHIỆM THU (TVGS DUYỆT)</h2>
                ${approvedTasks.length > 0 ? `
                    <ul>
                        ${approvedTasks.map((t: string) => `<li>✅ ${t}</li>`).join('')}
                    </ul>
                ` : '<p><i>Chưa có hạng mục nào được nghiệm thu trong kỳ này.</i></p>'}
            ` : ''}
            
            <div class="footer">
                <div><b>Người lập báo cáo</b><br/><br/><br/>(Ký tên)</div>
                <div><b>Tư vấn giám sát</b><br/><br/><br/>(Ký tên)</div>
                <div><b>Chủ đầu tư</b><br/><br/><br/>(Ký tên)</div>
            </div>
        </body>
        </html>
    `;

    // 4. Open Print Window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        printWindow.print();
    }
    setShowReportModal(false);
  };

  const toggleReportSection = (sec: ReportSection) => {
      setReportConfig(prev => ({
          ...prev,
          sections: prev.sections.includes(sec) ? prev.sections.filter((s: ReportSection) => s !== sec) : [...prev.sections, sec]
      }));
  };

  return (
    <>
    <div className="space-y-6 relative">
      {/* HEADER WITH REPORT BUTTONS */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <Activity className="w-6 h-6 text-blue-600"/> Dashboard Tổng Quan
              </h2>
              <p className="text-sm text-gray-500">Số liệu cập nhật thời gian thực</p>
          </div>
          <div className="flex gap-2">
              {isAdmin && (
                  <Button onClick={() => setShowLogExportModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white shadow-md">
                      <FileOutput className="w-4 h-4" /> Xuất Nhật Ký
                  </Button>
              )}
              {isAdminOrQTCDT && (
                  <Button onClick={() => setShowExecModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                      <Briefcase className="w-4 h-4" /> Báo cáo Quản trị (AI)
                  </Button>
              )}
              <Button onClick={() => setShowReportModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                  <Printer className="w-4 h-4" /> Xuất Báo Cáo
              </Button>
          </div>
      </div>

      {/* AI Daily Insight Card */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/50 dark:to-purple-900/50 p-6 rounded-xl shadow-sm border border-indigo-100 dark:border-indigo-800/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
              <Sparkles className="w-24 h-24 text-indigo-500" />
          </div>
          <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-indigo-800 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-indigo-600" />
                      AI Daily Insight (Tóm tắt công trường hôm nay)
                  </h3>
                  <button onClick={fetchSummary} disabled={isAnalyzing} className="text-indigo-500 hover:text-indigo-700 p-1 rounded hover:bg-white/50 dark:hover:bg-gray-700/50">
                      <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  </button>
              </div>
              <p className={`text-sm text-indigo-700 leading-relaxed ${isAnalyzing ? 'animate-pulse' : ''}`}>
                  {dailyInsight}
              </p>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600"><BarChart3 className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 dark:text-gray-400">Tổng công việc</p><p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.totalTasks}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-full text-green-600"><CheckCircle2 className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 dark:text-gray-400">Tiến độ TB</p><p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.avgProgress}%</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
          <div className="p-3 bg-purple-100 rounded-full text-purple-600"><TrendingUp className="w-6 h-6" /></div>
          <div><p className="text-sm text-gray-500 dark:text-gray-400">Tổng KH (Unit)</p><p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stats.totalVolume.toLocaleString()}</p></div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-full text-orange-600"><PieIcon className="w-6 h-6" /></div>
            <div><p className="text-sm text-gray-500 dark:text-gray-400">Đã thực hiện</p><p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{Math.round(stats.completedVolume).toLocaleString()}</p></div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart: Task Status (1/3 width) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-80">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 text-sm uppercase">Trạng thái công việc</h3>
          <div onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                  {pieData.map((entry: { name: string, value: number }, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36} iconSize={10}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* NEW: Cost Stats Chart (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-80">
          <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 text-sm uppercase">
              <DollarSign className="w-4 h-4 text-green-600" />
              Thống kê Quản lý Chi phí
          </h3>
          <div onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} layout="vertical" margin={{ left: 40, right: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(val) => formatMoney(val)} />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontWeight: 500}} />
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)} />
                <Bar dataKey="value" barSize={30} radius={[0, 4, 4, 0]}>
                  {costData.map((entry: { name: string, value: number, fill: string }, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Stakeholders & HR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64">
              <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 text-sm uppercase"><Users className="w-4 h-4"/> Phân loại Stakeholders</h3>
              <div onMouseDown={(e: React.MouseEvent) => e.stopPropagation()}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stakeholderData}>
                    <XAxis dataKey="name" tick={{fontSize: 10}} interval={0}/>
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {stakeholderData.map((entry: { name: string, count: number }, index: number) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>
           
           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 overflow-hidden">
               <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 text-sm uppercase"><Activity className="w-4 h-4 text-green-500"/> Nhân sự Online ({onlineUsers.length})</h3>
               <div className="space-y-3 overflow-y-auto h-full pb-8 custom-scrollbar">
                  {onlineUsers.length > 0 ? onlineUsers.map((u: User) => (
                      <div key={u.id} className="flex items-center gap-3">
                          <div className="relative">
                              <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700" alt="avatar" />
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
                          </div>
                          <div><div className="text-sm font-medium text-gray-800 dark:text-gray-200">{u.fullname}</div><div className="text-xs text-gray-500 dark:text-gray-400">{u.role}</div></div>
                      </div>
                  )) : <p className="text-sm text-gray-400 dark:text-gray-500 italic">Không có ai đang online.</p>}
               </div>
           </div>

           <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-64 overflow-hidden">
               <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2 text-sm uppercase"><Moon className="w-4 h-4 text-gray-400"/> Vắng mặt ({'>'} 3 ngày)</h3>
               <div className="space-y-3 overflow-y-auto h-full pb-8 custom-scrollbar">
                  {inactiveUsers.length > 0 ? inactiveUsers.map((u: User) => (
                      <div key={u.id} className="flex items-center gap-3 opacity-70">
                          <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700 grayscale" alt="avatar" />
                          <div>
                              <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{u.fullname}</div>
                              <div className="text-[10px] text-red-500 font-medium">{u.lastActiveAt ? `Last: ${new Date(u.lastActiveAt).toLocaleDateString()}` : 'Chưa online'}</div>
                          </div>
                      </div>
                  )) : <p className="text-sm text-green-600 dark:text-green-500 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/> Tất cả đều hoạt động.</p>}
               </div>
           </div>
      </div>

      {/* Gantt Chart Area */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-6 flex justify-between">
            <span>Biểu đồ Tiến độ & Khối lượng (Log thực tế)</span>
            <div className="flex gap-4 text-xs font-normal">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-200 rounded-sm border border-blue-300"></span> Kế hoạch</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Thực tế (Theo giờ ghi nhận)</span>
            </div>
        </h3>
        <div className="relative w-full h-80 overflow-y-auto overflow-x-hidden border-t border-gray-100 dark:border-gray-700 pt-4">
           <div className="space-y-4">
              {sortedTasks.map((task: Task) => {
                  const taskStartMs = new Date(task.startDate).getTime();
                  const taskEndMs = new Date(task.endDate).getTime();
                  // Avoid division by zero if start == end
                  const planDurationMs = Math.max(taskEndMs - taskStartMs, 86400000); 
                  const planQuantity = task.quantity || 1; // Avoid division by zero
                  const productivityPerMs = planQuantity / planDurationMs;

                  const planLeft = getPosPercent(taskStartMs);
                  const planWidth = getPosPercent(taskEndMs) - planLeft;

                  return (
                  <div key={task.id} className="flex items-center group py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <div className="w-1/3 pl-4 pr-2 text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex flex-col">
                         <span>{task.code} - {task.name}</span>
                         <span className="text-[10px] text-gray-400 dark:text-gray-500">
                             {task.progress}% ({task.completedQuantity}/{task.quantity} {task.unit})
                         </span>
                      </div>
                      <div className="w-2/3 relative h-10 bg-gray-50/30 dark:bg-gray-700/30 rounded mr-4 overflow-hidden">
                          {/* Plan Bar */}
                          <div 
                              className="absolute h-4 top-1 bg-blue-200 rounded-sm opacity-80 border border-blue-300" 
                              style={{left: `${Math.max(0, planLeft)}%`, width: `${Math.max(0.5, planWidth)}%`}}
                              title={`Kế hoạch: ${new Date(task.startDate).toLocaleDateString('vi-VN')} - ${new Date(task.endDate).toLocaleDateString('vi-VN')}`}
                          ></div>
                           
                           {/* Actual Discontinuous Blocks (Calculated based on Productivity) */}
                           {task.logs && task.logs.filter((l: TaskLog) => l.amount > 0).map((log: TaskLog) => {
                               // 1. Determine End Time (Completion Time)
                               const logEndMs = log.endTime ? new Date(log.endTime).getTime() : new Date(log.timestamp).getTime();

                               // 2. Calculate Duration based on Plan Productivity
                               // Duration = Amount / (TotalPlanQuantity / TotalPlanDuration)
                               const calculatedDurationMs = log.amount / productivityPerMs;

                               // 3. Derive Start Time
                               const logStartMs = logEndMs - calculatedDurationMs;

                               const leftPos = getPosPercent(logStartMs);
                               const widthPos = getPosPercent(logEndMs) - leftPos;

                               return (
                                   <div 
                                       key={log.id}
                                       className="absolute h-2 top-6 bg-green-500 rounded-sm shadow-sm hover:bg-green-600 transition-colors cursor-pointer" 
                                       style={{left: `${Math.max(0, leftPos)}%`, width: `${Math.max(0.2, widthPos)}%`}}
                                       title={`Hoàn thành: ${new Date(logEndMs).toLocaleString()} | KL: ${log.amount} | Thời gian ước tính: ${(calculatedDurationMs/3600000).toFixed(1)}h`}
                                   ></div>
                               );
                           })}
                      </div>
                  </div>
              )})}
           </div>
        </div>
      </div>

      {/* EXECUTIVE REPORT MODAL (ADMIN ONLY) */}
      {showExecModal && isAdminOrQTCDT && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/30 border-b border-purple-100 dark:border-purple-800 flex justify-between items-center rounded-t-xl">
                      <h3 className="font-bold text-purple-900 flex items-center gap-2">
                          <Briefcase className="w-5 h-5" /> Trung tâm Báo cáo Quản trị (AI Executive Center)
                      </h3>
                      <button onClick={() => setShowExecModal(false)}><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  
                  <div className="flex-1 overflow-auto p-6 space-y-4">
                      {/* Control Bar */}
                      <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div>
                            <h4 className="font-bold text-gray-700 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-500" /> Báo cáo Tuần (AI Generated)
                            </h4>
                            <p className="text-xs text-gray-500">Tự động tổng hợp tiến độ, phân tích các sự cố và đánh giá kết quả khắc phục tồn tại từ dữ liệu hệ thống.</p>
                          </div>
                          <Button onClick={handleGenerateExecutiveReport} isLoading={isGeneratingReport} className="bg-purple-600 hover:bg-purple-700 text-white shadow-md">
                              <Sparkles className="w-4 h-4" /> Lập báo cáo Tuần này
                          </Button>
                      </div>

                      {/* Reports List */}
                      <div className="min-h-[300px]">
                          {project.reports && project.reports.length > 0 ? (
                              <div className="space-y-6">
                                  {project.reports.map((rep: ProjectReport) => (
                                      <div key={rep.id} className="bg-white dark:bg-gray-700/50 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-600 pb-3 mb-4">
                                              <div>
                                                  <h5 className="font-bold text-xl text-gray-800 dark:text-gray-200">{rep.title}</h5>
                                                  <span className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                                      <Clock className="w-3 h-3"/> Được tạo lúc: {new Date(rep.generatedAt).toLocaleString()}
                                                  </span>
                                              </div>
                                              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded font-medium">AI Generated</span>
                                          </div>
                                          <div 
                                            className="text-sm text-gray-700 dark:text-gray-300 prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-800 dark:prose-headings:text-gray-200 prose-a:text-blue-600"
                                            dangerouslySetInnerHTML={{ __html: rep.content }}
                                          />
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500 gap-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-800/20">
                                  <ShieldAlert className="w-12 h-12 opacity-20" />
                                  <p className="font-medium">Chưa có báo cáo nào được lập.</p>
                                  <p className="text-xs max-w-md text-center">
                                      Hệ thống sẽ phân tích nhật ký thi công, các cảnh báo an toàn và lịch sử phê duyệt/từ chối để tạo báo cáo tổng hợp.
                                  </p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* EXPORT LOG MODAL (ADMIN ONLY) */}
      {showLogExportModal && isAdmin && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                  <div className="p-4 bg-orange-50 dark:bg-orange-900/30 border-b border-orange-100 dark:border-orange-800 flex justify-between items-center rounded-t-xl">
                      <h3 className="font-bold text-orange-900 flex items-center gap-2">
                          <ScrollText className="w-5 h-5" /> Xuất Nhật Ký Thi Công
                      </h3>
                      <button onClick={() => setShowLogExportModal(false)}><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <div className="p-6 space-y-4">
                      {/* Tabs */}
                      <div className="flex p-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <button 
                            onClick={() => setLogExportMode('DATE')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${logExportMode === 'DATE' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
                          >
                              Theo Ngày
                          </button>
                          <button 
                            onClick={() => setLogExportMode('CODE')}
                            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${logExportMode === 'CODE' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
                          >
                              Theo Mã Hạng Mục
                          </button>
                      </div>

                      {/* Inputs */}
                      {logExportMode === 'DATE' ? (
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Chọn ngày xuất nhật ký</label>
                              <input 
                                type="date" 
                                className="w-full p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700"
                                value={targetDate}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetDate(e.target.value)}
                              />
                          </div>
                      ) : (
                          <div className="space-y-2">
                              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Nhập mã công việc (VD: HĐ-01)</label>
                              <VietnameseInput 
                                type="text" 
                                className="w-full p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-gray-700"
                                placeholder="Nhập mã..."
                                value={targetCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetCode(e.target.value)}
                              />
                          </div>
                      )}

                      <Button onClick={handleExportLogs} className="w-full bg-orange-600 hover:bg-orange-700 text-white mt-4">
                          <FileOutput className="w-4 h-4" /> Xuất & In Nhật Ký
                      </Button>
                  </div>
              </div>
          </div>
      )}

      {/* REPORT GENERATION MODAL (STANDARD) */}
      {showReportModal && (
          <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center rounded-t-xl">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Printer className="w-5 h-5 text-blue-600" /> Cấu hình Báo cáo
                      </h3>
                      <button onClick={() => setShowReportModal(false)}><X className="w-5 h-5 text-gray-500"/></button>
                  </div>
                  <div className="p-6 space-y-6">
                      {/* Timeframe Selection */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><CalendarRange className="w-4 h-4"/> Thời gian báo cáo</label>
                          <div className="grid grid-cols-3 gap-2">
                              {(['TODAY', 'WEEK', 'MONTH', 'YEAR', 'TOTAL'] as ReportTimeframe[]).map((tf) => (
                                  <button 
                                    key={tf}
                                    onClick={() => setReportConfig({...reportConfig, timeframe: tf as ReportTimeframe})}
                                    className={`py-2 text-xs font-medium rounded border transition-colors
                                        ${reportConfig.timeframe === tf ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-300 dark:border-gray-600'}
                                    `}
                                  >
                                      {tf === 'TODAY' ? 'Hôm nay' : tf === 'WEEK' ? 'Tuần này' : tf === 'MONTH' ? 'Tháng này' : tf === 'YEAR' ? 'Năm nay' : 'Lũy kế'}
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Section Selection */}
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase flex items-center gap-1"><FileText className="w-4 h-4"/> Nội dung báo cáo</label>
                          <div className="space-y-2">
                              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                  <input type="checkbox" checked={reportConfig.sections.includes('CONSTRUCTION')} onChange={() => toggleReportSection('CONSTRUCTION')} className="w-4 h-4 text-blue-600 rounded"/>
                                  <div>
                                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Thi công & Tiến độ</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Khối lượng thực hiện, nhật ký công trường</div>
                                  </div>
                              </label>
                              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                  <input type="checkbox" checked={reportConfig.sections.includes('ACCEPTANCE')} onChange={() => toggleReportSection('ACCEPTANCE')} className="w-4 h-4 text-blue-600 rounded"/>
                                  <div>
                                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Công tác Nghiệm thu</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Các hạng mục đã được TVGS xác nhận Đạt</div>
                                  </div>
                              </label>
                              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                  <input type="checkbox" checked={reportConfig.sections.includes('FINANCE')} onChange={() => toggleReportSection('FINANCE')} className="w-4 h-4 text-blue-600 rounded"/>
                                  <div>
                                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Tài chính & Chi phí</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Giá trị sản lượng, giải ngân, thanh toán</div>
                                  </div>
                              </label>
                              <label className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                                  <input type="checkbox" checked={reportConfig.sections.includes('ISSUES')} onChange={() => toggleReportSection('ISSUES')} className="w-4 h-4 text-blue-600 rounded"/>
                                  <div>
                                      <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Sự cố & An toàn</div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">Cảnh báo an toàn (AI), sự cố công trường</div>
                                  </div>
                              </label>
                          </div>
                      </div>

                      <Button onClick={handleGenerateReport} className="w-full justify-center bg-blue-600 hover:bg-blue-700">
                          <Printer className="w-4 h-4" /> Tạo trang in (Print Preview)
                      </Button>
                  </div>
              </div>
          </div>
      )}
    </div>
    </>
  );
};
