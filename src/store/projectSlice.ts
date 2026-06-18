import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project, Task, User, ProjectDocument, Stakeholder, Comment, TaskLog, PaymentLog, ProjectReport } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  status: 'idle' | 'loading' | 'failed';
}

const initialState: ProjectState = {
  projects: [],
  currentProject: null,
  status: 'idle',
};

const projectSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    // --- Existing Reducers ---
    setProjects(state, action: PayloadAction<Project[]>) {
      state.projects = action.payload;
    },
    setCurrentProject(state, action: PayloadAction<Project | null>) {
      state.currentProject = action.payload;
    },
    updateProjectInList(state, action: PayloadAction<Project>) {
      const index = state.projects.findIndex(p => p.id === action.payload.id);
      if (index !== -1) {
        state.projects[index] = action.payload;
      }
    },
    updateTasksInCurrentProject(state, action: PayloadAction<Task[]>) {
      if (state.currentProject) {
        state.currentProject.tasks = action.payload;
      }
    },
    updateTeamInCurrentProject(state, action: PayloadAction<User[]>) {
      if (state.currentProject) {
        state.currentProject.team = action.payload;
      }
    },

    // --- NEW REDUCERS FOR GUEST MODE (OPTIMISTIC UPDATES) ---
    updateCurrentProjectDetails(state, action: PayloadAction<Partial<Project>>) {
        if (state.currentProject) {
            state.currentProject = { ...state.currentProject, ...action.payload };
        }
    },
    addTaskToCurrentProject(state, action: PayloadAction<Task>) {
        if (state.currentProject) {
            state.currentProject.tasks.push(action.payload);
        }
    },
    updateTaskInCurrentProjectOptimistic(state, action: PayloadAction<{ taskId: string; updates: Partial<Task> }>) {
        if (state.currentProject) {
            const taskIndex = state.currentProject.tasks.findIndex(t => t.id === action.payload.taskId);
            if (taskIndex !== -1) {
                state.currentProject.tasks[taskIndex] = { ...state.currentProject.tasks[taskIndex], ...action.payload.updates };
            }
        }
    },
    deleteTaskFromCurrentProject(state, action: PayloadAction<string>) { // by ID
        if (state.currentProject) {
            state.currentProject.tasks = state.currentProject.tasks.filter(t => t.id !== action.payload && t.parentId !== action.payload);
        }
    },
    addCommentToTaskInCurrentProject(state, action: PayloadAction<{ taskId: string; comment: Comment }>) {
        if (state.currentProject) {
            const task = state.currentProject.tasks.find(t => t.id === action.payload.taskId);
            if (task) {
                if (!task.comments) task.comments = [];
                task.comments.push(action.payload.comment);
            }
        }
    },
    addLogToTaskInCurrentProject(state, action: PayloadAction<{ taskId: string; log: TaskLog }>) {
        if (state.currentProject) {
            const task = state.currentProject.tasks.find(t => t.id === action.payload.taskId);
            if (task) {
                if (!task.logs) task.logs = [];
                task.logs.unshift(action.payload.log); // Add to the beginning
            }
        }
    },
    addPaymentLogToTaskInCurrentProject(state, action: PayloadAction<{ taskId: string; log: PaymentLog }>) {
        if (state.currentProject) {
            const task = state.currentProject.tasks.find(t => t.id === action.payload.taskId);
            if (task) {
                if (!task.paymentLogs) task.paymentLogs = [];
                task.paymentLogs.unshift(action.payload.log);
                task.paidAmount = (task.paidAmount || 0) + action.payload.log.amount;
            }
        }
    },
    addStakeholderToCurrentProject(state, action: PayloadAction<Stakeholder>) {
        if (state.currentProject) {
            if (!state.currentProject.stakeholders) state.currentProject.stakeholders = [];
            state.currentProject.stakeholders.push(action.payload);
        }
    },
    removeStakeholderFromCurrentProject(state, action: PayloadAction<string>) { // by ID
        if (state.currentProject) {
            state.currentProject.stakeholders = state.currentProject.stakeholders.filter(s => s.id !== action.payload);
        }
    },
    addReportToCurrentProject(state, action: PayloadAction<ProjectReport>) {
        if (state.currentProject) {
            if (!state.currentProject.reports) state.currentProject.reports = [];
            state.currentProject.reports.unshift(action.payload);
        }
    }
  },
});

export const {
  setProjects,
  setCurrentProject,
  updateProjectInList,
  updateTasksInCurrentProject,
  updateTeamInCurrentProject,
  updateCurrentProjectDetails,
  addTaskToCurrentProject,
  updateTaskInCurrentProjectOptimistic,
  deleteTaskFromCurrentProject,
  addCommentToTaskInCurrentProject,
  addLogToTaskInCurrentProject,
  addPaymentLogToTaskInCurrentProject,
  addStakeholderToCurrentProject,
  removeStakeholderFromCurrentProject,
} = projectSlice.actions;

export default projectSlice.reducer;