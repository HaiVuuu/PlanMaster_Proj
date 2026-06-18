import React from 'react';
import { Project, User, UserRole } from '@/types';
import { Button } from '@/components/Button';
import { LogOut, PlusSquare } from 'lucide-react';

interface ProjectSelectScreenProps {
  currentUser: User;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onCreateProject: () => void;
  onLogout: () => void;
}

export const ProjectSelectScreen: React.FC<ProjectSelectScreenProps> = ({
  currentUser,
  projects,
  onSelectProject,
  onCreateProject,
  onLogout,
}) => {
  return (
    <div className="flex-1 min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 text-gray-800 dark:text-gray-200">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200">Dự án của tôi</h1>
          <div className="flex gap-2 md:gap-4 items-center">
            <div className="flex flex-col items-end">
              <span className="font-bold text-gray-700 dark:text-gray-300 text-sm">{currentUser?.fullname}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full">{currentUser?.role}</span>
            </div>
            <img src={currentUser?.avatar} className="w-9 h-9 rounded-full border dark:border-gray-600" alt="avatar" />
            <Button variant="ghost" onClick={onLogout} title="Đăng xuất"><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role.startsWith('Quản trị')) && (
            <button onClick={onCreateProject} className="group flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800/50 border-2 border-dashed dark:border-gray-700 rounded-xl hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 h-64">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800 mb-4"><PlusSquare className="w-8 h-8 text-gray-400 group-hover:text-blue-600" /></div>
              <span className="font-semibold text-gray-500 dark:text-gray-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">Tạo dự án mới</span>
            </button>
          )}

          {projects.length === 0 ? (
            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
              Bạn chưa được gán vào dự án nào. {currentUser?.role === UserRole.ADMIN && "Hãy tạo một dự án mới!"}
            </div>
          ) : projects.map(p => (
            <div key={p.id} onClick={() => onSelectProject(p)} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-64 relative group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500 rounded-l-xl"></div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400">{p.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-1 line-clamp-3">{p.description}</p>
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mt-auto pt-4 border-t dark:border-gray-700">
                <span>{p.location}</span>
                <span>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};