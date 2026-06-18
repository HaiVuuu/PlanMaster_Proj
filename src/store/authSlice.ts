import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '../types';

type AuthStatus = 'LOADING' | 'LOGGED_IN' | 'LOGGED_OUT';

interface AuthState {
  status: AuthStatus;
  currentUser: User | null;
  error: string | null;
}

const initialState: AuthState = {
  status: 'LOADING',
  currentUser: null,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuthStatus(state, action: PayloadAction<AuthStatus>) {
      state.status = action.payload;
    },
    setUser(state, action: PayloadAction<User | null>) {
      state.currentUser = action.payload;
      state.status = action.payload ? 'LOGGED_IN' : 'LOGGED_OUT';
      state.error = null; // Reset error on user change
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
  },
});

export const { setAuthStatus, setUser, setAuthError } = authSlice.actions;

export default authSlice.reducer;