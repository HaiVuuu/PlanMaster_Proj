import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Project, Task, User } from '../types';

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
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
    }
  },
});

export const { setProjects, setCurrentProject, updateProjectInList, updateTasksInCurrentProject, updateTeamInCurrentProject } = projectSlice.actions;

export default projectSlice.reducer;