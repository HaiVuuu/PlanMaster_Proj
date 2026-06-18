
import { GoogleGenAI, Type } from "@google/genai";
import { Task, TaskStatus, ProjectIssue, TaskLog } from "../types";

interface RawAITask {
    code: string;
    name: string;
    unit: string;
    quantity: number;
    durationDays: number;
}

// Helper to get today's date in YYYY-MM-DD
const getToday = () => new Date().toISOString().split('T')[0];
const addDays = (days: number) => {
    const result = new Date();
    result.setDate(result.getDate() + days);
    return result.toISOString().split('T')[0];
};

// Robust API Key retrieval
const getApiKey = () => {
  // Vite exposes env variables on import.meta.env
  // Variables must be prefixed with VITE_ to be exposed to the client.
  const apiKey = import.meta.env.VITE_API_KEY;
  if (!apiKey) {
    console.warn("API Key not found. Make sure to set VITE_API_KEY in your .env file.");
    return '';
  }
  return apiKey;
};

export const generateTasksWithAI = async (projectName: string, description: string): Promise<Task[]> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return [];
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a realistic construction or project schedule for a project named "${projectName}" described as "${description}". 
      Return a list of 5-10 key tasks with realistic quantities, units, and sequential dates starting from today.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              code: { type: Type.STRING, description: "Task code e.g. T-01" },
              name: { type: Type.STRING, description: "Task name in Vietnamese" },
              unit: { type: Type.STRING, description: "Unit of measurement e.g. m2, kg, cai" },
              quantity: { type: Type.NUMBER, description: "Estimated quantity" },
              durationDays: { type: Type.NUMBER, description: "Duration in days" }
            },
            required: ["code", "name", "unit", "quantity", "durationDays"]
          }
        }
      }
    });

    const rawTasks = JSON.parse(response.text || "[]");
    
    let currentStartDate = new Date();

    return rawTasks.map((t: RawAITask, index: number) => {
        const start = currentStartDate.toISOString().split('T')[0];
        // Advance start date for next task slightly for waterfall effect
        const endDt = new Date(currentStartDate);
        endDt.setDate(endDt.getDate() + t.durationDays);
        const end = endDt.toISOString().split('T')[0];
        
        // Move next start date
        currentStartDate.setDate(currentStartDate.getDate() + Math.ceil(t.durationDays / 2));

        return {
            id: `gen-${Date.now()}-${index}`,
            order: index + 1,
            code: t.code,
            name: t.name,
            unit: t.unit,
            quantity: t.quantity,
            completedQuantity: 0, // Initialize to avoid undefined
            logs: [], // Initialize logs
            startDate: start,
            endDate: end,
            progress: 0,
            status: TaskStatus.NEW,
            assignees: [] // Initialize empty assignees
        };
    });

  } catch (error) {
    console.error("Error generating tasks:", error);
    return [];
  }
};

export const optimizeScheduleWithAI = async (tasks: Task[], startDate: string, totalDuration: number): Promise<Task[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return tasks;
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Filter minimal data to save tokens
    const taskSummary = tasks.map((t: Task) => ({
        id: t.id,
        name: t.name,
        quantity: t.quantity,
        unit: t.unit
    }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `You are a Construction Project Manager. 
            I have a list of tasks (JSON below). 
            The project MUST start on ${startDate} and finish within ${totalDuration} days.
            
            Tasks: ${JSON.stringify(taskSummary)}

            Please analyze the tasks, consider realistic construction sequencing (dependencies), labor productivity, and resource optimization.
            Return the same list of tasks but with optimized "startDate" and "endDate" (YYYY-MM-DD format).
            Ensure logical overlapping (waterfall model) where possible to minimize time but maintain quality.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            startDate: { type: Type.STRING },
                            endDate: { type: Type.STRING }
                        },
                        required: ["id", "startDate", "endDate"]
                    }
                }
            }
        });

        const optimizedData = JSON.parse(response.text || "[]");
        
        // Merge back into original tasks
        return tasks.map((t: Task) => {
            const opt = optimizedData.find((o: { id: string }) => o.id === t.id);
            if (opt) {
                return { ...t, startDate: opt.startDate, endDate: opt.endDate };
            }
            return t;
        });

    } catch (e) {
        console.error("AI Optimization failed", e);
        return tasks;
    }
};

export const analyzeImageForSafety = async (base64Image: string): Promise<string[]> => {
    const apiKey = getApiKey();
    if (!apiKey) return [];
    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
        const imagePart = {
            inlineData: {
                mimeType: 'image/jpeg',
                data: base64Image.split(',')[1] // Remove data:image/jpeg;base64, prefix
            }
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', // Use vision capable model
            contents: {
                parts: [
                    imagePart,
                    {
                        text: "Analyze this construction site image for safety (HSE) violations. Are workers wearing helmets and high-vis vests? Are there trip hazards? Return a JSON array of specific safety warnings in Vietnamese. If it's safe or irrelevant, return an empty array."
                    }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });

        const issues = JSON.parse(response.text || "[]");
        return issues;
    } catch (error) {
        console.error("AI Safety Check Error:", error);
        return [];
    }
};

export const generateDailyReport = async (tasks: Task[]): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Không thể tạo báo cáo: API Key chưa được cấu hình.";
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Collect logs from "today" (simulated by checking last 24h or just all recent logs for demo)
    const todayLogs = tasks.flatMap((t: Task) => 
        (t.logs || []).map((l: TaskLog) => ({
            taskName: t.name,
            action: l.actionType || 'UPDATE',
            amount: l.amount,
            note: l.note,
            user: l.userName,
            time: l.timestamp
        }))
    ).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 20); // Top 20 recent logs

    if (todayLogs.length === 0) return "Chưa có dữ liệu nhật ký hôm nay.";

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Bạn là trợ lý Quản lý Dự án. Dựa trên danh sách nhật ký thi công dưới đây, hãy viết một đoạn văn tóm tắt ngắn gọn (khoảng 3-4 câu) về tình hình công trường hôm nay. Tập trung vào khối lượng đã làm, các sự cố (nếu có trong note) và trạng thái nghiệm thu. Văn phong chuyên nghiệp tiếng Việt.
            
            Logs: ${JSON.stringify(todayLogs)}`
        });

        return response.text || "Không có dữ liệu tóm tắt.";
    } catch (error) {
        console.error("Daily Report Error:", error);
        return "Lỗi khi tạo báo cáo tự động.";
    }
};

// --- NEW FUNCTION: Executive Weekly Report ---
export const generateExecutiveReport = async (
    tasks: Task[], 
    issues: ProjectIssue[], 
    startDate: string, 
    endDate: string
): Promise<string> => {
    const apiKey = getApiKey();
    if (!apiKey) return "Không thể tạo báo cáo: API Key chưa được cấu hình.";
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // 1. Gather all logs within the specific timeframe (Recent activity)
    const recentLogs = tasks.flatMap((t: Task) => 
        (t.logs || []).filter((l: TaskLog) => {
            const d = new Date(l.timestamp);
            return d >= new Date(startDate) && d <= new Date(endDate);
        }).map((l: TaskLog) => ({
            task: t.name,
            code: t.code,
            amount: l.amount,
            note: l.note,
            issues: l.safetyIssues,
            type: l.actionType,
            timestamp: l.timestamp
        }))
    );

    // 2. Identification of "Previous Issues" for "Fixing Analysis"
    // Filter tasks that EVER had a 'REJECT' or 'REJECT_QC' action or Safety Issues BEFORE the current start date,
    // AND have activity (logs) in the current period (indicating potential fixing).
    const problematicTaskData = tasks.filter((t: Task) => {
        const hasHistory = (t.logs || []).some((l: TaskLog) => {
            const d = new Date(l.timestamp);
            const isOld = d < new Date(startDate);
            return isOld && (l.actionType === 'REJECT' || l.actionType === 'REJECT_QC' || (l.safetyIssues && l.safetyIssues.length > 0));
        });
        const hasRecentActivity = (t.logs || []).some((l: TaskLog) => {
             const d = new Date(l.timestamp);
             return d >= new Date(startDate) && d <= new Date(endDate);
        });
        return hasHistory && hasRecentActivity;
    }).map(t => ({
        taskName: t.name,
        code: t.code,
        // Send ALL logs for these tasks so AI can see the history (Reject -> ... -> Approve)
        fullHistory: t.logs.map((l: TaskLog) => ({
            action: l.actionType,
            note: l.note,
            issues: l.safetyIssues,
            date: l.timestamp
        }))
    }));

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `
                Bạn là Giám đốc Dự án cấp cao. Hãy viết một Báo cáo Tuần (Executive Summary) chuyên nghiệp.
                
                THỜI GIAN BÁO CÁO: ${startDate} đến ${endDate}

                DỮ LIỆU ĐẦU VÀO:
                1. NHẬT KÝ HOẠT ĐỘNG TRONG TUẦN:
                ${JSON.stringify(recentLogs)}

                2. LỊCH SỬ CÁC HẠNG MỤC TỪNG BỊ TỪ CHỐI/SỰ CỐ (ĐỂ PHÂN TÍCH KHẮC PHỤC):
                ${JSON.stringify(problematicTaskData)}

                YÊU CẦU ĐẦU RA (Định dạng HTML, dùng thẻ h3, p, ul, li):
                
                <h3>I. TỔNG QUAN TÌNH HÌNH</h3>
                (Tóm tắt ngắn gọn tiến độ và khối lượng thực hiện trong tuần).

                <h3>II. TÌNH HÌNH KHẮC PHỤC CÁC TỒN TẠI (QUAN TRỌNG)</h3>
                (Phân tích dựa trên Dữ liệu số 2: Tìm các công việc trước đây bị 'REJECT' hoặc có sự cố, xem trong tuần này đã có hành động 'APPROVE', 'SUBMIT_QC' hay cập nhật mới chưa.
                - Nếu đã Approved: Ghi nhận đã khắc phục xong.
                - Nếu có Update: Ghi nhận đang khắc phục.
                - Nếu không có hoạt động: Cảnh báo chậm trễ).

                <h3>III. CÁC VẤN ĐỀ MỚI & RỦI RO</h3>
                (Dựa trên nhật ký tuần này: Có mục nào bị REJECT mới không? Có cảnh báo an toàn mới không?)

                <h3>IV. KẾ HOẠCH & ĐỀ XUẤT</h3>
                (Hướng hành động cho tuần tiếp theo).

                Văn phong: Chỉn chu, quyết đoán, dựa trên dữ liệu thực tế hệ thống.
            `
        });

        return response.text || "Không thể tạo báo cáo.";
    } catch (error) {
        console.error("Exec Report Error:", error);
        return "Lỗi AI Service.";
    }
};
