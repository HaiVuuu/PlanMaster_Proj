import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ToastType } from '@/types';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface UIState {
  toasts: Toast[];
}

const initialState: UIState = {
  toasts: [],
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    addToast(state, action: PayloadAction<{ message: string; type?: ToastType }>) {
      const { message, type = 'info' } = action.payload;
      state.toasts.push({ id: new Date().getTime().toString() + Math.random(), message, type });
    },
    removeToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter(toast => toast.id !== action.payload);
    },
  },
});

export const { addToast, removeToast } = uiSlice.actions;
export default uiSlice.reducer;