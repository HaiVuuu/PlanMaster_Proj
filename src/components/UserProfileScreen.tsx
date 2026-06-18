import React, { useState, useRef } from 'react';
import { User } from '@/types';
import { Button } from '@/components/Button';
import { User as UserIcon, Lock, Camera, Save } from 'lucide-react';
import VietnameseInput from '@/components/VietnameseInput';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';

interface UserProfileScreenProps {
  currentUser: User;
  onUpdateProfile: (updates: { fullname?: string; avatarFile?: File | null }) => Promise<void>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

export const UserProfileScreen: React.FC<UserProfileScreenProps> = ({ currentUser, onUpdateProfile, onChangePassword }) => {
  const dispatch = useDispatch();
  const [fullname, setFullname] = useState(currentUser.fullname);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSave = async () => {
    if (!fullname.trim()) {
      dispatch(addToast({ message: 'Họ và tên không được để trống.', type: 'error' }));
      return;
    }
    setIsSavingProfile(true);
    try {
      await onUpdateProfile({
        fullname: fullname !== currentUser.fullname ? fullname : undefined,
        avatarFile: avatarFile,
      });
      dispatch(addToast({ message: 'Cập nhật hồ sơ thành công!', type: 'success' }));
      setAvatarFile(null); // Reset file after upload
    } catch (error) {
      // Error toast is likely handled in App.tsx, but we can add one here too.
      dispatch(addToast({ message: 'Cập nhật hồ sơ thất bại.', type: 'error' }));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      dispatch(addToast({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự.', type: 'error' }));
      return;
    }
    if (newPassword !== confirmPassword) {
      dispatch(addToast({ message: 'Mật khẩu mới không khớp.', type: 'error' }));
      return;
    }
    setIsChangingPassword(true);
    try {
      await onChangePassword(currentPassword, newPassword);
      dispatch(addToast({ message: 'Đổi mật khẩu thành công!', type: 'success' }));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      dispatch(addToast({ message: error.message || 'Đổi mật khẩu thất bại.', type: 'error' }));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const profileHasChanged = fullname !== currentUser.fullname || avatarFile !== null;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-10">
      {/* Personal Info Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2 border-b dark:border-gray-700 pb-4">
          <UserIcon className="w-5 h-5 text-gray-600" />
          Thông tin cá nhân
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <img src={avatarPreview || `https://ui-avatars.com/api/?name=${fullname}`} alt="Avatar" className="w-28 h-28 rounded-full object-cover border-4 border-gray-100 dark:border-gray-700" />
            <button
              onClick={() => avatarInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input type="file" ref={avatarInputRef} accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Họ và tên</label>
              <VietnameseInput
                type="text"
                value={fullname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFullname(e.target.value)}
                className="w-full mt-1 p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Số điện thoại (Tài khoản)</label>
              <input
                type="text"
                value={currentUser.phone}
                readOnly
                className="w-full mt-1 p-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t dark:border-gray-700 flex justify-end">
          <Button onClick={handleProfileSave} isLoading={isSavingProfile} disabled={!profileHasChanged}>
            <Save className="w-4 h-4" /> Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Security Card */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-6 flex items-center gap-2 border-b dark:border-gray-700 pb-4">
          <Lock className="w-5 h-5 text-gray-600" />
          Bảo mật & Mật khẩu
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mật khẩu hiện tại</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
              required
              className="w-full mt-1 p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Mật khẩu mới</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
              required
              className="w-full mt-1 p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Xác nhận mật khẩu mới</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              required
              className="w-full mt-1 p-2 border dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
          </div>
          <div className="pt-4 border-t dark:border-gray-700 flex justify-end">
            <Button type="submit" isLoading={isChangingPassword}>
              Đổi mật khẩu
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};