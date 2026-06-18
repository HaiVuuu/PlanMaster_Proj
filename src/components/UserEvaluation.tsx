import React, { useState, useMemo } from 'react';
import { Project, User, UserRole, UserStats } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';
import { Trophy, Clock, Image as ImageIcon, StickyNote, TrendingUp, Users, Star, Medal } from 'lucide-react';

interface Props {
  project: Project;
  currentUser: User;
}

export const UserEvaluation: React.FC<Props> = ({ project, currentUser }) => {
  // 1. Identify Target Users: Current User + Subordinates (if any)
  const isManager = currentUser.role === UserRole.ADMIN || currentUser.role.toString().startsWith('Quản trị');
  
  // Filter users to show in the list
  const usersToShow = project.team.filter(u => {
      // Admin sees everyone
      if (currentUser.role === UserRole.ADMIN) return true;
      // Self
      if (u.id === currentUser.id) return true;
      // Direct reports
      if (u.managerPhone === currentUser.phone) return true;
      // If user is a manager (QT*), they might see their whole group. 
      // For simplicity here: Managers see their staff.
      return false;
  });

  // 2. Ranking Logic (Global Ranking among all project members)
  const ranks = useMemo(() => {
    const rankMap = new Map<string, { totalTime: number }>();
    const sortedByTime = [...project.team].sort((a, b) => 
        (b.stats?.accessTime.total || 0) - (a.stats?.accessTime.total || 0)
    );

    sortedByTime.forEach((user, index) => {
        rankMap.set(user.id, { totalTime: index + 1 });
    });

    return rankMap;
  }, [project.team]);

  const getRank = (userId: string) => ranks.get(userId)?.totalTime || project.team.length;

  // 3. Prepare Data for Charts
  const chartData = usersToShow.map(u => ({
      name: u.fullname.split(' ').pop(), // Last name
      fullName: u.fullname,
      totalTime: Math.round((u.stats?.accessTime.total || 0) / 60), // Hours
      uploads: u.stats?.uploads || 0,
      notes: u.stats?.notes || 0
  }));

  const formatTime = (minutes: number) => {
      if (minutes < 60) return `${minutes}p`;
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}h ${m}p`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-6 items-center">
            <div className="flex-1"> 
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Đánh giá & Xếp hạng thành viên
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Thống kê hoạt động, thời gian truy cập và đóng góp của nhân sự trong dự án.</p>
            </div> 

            {/* Personal Summary Card */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex gap-6 min-w-[300px] text-gray-800 dark:text-gray-200">
                <div className="text-center"> 
                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Hạng (Thời gian)</div>
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">#{getRank(currentUser.id)}</div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500">Trên {project.team.length} thành viên</div>
                </div> 
                <div className="w-px bg-blue-200 dark:bg-blue-800"></div>
                <div className="text-center"> 
                     <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Tổng giờ</div>
                     <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{Math.round((currentUser.stats?.accessTime.total || 0) / 60)}h</div>
                </div> 
                <div className="w-px bg-blue-200 dark:bg-blue-800"></div>
                <div className="text-center"> 
                     <div className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-1">Đóng góp</div>
                     <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{(currentUser.stats?.uploads || 0) + (currentUser.stats?.notes || 0)}</div>
                     <div className="text-[10px] text-gray-400 dark:text-gray-500">Ảnh + Ghi chú</div>
                </div>
            </div>
        </div>

        {/* Detailed Statistics Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Users className="w-4 h-4" /> Bảng xếp hạng chi tiết {isManager ? '(Cấp dưới & Bản thân)' : '(Bản thân)'}
                </h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                            <th className="p-4 w-12 text-center text-gray-600 dark:text-gray-300">#</th>
                            <th className="p-4 text-gray-600 dark:text-gray-300">Thành viên</th>
                            <th className="p-4 text-center text-gray-600 dark:text-gray-300">Tuần này</th>
                            <th className="p-4 text-center text-gray-600 dark:text-gray-300">Tháng này</th>
                            <th className="p-4 text-center text-gray-600 dark:text-gray-300">Năm nay</th>
                            <th className="p-4 text-center bg-blue-50/50 dark:bg-blue-900/20 text-gray-600 dark:text-gray-300">Tổng cộng</th>
                            <th className="p-4 text-center text-gray-600 dark:text-gray-300">Upload</th>
                            <th className="p-4 text-center text-gray-600 dark:text-gray-300">Ghi chú</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usersToShow
                        .sort((a, b) => (b.stats?.accessTime.total || 0) - (a.stats?.accessTime.total || 0)) // Local sort for display
                        .map((u, idx) => {
                            const rank = getRank(u.id); // hover:bg-gray-50
                            return (
                                <tr key={u.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${u.id === currentUser.id ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}>
                                    <td className="p-4 text-center">
                                        {rank === 1 ? <Medal className="w-5 h-5 text-yellow-500 mx-auto"/> : 
                                         rank === 2 ? <Medal className="w-5 h-5 text-gray-400 mx-auto"/> :
                                         rank === 3 ? <Medal className="w-5 h-5 text-amber-700 mx-auto"/> :
                                         <span className="font-bold text-gray-400 dark:text-gray-500">{rank}</span>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-100 dark:border-gray-700" alt="avt" />
                                            <div>
                                                <div className={`text-sm font-medium ${u.id === currentUser.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {u.fullname} {u.id === currentUser.id && '(Bạn)'}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{u.role}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{formatTime(u.stats?.accessTime.week || 0)}</td>
                                    <td className="p-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{formatTime(u.stats?.accessTime.month || 0)}</td>
                                    <td className="p-4 text-center text-sm font-medium text-gray-600 dark:text-gray-300">{formatTime(u.stats?.accessTime.year || 0)}</td>
                                    <td className="p-4 text-center text-sm font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20">{formatTime(u.stats?.accessTime.total || 0)}</td>
                                    <td className="p-4 text-center">
                                        <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                                            <ImageIcon className="w-3 h-3 text-gray-500 dark:text-gray-400"/> {u.stats?.uploads || 0}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                         <div className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-medium">
                                            <StickyNote className="w-3 h-3 text-gray-500 dark:text-gray-400"/> {u.stats?.notes || 0}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-gray-800 dark:text-gray-200">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-80">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-500" /> Thời gian truy cập (Giờ)
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{bottom: 20}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="totalTime" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Giờ truy cập" />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 h-80">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" /> Mức độ đóng góp (Uploads & Notes)
                </h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{bottom: 20}}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize: 10}} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="uploads" stackId="a" fill="#10b981" name="Hình ảnh" />
                        <Bar dataKey="notes" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Ghi chú" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};
