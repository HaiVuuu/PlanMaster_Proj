
export enum UserRole {
  ADMIN = 'System Admin',
  
  // Chủ đầu tư (Investor)
  QTCDT = 'Quản trị CĐT (QTCDT)',
  QSCDT = 'QS Chủ đầu tư (QSCDT)', // New Role
  NVCDT = 'Nhân viên CĐT (NVCDT)',
  
  // Tư vấn thiết kế (Design Consultant)
  QTTVTK = 'Quản trị TVTK (QTTVTK)',
  NVTVTK = 'Nhân viên TVTK (NVTVTK)',
  
  // Tư vấn giám sát (Supervision Consultant)
  QTTVGS = 'Quản trị TVGS (QTTVGS)',
  NVTVGS = 'Nhân viên TVGS (NVTVGS)',
  QSTVGS = 'QS TVGS (QSTVGS)', // ADDED: QS cho TVGS
  
  // Nhà thầu (Contractor)
  QTNT = 'Quản trị Nhà thầu (QTNT)',
  NVNT = 'Nhân viên Nhà thầu (NVNT)',
  QCNT = 'QC Nhà thầu (QCNT)',
  QSNT = 'QS Nhà thầu (QSNT)'
}

export enum UserStatus {
  PENDING = 'Chờ duyệt',
  ACTIVE = 'Đang hoạt động',
  BLOCKED = 'Đã khóa'
}

export enum TaskStatus {
  NEW = 'Mới tạo',
  IN_PROGRESS = 'Đang thi công',
  BLOCKED = 'Tạm dừng / Vướng mắc', // New Status
  WAITING_QC = 'Chờ QC nội bộ', // NVNT xong -> Chờ QCNT
  WAITING_APPROVAL = 'Chờ TVGS nghiệm thu', // QCNT xong -> Chờ NVTVGS
  COMPLETED = 'Đạt / Hoàn thành', // NVTVGS xác nhận đạt
  REJECTED = 'Yêu cầu khắc phục' // NVTVGS không đạt
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface UserStats {
  accessTime: {
    week: number; // minutes
    month: number;
    year: number;
    total: number;
  };
  uploads: number;
  notes: number;
}

export interface User {
  id: string;
  username: string; // Keep for display
  password?: string;
  fullname: string; 
  cccd: string;
  dob?: string; 
  phone: string; // Used for Login
  managerPhone?: string; // Phone of direct manager for approval
  email: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  isMobileUser?: boolean; 
  lastActiveAt?: string;
  stats?: UserStats; // Added stats
}

export type InfluenceLevel = 'High' | 'Low';
export type InterestLevel = 'High' | 'Low';

export interface Stakeholder {
  id: string;
  name: string;
  title: string; 
  organization: string;
  organizationType?: string; // New field for categorization
  contact: string; 
  influence: InfluenceLevel;
  interest: InterestLevel;
  strategy: string; 
  communicationPlan: string; 
  concerns: string; 
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  uploadDate: string;
  size: string;
  uploadedBy: string; // To track who uploaded
  url?: string; // URL to view/download file
  version: number; // Added Version Control
  storagePath?: string; // Path in Firebase Storage for deletion
}

export interface TaskLog {
  id: string;
  timestamp: string; 
  startTime?: string; 
  endTime?: string;   
  amount: number; 
  userId: string;
  userName: string;
  userRole: UserRole; // Track who made the log
  note?: string; 
  images?: string[]; 
  actionType?: 'UPDATE' | 'SUBMIT_QC' | 'CONFIRM_QC' | 'APPROVE' | 'REJECT' | 'REJECT_QC' | 'BLOCK' | 'UNBLOCK';
  safetyIssues?: string[]; // Added: AI Detected issues
  processingTime?: number;
}

export type PaymentCategory = 'ADVANCE' | 'PROGRESS' | 'SETTLEMENT' | 'OTHER';

export interface PaymentLog {
    id: string;
    timestamp: string;
    amount: number;
    category: PaymentCategory; // New field
    payerId: string;
    payerName: string;
    note?: string;
    images?: string[]; // Chứng từ thanh toán
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
  mentions?: string[]; // List of user IDs mentioned
}

export interface Task {
  id: string;
  parentId?: string | null; // For sub-tasks created by NVNT
  order: number;
  code: string;
  name: string;
  unit: string;
  quantity: number; 
  completedQuantity: number; 
  logs: TaskLog[]; 
  startDate: string; 
  endDate: string;   
  progress: number; 
  status: TaskStatus;
  assignees?: string[];
  comments?: Comment[]; 
  
  // Financial Fields
  unitPrice?: number; // Đơn giá
  paidAmount?: number; // Đã thanh toán
  paymentLogs?: PaymentLog[]; // Lịch sử thanh toán
  costAssignees?: string[]; // New: People responsible for cost/payment of this task (Independent from construction assignees)
}

export interface ProjectParticipant {
  id: string;
  label: string; // e.g., "Chủ đầu tư", "Nhà thầu"
  value: string; // e.g., "Tập đoàn VinGroup"
  isVisible: boolean; // QTCDT toggles this
  isSystem?: boolean; // If true, cannot be deleted (only hidden)
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  recipientIds: string[]; // List of user IDs who should see this
  taskId?: string;
  senderName?: string;
}

// --- NEW TYPES FOR AI EXECUTIVE REPORTING ---
export interface ProjectIssue {
    id: string;
    description: string; // Nội dung vấn đề / Yêu cầu
    source: string; // Nguồn: CĐT, TVGS, Địa phương, AI phát hiện...
    status: 'OPEN' | 'RESOLVED';
    createdAt: string;
    resolvedAt?: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ProjectReport {
    id: string;
    title: string; // VD: Báo cáo Tuần 45
    generatedAt: string;
    content: string; // HTML/Markdown content from AI
    periodStart: string;
    periodEnd: string;
    createdBy: string;
}

export type ReportTimeframe = 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'TOTAL';
export type ReportSection = 'CONSTRUCTION' | 'ACCEPTANCE' | 'FINANCE' | 'ISSUES';

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  location: string;
  description: string;
  documents: ProjectDocument[];
  tasks: Task[];
  team: User[];
  memberUids?: string[]; // Array of user IDs for Firestore queries & rules
  stakeholders: Stakeholder[];
  createdAt: string;
  participants: ProjectParticipant[]; // Dynamic list of participants
  notifications: AppNotification[]; 
  
  // New Fields
  issues?: ProjectIssue[]; // Danh sách các vấn đề tồn tại (Kế thừa)
  reports?: ProjectReport[]; // Lịch sử báo cáo AI
}

export interface AppSettings {
  theme: 'light' | 'dark';
  compactMode: boolean;
  currency: string;
  dateFormat: string;
}

// --- PERMISSION SYSTEM ---
export type ModuleName = 'INFO' | 'DASHBOARD' | 'TASKS' | 'COST' | 'USERS' | 'STAKEHOLDERS' | 'SETTINGS' | 'EVALUATION' | 'PROFILE';

interface ModuleRights {
  view: boolean;
  edit: boolean;
}

// Logic phân quyền mới
export const PERMISSION_CONFIG: Record<UserRole, Record<ModuleName, ModuleRights>> = { // This was already exported
  [UserRole.ADMIN]: {
    INFO: { view: true, edit: true },
    DASHBOARD: { view: true, edit: true },
    TASKS: { view: true, edit: true },
    COST: { view: true, edit: true },
    USERS: { view: true, edit: true },
    STAKEHOLDERS: { view: true, edit: true },
    SETTINGS: { view: true, edit: true },
    EVALUATION: { view: true, edit: true },
    PROFILE: { view: true, edit: true },
  },
  // Chủ đầu tư
  [UserRole.QTCDT]: {
    INFO: { view: true, edit: true },
    DASHBOARD: { view: true, edit: true },
    TASKS: { view: true, edit: true }, 
    COST: { view: true, edit: true },
    USERS: { view: true, edit: true },
    STAKEHOLDERS: { view: true, edit: true },
    SETTINGS: { view: true, edit: false },
    EVALUATION: { view: true, edit: true },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.QSCDT]: { // New Role Permission: Like NVCDT but with COST access
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true }, // Can view/comment
    COST: { view: true, edit: true }, // Key difference: Can Manage Cost
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: true, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.NVCDT]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true },
    COST: { view: false, edit: false }, // RESTRICTED: No Cost View
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: true, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  // TVGS
  [UserRole.QTTVGS]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: true },
    TASKS: { view: true, edit: true },
    COST: { view: true, edit: false }, // TVGS View Only Cost
    USERS: { view: true, edit: true },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: true },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.NVTVGS]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true },
    COST: { view: false, edit: false },
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.QSTVGS]: { // ADDED: QS cho TVGS
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true }, // Có thể xem và cập nhật nhật ký (check khối lượng)
    COST: { view: true, edit: false }, // Xem chi phí nhưng không sửa
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  // TVTK
  [UserRole.QTTVTK]: {
    INFO: { view: true, edit: true },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: false },
    COST: { view: false, edit: false },
    USERS: { view: true, edit: true },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: true },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.NVTVTK]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: false },
    COST: { view: false, edit: false },
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  // Nhà thầu
  [UserRole.QTNT]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: true },
    TASKS: { view: true, edit: true },
    COST: { view: true, edit: true },
    USERS: { view: true, edit: true },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: true },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.NVNT]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true },
    COST: { view: false, edit: false },
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.QCNT]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: false },
    TASKS: { view: true, edit: true }, 
    COST: { view: false, edit: false },
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  },
  [UserRole.QSNT]: {
    INFO: { view: true, edit: false },
    DASHBOARD: { view: true, edit: true },
    TASKS: { view: true, edit: true },
    COST: { view: true, edit: true }, // QSNT manages cost
    USERS: { view: false, edit: false },
    STAKEHOLDERS: { view: false, edit: false },
    SETTINGS: { view: false, edit: false },
    EVALUATION: { view: true, edit: false },
    PROFILE: { view: true, edit: true },
  }
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 100,
  [UserRole.QTCDT]: 90,
  [UserRole.QTNT]: 80,
  [UserRole.QTTVGS]: 70,
  [UserRole.QTTVTK]: 60,
  [UserRole.QSCDT]: 55,
  [UserRole.QSTVGS]: 50,
  [UserRole.QSNT]: 45,
  [UserRole.QCNT]: 40,
  [UserRole.NVCDT]: 30,
  [UserRole.NVTVGS]: 20,
  [UserRole.NVTVTK]: 10,
  [UserRole.NVNT]: 0,
};
