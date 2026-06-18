import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../types';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  compactMode: false,
  currency: 'VND',
  dateFormat: 'DD/MM/YYYY',
};

const initialState: AppSettings = DEFAULT_SETTINGS;

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setSettings(state, action: PayloadAction<AppSettings>) {
      return action.payload;
    },
    updateSettings(state, action: PayloadAction<Partial<AppSettings>>) {
      Object.assign(state, action.payload);
    },
  },
});

export const { setSettings, updateSettings } = settingsSlice.actions;
export default settingsSlice.reducer;