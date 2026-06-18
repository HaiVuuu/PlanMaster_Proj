import { Project, User, Task, UserRole, TaskStatus, TaskLog, Comment, UserStatus } from '@/types';
import { generateUniqueId } from '@/utils/idUtils';

const guestTeam: User[] = [
  { id: 'guest-qtnt', username: 'nguyenvana', fullname: 'Nguyễn Văn A', role: UserRole.QTNT, phone: '0900000001', avatar: `https://i.pravatar.cc/150?u=guest-qtnt`, cccd: '', email: '', status: UserStatus.ACTIVE },
  { id: 'guest-nvnt-1', username: 'tranthib', fullname: 'Trần Thị B', role: UserRole.NVNT, phone: '0900000002', managerPhone: '0900000001', avatar: `https://i.pravatar.cc/150?u=guest-nvnt-1`, cccd: '', email: '', status: UserStatus.ACTIVE },
  { id: 'guest-nvnt-2', username: 'levanc', fullname: 'Lê Văn C', role: UserRole.NVNT, phone: '0900000003', managerPhone: '0900000001', avatar: `https://i.pravatar.cc/150?u=guest-nvnt-2`, cccd: '', email: '', status: UserStatus.ACTIVE },
  { id: 'guest-qcnt', username: 'phamthid', fullname: 'Phạm Thị D', role: UserRole.QCNT, phone: '0900000004', avatar: `https://i.pravatar.cc/150?u=guest-qcnt`, cccd: '', email: '', status: UserStatus.ACTIVE },
  { id: 'guest-tvgs', username: 'hoangvane', fullname: 'Hoàng Văn E', role: UserRole.NVTVGS, phone: '0900000005', avatar: `https://i.pravatar.cc/150?u=guest-tvgs`, cccd: '', email: '', status: UserStatus.ACTIVE },
  { id: 'guest-qttvgs', username: 'vuthif', fullname: 'Vũ Thị F', role: UserRole.QTTVGS, phone: '0900000006', avatar: `https://i.pravatar.cc/150?u=guest-qttvgs`, cccd: '', email: '', status: UserStatus.ACTIVE },
];

const sampleLogs: TaskLog[] = [
  {
    id: generateUniqueId('log'),
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    amount: 50,
    userId: 'guest-nvnt-1',
    userName: 'Trần Thị B',
    userRole: UserRole.NVNT,
    note: 'Hoàn thành 50% khối lượng phần móng.',
    images: [],
    actionType: 'UPDATE'
  },
  {
    id: generateUniqueId('log'),
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    startTime: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    endTime: new Date().toISOString(),
    amount: 50,
    userId: 'guest-nvnt-1',
    userName: 'Trần Thị B',
    userRole: UserRole.NVNT,
    note: 'Hoàn thành nốt 50% còn lại.',
    images: [],
    actionType: 'UPDATE'
  }
];

const sampleTasks: Task[] = [
  {
    id: generateUniqueId('task'),
    order: 1,
    code: 'HM-01',
    name: 'Thi công phần móng',
    unit: 'm³',
    quantity: 100,
    completedQuantity: 100,
    progress: 100,
    startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: TaskStatus.WAITING_QC,
    assignees: ['guest-nvnt-1'],
    parentId: null,
    logs: sampleLogs,
    comments: [
      { id: generateUniqueId('cmt'), userId: 'guest-qtnt', userName: 'Nguyễn Văn A', content: 'Cần đẩy nhanh tiến độ hơn nữa.', timestamp: new Date().toISOString() }
    ]
  },
  {
    id: generateUniqueId('task'),
    order: 2,
    code: 'HM-02',
    name: 'Thi công kết cấu thân',
    unit: 'tấn',
    quantity: 250,
    completedQuantity: 50,
    progress: 20,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: TaskStatus.IN_PROGRESS,
    assignees: ['guest-nvnt-1', 'guest-nvnt-2'],
    parentId: null,
    logs: [],
    comments: []
  },
  {
    id: generateUniqueId('task'),
    order: 3,
    code: 'HM-02.1',
    name: 'Lắp dựng cốt thép cột vách',
    unit: 'tấn',
    quantity: 100,
    completedQuantity: 50,
    progress: 50,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: TaskStatus.IN_PROGRESS,
    assignees: ['guest-nvnt-2'],
    parentId: 'task-sample-2', // This will need to be updated dynamically
    logs: [],
    comments: []
  },
  {
    id: generateUniqueId('task'),
    order: 4,
    code: 'HM-02.2',
    name: 'Lắp dựng coppha',
    unit: 'm²',
    quantity: 500,
    completedQuantity: 0,
    progress: 0,
    startDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: TaskStatus.NEW,
    assignees: [],
    parentId: 'task-sample-2', // This will need to be updated dynamically
    logs: [],
    comments: []
  },
  {
    id: generateUniqueId('task'),
    order: 5,
    code: 'HM-03',
    name: 'Công tác xây trát',
    unit: 'm²',
    quantity: 1200,
    completedQuantity: 0,
    progress: 0,
    startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: TaskStatus.BLOCKED,
    assignees: ['guest-nvnt-2'],
    parentId: null,
    logs: [
      { id: generateUniqueId('log'), timestamp: new Date().toISOString(), startTime: '', endTime: '', amount: 0, userId: 'guest-qtnt', userName: 'Nguyễn Văn A', userRole: UserRole.QTNT, note: 'Tạm dừng do chưa có vật tư.', images: [], actionType: 'BLOCK' }
    ],
    comments: []
  },
];

// Dynamically link sub-tasks to parent task
const parentTask = sampleTasks.find(t => t.code === 'HM-02');
if (parentTask) {
  sampleTasks.forEach(task => {
    if (task.code.startsWith('HM-02.')) {
      task.parentId = parentTask.id;
    }
  });
}

export const sampleProject: Project = {
  id: 'sample-project-id',
  name: 'Dự án Chung cư Mẫu (Khách)',
  description: 'Đây là một dự án mẫu để trình diễn các tính năng của PlanMaster VN.',
  ownerId: 'guest-user-id',
  team: guestTeam,
  tasks: sampleTasks,
  stakeholders: [],
  createdAt: new Date().toISOString(),
  documents: [],
  location: 'Hà Nội, Việt Nam',
  participants: [],
  notifications: [],
};