import React from 'react';
import { AlertTriangle, Phone, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuthForms } from '@/hooks/useAuthForms';
import VietnameseInput from '@/components/VietnameseInput';
import { useDispatch } from 'react-redux';
import { setAuthError } from '@/store/authSlice';

interface AuthPageProps {
  authError: string | null;
}

export const AuthPage: React.FC<AuthPageProps> = ({ authError }) => {
  const dispatch = useDispatch();
  const {
    loginView, setLoginView,
    loginForm, setLoginForm,
    registerForm, setRegisterForm,
    registerSuccess, setRegisterSuccess,
    isAuthLoading,
    handleLogin, handleRegister, handleForgotPassword
  } = useAuthForms();

  return (
    <div className="flex-1 min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 text-gray-800 dark:text-gray-200">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">PlanMaster VN</h1>
          <p className="text-gray-500 dark:text-gray-400">{loginView === 'LOGIN' ? 'Nền tảng quản lý dự án xây dựng' : 'Đăng ký tài khoản mới'}</p>
        </div>

        {authError && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {authError}
          </div>
        )}
        {registerSuccess && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">
            {registerSuccess}
          </div>
        )}

        {loginView === 'LOGIN' ? (
          <div className="space-y-6">
            <button disabled className="w-full flex items-center justify-center gap-3 bg-gray-300 text-gray-500 font-bold py-3 px-4 rounded-xl cursor-not-allowed">
              <MessageCircle className="w-6 h-6 text-gray-500 dark:text-gray-400" /> Đăng nhập Zalo (Tạm tắt)
            </button>
            <div className="relative flex py-2 items-center"><div className="flex-grow border-t dark:border-gray-700"></div><span className="flex-shrink mx-4 text-xs text-gray-400 dark:text-gray-500">Đăng nhập bằng SĐT</span><div className="flex-grow border-t dark:border-gray-700"></div></div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <VietnameseInput type="text" placeholder="Số điện thoại" className="w-full pl-10 p-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required value={loginForm.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({ ...loginForm, phone: e.target.value })} />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input type="password" placeholder="Mật khẩu" className="w-full pl-10 p-3 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white" required value={loginForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLoginForm({ ...loginForm, password: e.target.value })} />
              </div>
              <Button type="submit" className="w-full justify-center py-3" isLoading={isAuthLoading}>
                Đăng nhập
              </Button>
              <div className="text-center">
                <button type="button" onClick={handleForgotPassword} className="text-xs text-gray-500 dark:text-gray-400 hover:underline">Quên mật khẩu?</button>
              </div>
            </form>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <VietnameseInput type="text" placeholder="Họ và tên" className="w-full p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white" required value={registerForm.fullname} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm({ ...registerForm, fullname: e.target.value })} />
            <VietnameseInput type="text" placeholder="Số điện thoại của bạn" className="w-full p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white" required value={registerForm.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm({ ...registerForm, phone: e.target.value })} />
            <input type="password" placeholder="Mật khẩu" className="w-full p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white" required value={registerForm.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm({ ...registerForm, password: e.target.value })} />
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg">
              <label className="text-xs font-semibold text-blue-800 mb-1 block">SĐT Người quản lý*</label>
              <VietnameseInput type="text" placeholder="Nhập SĐT Quản lý để duyệt" className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 text-sm" required value={registerForm.managerPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegisterForm({ ...registerForm, managerPhone: e.target.value })} />
            </div>
            <Button type="submit" className="w-full justify-center py-3" isLoading={isAuthLoading}>Gửi yêu cầu đăng ký</Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setLoginView(loginView === 'LOGIN' ? 'REGISTER' : 'LOGIN');
              dispatch(setAuthError(null)); 
              setRegisterSuccess('');
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            {loginView === 'LOGIN' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};