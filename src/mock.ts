import { Project, User, UserRole, UserStatus, AppSettings, Stakeholder, UserStats, Task } from '@/types';
import { generateUniqueId } from '@/utils/idUtils'; // Import generateUniqueId

// --- HELPER: Random Stats Generator ---
const getRandomStats = (): UserStats => ({
    accessTime: {
        week: Math.floor(Math.random() * 500) + 60,
        month: Math.floor(Math.random() * 2000) + 300,
        year: Math.floor(Math.random() * 10000) + 1000,
        total: Math.floor(Math.random() * 15000) + 2000,
    },
    uploads: Math.floor(Math.random() * 50),
    notes: Math.floor(Math.random() * 100)
});

// --- MOCK DATA ---
export const MOCK_ADMIN: User = {
  id: 'u1',
  username: 'superadmin',
  password: 'admin',
  fullname: 'Super Admin Hệ Thống',
  cccd: '001088000001',
  phone: '0903381385', 
  email: 'admin@planmaster.vn',
  role: UserRole.ADMIN,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff',
  lastActiveAt: new Date().toISOString(),
  stats: getRandomStats()
};

// --- GROUP 1: CHỦ ĐẦU TƯ (CĐT) ---
export const MOCK_QTCDT: User = {
  id: 'u-cdt-1',
  username: 'qtcdt',
  password: '123',
  fullname: 'Nguyễn Quản Trị CĐT',
  cccd: '001099000100',
  phone: '0911000001',
  email: 'qtcdt@investor.vn',
  role: UserRole.QTCDT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QT+CDT&background=ef4444&color=fff',
  managerPhone: '0903381385',
  stats: getRandomStats()
};

export const MOCK_NVCDT: User = {
  id: 'u-cdt-2',
  username: 'nvcdt',
  password: '123',
  fullname: 'Lê Nhân Viên CĐT',
  cccd: '001099000101',
  phone: '0911000002',
  email: 'nvcdt@investor.vn',
  role: UserRole.NVCDT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=NV+CDT&background=fca5a5&color=fff',
  managerPhone: '0911000001', // Reports to QTCDT
  stats: getRandomStats()
};

export const MOCK_QSCDT: User = {
  id: 'u-cdt-qs',
  username: 'qscdt',
  password: '123',
  fullname: 'Phạm QS Chủ Đầu Tư',
  cccd: '001099000102',
  phone: '0911000003',
  email: 'qscdt@investor.vn',
  role: UserRole.QSCDT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QS+CDT&background=b91c1c&color=fff',
  managerPhone: '0911000001', // Reports to QTCDT
  stats: getRandomStats()
};

// --- GROUP 2: TƯ VẤN GIÁM SÁT (TVGS) ---
export const MOCK_QTTVGS: User = {
  id: 'u-tvgs-1',
  username: 'qttvgs',
  password: '123',
  fullname: 'Trần Trưởng TVGS',
  cccd: '001099000200',
  phone: '0921000001',
  email: 'truong@tvgs.vn',
  role: UserRole.QTTVGS,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=Truong+TVGS&background=8b5cf6&color=fff',
  managerPhone: '0903381385',
  stats: getRandomStats()
};

export const MOCK_NVTVGS: User = {
  id: 'u-tvgs-2',
  username: 'nvtvgs',
  password: '123',
  fullname: 'Phạm Giám Sát Viên',
  cccd: '001099000201',
  phone: '0921000002',
  email: 'gs1@tvgs.vn',
  role: UserRole.NVTVGS,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=NV+TVGS&background=c4b5fd&color=fff',
  managerPhone: '0921000001', // Reports to QTTVGS
  stats: getRandomStats()
};

export const MOCK_QSTVGS: User = {
  id: 'u-tvgs-qs',
  username: 'qstvgs',
  password: '123',
  fullname: 'Lê QS Giám Sát',
  cccd: '001099000202',
  phone: '0921000003',
  email: 'qs@tvgs.vn',
  role: UserRole.QSTVGS,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QS+TVGS&background=7c3aed&color=fff',
  managerPhone: '0921000001', // Reports to QTTVGS
  stats: getRandomStats()
};

// --- GROUP 3: TƯ VẤN THIẾT KẾ (TVTK) ---
export const MOCK_QTTVTK: User = {
  id: 'u-tvtk-1',
  username: 'qttvtk',
  password: '123',
  fullname: 'Hoàng Chủ Trì TK',
  cccd: '001099000300',
  phone: '0931000001',
  email: 'chutri@design.vn',
  role: UserRole.QTTVTK,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QT+TVTK&background=10b981&color=fff',
  managerPhone: '0903381385',
  stats: getRandomStats()
};

export const MOCK_NVTVTK: User = {
  id: 'u-tvtk-2',
  username: 'nvtvtk',
  password: '123',
  fullname: 'Vũ Họa Viên TK',
  cccd: '001099000301',
  phone: '0931000002',
  email: 'hoavien@design.vn',
  role: UserRole.NVTVTK,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=NV+TVTK&background=6ee7b7&color=fff',
  managerPhone: '0931000001', // Reports to QTTVTK
  stats: getRandomStats()
};

// --- GROUP 4: NHÀ THẦU (CONTRACTOR) ---
export const MOCK_QTNT: User = {
  id: 'u2',
  username: 'qtnt',
  password: '123',
  fullname: 'Trần Quản Trị Nhà Thầu',
  cccd: '001088000002',
  phone: '0909000002',
  email: 'qtnt@contractor.vn',
  role: UserRole.QTNT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QT+Nha+Thau&background=3b82f6&color=fff',
  managerPhone: '0903381385',
  stats: getRandomStats()
};

export const MOCK_NVNT: User = {
  id: 'u3',
  username: 'nvnt',
  password: '123',
  fullname: 'Lê Văn Thi Công',
  cccd: '001088000003',
  phone: '0909000003',
  email: 'thi.cong@contractor.vn',
  role: UserRole.NVNT,
  status: UserStatus.ACTIVE,
  isMobileUser: true,
  avatar: 'https://ui-avatars.com/api/?name=NV+Thi+Cong&background=93c5fd&color=fff',
  managerPhone: '0909000002', // Managed by QTNT
  stats: getRandomStats()
};

export const MOCK_QCNT: User = {
  id: 'u-nt-qc',
  username: 'qcnt',
  password: '123',
  fullname: 'Đỗ Kiểm Soát CL (QC)',
  cccd: '001099000401',
  phone: '0941000001',
  email: 'qc@contractor.vn',
  role: UserRole.QCNT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QC+Nha+Thau&background=f59e0b&color=fff',
  managerPhone: '0909000002',
  stats: getRandomStats()
};

export const MOCK_QSNT: User = {
  id: 'u-nt-qs',
  username: 'qsnt',
  password: '123',
  fullname: 'Bùi Kỹ Sư QS',
  cccd: '001099000402',
  phone: '0942000001',
  email: 'qs@contractor.vn',
  role: UserRole.QSNT,
  status: UserStatus.ACTIVE,
  avatar: 'https://ui-avatars.com/api/?name=QS+Nha+Thau&background=fcd34d&color=fff',
  managerPhone: '0909000002',
  stats: getRandomStats()
};


// --- PENDING MANAGERS (For approval testing) ---
export const PENDING_QT_USERS: User[] = [
  {
    id: 'pq-1',
    username: 'qtcdt_pending',
    password: '123',
    fullname: 'Nguyễn Văn CĐT (Chờ duyệt)',
    cccd: '001099000001',
    phone: '0911111111',
    email: 'cdt@project.vn',
    role: UserRole.QTCDT,
    status: UserStatus.PENDING,
    avatar: 'https://ui-avatars.com/api/?name=QT+CDT',
    managerPhone: '0903381385', // Reports to Super Admin
    stats: { accessTime: { week: 0, month: 0, year: 0, total: 0 }, uploads: 0, notes: 0 }
  },
  {
    id: 'pq-2',
    username: 'qttvgs_pending',
    password: '123',
    fullname: 'Trần Văn TVGS (Chờ duyệt)',
    cccd: '001099000002',
    phone: '0922222222',
    email: 'tvgs@cons.vn',
    role: UserRole.QTTVGS,
    status: UserStatus.PENDING,
    avatar: 'https://ui-avatars.com/api/?name=QT+TVGS',
    managerPhone: '0903381385', // Reports to Super Admin
    stats: { accessTime: { week: 0, month: 0, year: 0, total: 0 }, uploads: 0, notes: 0 }
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  compactMode: false,
  currency: 'VND',
  dateFormat: 'DD/MM/YYYY'
};

// --- RICH STAKEHOLDER DATA ---
export const MOCK_STAKEHOLDERS: Stakeholder[] = [
    {
        id: generateUniqueId('sh'), name: 'Bộ Giao Thông Vận Tải', title: 'Lãnh đạo Bộ', organization: 'Bộ GTVT', organizationType: 'Cơ quan quản lý nhà nước',
        contact: 'vanphong@mt.gov.vn', influence: 'High', interest: 'High',
        strategy: 'Quản lý chặt chẽ (Manage Closely)', communicationPlan: 'Báo cáo tháng, họp quý', concerns: 'Tiến độ giải ngân và chất lượng'
    },
    {
        id: generateUniqueId('sh'), name: 'UBND Tỉnh Nghệ An', title: 'Lãnh đạo Tỉnh', organization: 'UBND Tỉnh', organizationType: 'Địa phương',
        contact: 'ubnd@nghean.gov.vn', influence: 'High', interest: 'High',
        strategy: 'Quản lý chặt chẽ (Manage Closely)', communicationPlan: 'Họp GPMB hàng tuần', concerns: 'Công tác GPMB và an ninh trật tự'
    },
    {
        id: generateUniqueId('sh'), name: 'Ban QLDA Thăng Long', title: 'Giám đốc Ban', organization: 'Ban QLDA Thăng Long', organizationType: 'Chủ Đầu Tư',
        contact: 'bqlda@thanglong.vn', influence: 'High', interest: 'High',
        strategy: 'Quản lý chặt chẽ (Manage Closely)', communicationPlan: 'Họp giao ban hàng tuần', concerns: 'Tiến độ tổng thể'
    },
    {
        id: generateUniqueId('sh'), name: 'TEDI', title: 'Chủ nhiệm đồ án', organization: 'Tổng Cty Tư vấn Thiết kế GTVT (TEDI)', organizationType: 'Tư vấn',
        contact: 'design@tedi.vn', influence: 'Low', interest: 'High',
        strategy: 'Giữ thông báo (Keep Informed)', communicationPlan: 'Trao đổi khi có thay đổi thiết kế', concerns: 'Tuân thủ thiết kế kỹ thuật'
    },
    {
        id: generateUniqueId('sh'), name: 'Liên danh TVGS 123', title: 'Tư vấn trưởng', organization: 'Công ty TVGS 123', organizationType: 'Tư vấn',
        contact: 'tvgs@123.vn', influence: 'High', interest: 'High',
        strategy: 'Hợp tác chặt chẽ', communicationPlan: 'Báo cáo ngày, nghiệm thu hiện trường', concerns: 'Chất lượng thi công chi tiết'
    },
    {
        id: generateUniqueId('sh'), name: 'Tập đoàn Xây dựng ABC', title: 'Giám đốc điều hành', organization: 'Tập đoàn ABC', organizationType: 'Nhà thầu',
        contact: 'ceo@abc.com', influence: 'High', interest: 'High',
        strategy: 'Quản lý trực tiếp', communicationPlan: 'Họp hiện trường hàng ngày', concerns: 'Dòng tiền và nguồn vật liệu'
    },
    {
        id: generateUniqueId('sh'), name: 'Công ty Thép Hòa Phát', title: 'Giám đốc kinh doanh', organization: 'Hòa Phát Group', organizationType: 'Nhà cung cấp',
        contact: 'sales@hoaphat.com.vn', influence: 'Low', interest: 'Low',
        strategy: 'Theo dõi (Monitor)', communicationPlan: 'Đặt hàng theo tiến độ', concerns: 'Thanh toán đúng hạn'
    },
    {
        id: generateUniqueId('sh'), name: 'Người dân xã Nghi Lộc', title: 'Đại diện cộng đồng', organization: 'Cộng đồng dân cư', organizationType: 'Người hưởng thụ',
        contact: 'Xã Nghi Lộc', influence: 'Low', interest: 'High',
        strategy: 'Giữ thông báo (Keep Informed)', communicationPlan: 'Thông báo lịch nổ mìn, thi công ồn', concerns: 'Bụi, tiếng ồn, đường dân sinh'
    }
];

export const SAMPLE_PROJECT: Project = {
  id: 'p1',
  name: 'Cao tốc Bắc Nam - Gói thầu XL01',
  ownerId: 'u-cdt-1', // Added owner
  location: 'Nghệ An - Hà Tĩnh',
  description: 'Thi công xây dựng đoạn Km30+000 đến Km50+000. Bao gồm cầu đường và cống thoát nước.',
  createdAt: '2023-10-15',
  participants: [
      { id: 'p1', label: 'Chủ đầu tư', value: 'Ban QLDA Thăng Long', isVisible: true, isSystem: true },
      { id: 'p2', label: 'Tư vấn giám sát', value: 'Công ty TVGS 123', isVisible: true, isSystem: true },
      { id: 'p3', label: 'Nhà thầu thi công', value: 'Tập đoàn ABC', isVisible: true, isSystem: true },
      { id: 'p4', label: 'Tư vấn thiết kế', value: 'TEDI', isVisible: true, isSystem: true },
      { id: 'p5', label: 'Cơ quan QLNN', value: 'Bộ GTVT', isVisible: true, isSystem: false },
      { id: 'p6', label: 'Chính quyền địa phương', value: 'UBND Tỉnh Nghệ An', isVisible: true, isSystem: false },
      { id: 'p7', label: 'Nhà cung cấp chính', value: 'Hòa Phát Group', isVisible: true, isSystem: false },
  ],
  documents: [
    { id: 'd1', name: 'Bản vẽ thi công D1.pdf', type: 'PDF', size: '15MB', uploadDate: '2023-10-16', uploadedBy: 'Trần Trưởng TVGS', version: 1 },
  ],
  team: [
      MOCK_ADMIN, 
      MOCK_QTNT, MOCK_NVNT, MOCK_QCNT, MOCK_QSNT, 
      MOCK_QTCDT, MOCK_NVCDT, MOCK_QSCDT, 
      MOCK_QTTVGS, MOCK_NVTVGS, MOCK_QSTVGS, // ADDED: QSTVGS to Team
      MOCK_QTTVTK, MOCK_NVTVTK,
      ...PENDING_QT_USERS
  ].map(u => ({...u, lastActiveAt: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 10).toISOString() })), // Add random lastActiveAt
  memberUids: [ // Added memberUids for consistency
      'u1', 'u2', 'u3', 'u-nt-qc', 'u-nt-qs', 'u-cdt-1', 'u-cdt-2', 'u-cdt-qs',
      'u-tvgs-1', 'u-tvgs-2', 'u-tvgs-qs', 'u-tvtk-1', 'u-tvtk-2', 'pq-1', 'pq-2'
  ],
  stakeholders: MOCK_STAKEHOLDERS,
  notifications: [], // Initialize notifications
  issues: [], // Initialize Issues
  reports: [], // Initialize Reports
  tasks: [],
};