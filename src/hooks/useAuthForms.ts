import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setAuthError } from '../store/authSlice';
import { addToast } from '../store/uiSlice';
import { authService } from '../services/authService';
import { UserRole } from '../types';

type LoginView = 'LOGIN' | 'REGISTER';

export const useAuthForms = () => {
  const dispatch = useDispatch();
  const [loginView, setLoginView] = useState<LoginView>('LOGIN');
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullname: '', phone: '', password: '', managerPhone: '', role: UserRole.NVNT
  });
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setAuthError(null));
    setRegisterSuccess('');
    setIsAuthLoading(true);

    try {
      await authService.login(loginForm.phone, loginForm.password);
      // Success is handled by onAuthStateChanged listener
    } catch (error: any) {
      dispatch(setAuthError(error.message));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setAuthError(null));
    setRegisterSuccess('');
    setIsAuthLoading(true);

    if (!registerForm.phone || !registerForm.password || !registerForm.managerPhone || !registerForm.fullname) {
      dispatch(setAuthError("Vui lòng nhập đầy đủ thông tin bắt buộc."));
      setIsAuthLoading(false);
      return;
    }
    if (registerForm.password.length < 6) {
      dispatch(setAuthError("Mật khẩu phải có ít nhất 6 ký tự."));
      setIsAuthLoading(false);
      return;
    }

    try {
      await authService.register(
        registerForm.fullname,
        registerForm.phone,
        registerForm.password,
        registerForm.managerPhone,
        registerForm.role
      );
      setRegisterSuccess(`Đăng ký thành công! Tài khoản của bạn (SĐT: ${registerForm.phone}) đang chờ quản lý duyệt.`);
      setRegisterForm({ fullname: '', phone: '', password: '', managerPhone: '', role: UserRole.NVNT });
      setLoginView('LOGIN');
    } catch (error: any) {
      dispatch(setAuthError(error.message));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const phone = prompt("Vui lòng nhập số điện thoại đã đăng ký để khôi phục mật khẩu:");
    if (!phone) return;

    dispatch(setAuthError(null));
    setRegisterSuccess('');
    try {
      await authService.sendPasswordReset(phone);
      dispatch(addToast({ message: `Đã gửi email khôi phục mật khẩu tới ${phone}@planmaster.vn. Vui lòng kiểm tra hộp thư của bạn.`, type: 'success' }));
    } catch (error: any) {
      dispatch(addToast({ message: error.message, type: 'error' }));
    }
  };

  return {
    loginView, setLoginView,
    loginForm, setLoginForm,
    registerForm, setRegisterForm,
    registerSuccess, setRegisterSuccess,
    isAuthLoading,
    handleLogin, handleRegister, handleForgotPassword
  };
};