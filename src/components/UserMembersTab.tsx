import React, { useState, useMemo, useEffect } from 'react';
import { Project, User, UserRole, UserStatus, PERMISSION_CONFIG, ROLE_HIERARCHY } from '@/types';
import { Button } from '@/components/Button';
import { Phone, Mail, Pencil, Lock, UserPlus, KeyRound, UserCheck, X, Trash2, AlertTriangle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { addToast } from '@/store/uiSlice';
import { userService } from '@/services/userService';
import { formatLastActive } from '@/utils/helpers';
import VietnameseInput from '@/components/VietnameseInput';

interface UserMembersTabProps {
    project: Project;
    currentUser: User;
    canEditUsers: boolean;
    onAddExistingUserToProject: (user: User) => Promise<void>;
    onRemoveUserFromProject: (user: User) => Promise<void>;
    onAdminPasswordReset: (user: User) => void;
}

export const UserMembersTab: React.FC<UserMembersTabProps> = ({
    project,
    currentUser,
    canEditUsers,
    onAddExistingUserToProject,
    onRemoveUserFromProject,
    onAdminPasswordReset,
}) => {
    const dispatch = useDispatch();
    const [showEditForm, setShowEditForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [formUser, setFormUser] = useState({
        fullname: '',
        phone: '',
        role: UserRole.NVNT
    });

    // States for "Add Existing User" feature
    const [showAddExistingUserModal, setShowAddExistingUserModal] = useState(false);
    const [potentialUsers, setPotentialUsers] = useState<User[]>([]);
    const [isLoadingPotentialUsers, setIsLoadingPotentialUsers] = useState(false);
    const [addingUserId, setAddingUserId] = useState<string | null>(null); // For smooth animation

    // State for custom confirmation modal
    const [userToRemove, setUserToRemove] = useState<User | null>(null);

    // State for role editing permissions
    const [rolesForEditDropdown, setRolesForEditDropdown] = useState<UserRole[]>([]);

    const activeUsers = useMemo(() => {
        return project.team.filter((u: User) => u.status !== UserStatus.PENDING);
    }, [project.team]);

    const isUserInProject = (userId: string) => {
        return project.team.some((member: User) => member.id === userId);
    };

    // New, stricter logic for editing permission based on role hierarchy.
    const canModifyUser = (targetUser: User): boolean => {
        // Rule 0: A user cannot modify themselves in this view.
        if (targetUser.id === currentUser.id) return false;

        const currentUserRank = ROLE_HIERARCHY[currentUser.role];
        const targetUserRank = ROLE_HIERARCHY[targetUser.role];

        // Rule 1: Admin can modify anyone, except another Admin.
        if (currentUser.role === UserRole.ADMIN) {
            return targetUser.role !== UserRole.ADMIN;
        }

        // Rule 2: A user can only modify someone with a strictly lower rank.
        // This covers both subordinates and peers.
        return currentUserRank > targetUserRank;
    };

    const getEditableRolesFor = (targetUser: User): UserRole[] => {
        const currentUserRank = ROLE_HIERARCHY[currentUser.role];
        const targetUserRank = ROLE_HIERARCHY[targetUser.role];

        // Admin special case: Can assign any role EXCEPT another Admin.
        if (currentUser.role === UserRole.ADMIN) {
            // If editing another Admin, they can't change the role.
            if (targetUser.role === UserRole.ADMIN) {
                return [UserRole.ADMIN];
            }
            // For other users, can assign any role except Admin.
            return (Object.values(UserRole) as UserRole[]).filter(role => role !== UserRole.ADMIN);
        }

        // General case for managers:
        // If current user's rank is not strictly higher, they cannot change the role at all.
        if (currentUserRank <= targetUserRank) {
            return [targetUser.role]; // Return only the current role, which will be disabled.
        }

        // Manager can assign any role that is strictly lower than their own rank.
        const assignableRoles = (Object.values(UserRole) as UserRole[]).filter(role => ROLE_HIERARCHY[role] < currentUserRank);

        // Also include the target user's current role in the list so it doesn't disappear.
        if (!assignableRoles.includes(targetUser.role)) {
            assignableRoles.push(targetUser.role);
        }

        return assignableRoles.sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]); // Sort by rank descending
    };

    const resetForm = () => {
        setFormUser({
            fullname: '',
            phone: '',
            role: UserRole.NVNT
        });
        setShowEditForm(false);
        setEditingUserId(null);
    };

    const handleEditClick = (user: User) => {
        setFormUser({
            fullname: user.fullname,
            phone: user.phone,
            role: user.role
        });
        setEditingUserId(user.id);
        setRolesForEditDropdown(getEditableRolesFor(user));
        setShowEditForm(true);
    };

    const handleSaveUser = async () => {
        if (!formUser.phone || !formUser.fullname) {
            dispatch(addToast({ message: "Vui lòng điền SĐT và Họ và tên", type: 'error' }));
            return;
        }

        if (editingUserId) {
            try {
                const updatedData = {
                    fullname: formUser.fullname,
                    role: formUser.role,
                    // Phone (username) cannot be edited via this form.
                };
                await userService.updateUser(editingUserId, updatedData);
                dispatch(addToast({ message: "Cập nhật thông tin thành viên thành công!", type: 'success' }));
            } catch (error) {
                console.error("Error updating user role:", error);
                dispatch(addToast({ message: "Không thể cập nhật vai trò. Lỗi phân quyền hoặc kết nối.", type: 'error' }));
            }
        }
        resetForm();
    };

    const toggleBlock = async (userId: string) => {
        if (!canEditUsers || !project.id) return;
        const userToUpdate = project.team.find((u: User) => u.id === userId);
        if (!userToUpdate) return;
        const newStatus = userToUpdate.status === UserStatus.BLOCKED ? UserStatus.ACTIVE : UserStatus.BLOCKED;
        await userService.toggleUserBlock(userId, newStatus);
    };

    // --- Add Existing User Logic ---
    useEffect(() => {
        const fetchPotentialUsers = async () => {
            if (!showAddExistingUserModal) return;

            setIsLoadingPotentialUsers(true);
            try {
                const allFetchedUsers = await userService.fetchPotentialUsers(
                    currentUser.role,
                    currentUser.phone,
                    currentUser.id // Exclude self from potential users
                );

                // Filter out users already in the project
                const usersNotInProject = allFetchedUsers.filter((u: User) => !isUserInProject(u.id));

                setPotentialUsers(usersNotInProject);
            } catch (error) {
                console.error("Error fetching potential users:", error);
                setPotentialUsers([]);
            } finally {
                setIsLoadingPotentialUsers(false);
            }
        };

        fetchPotentialUsers();
    }, [showAddExistingUserModal, currentUser.role, currentUser.phone, project.team]);

    const handleAddExistingUser = async (userToAdd: User) => {
        if (!canEditUsers) {
            dispatch(addToast({ message: "Bạn không có quyền thêm thành viên vào dự án.", type: 'error' }));
            return;
        }
        if (isUserInProject(userToAdd.id)) {
            dispatch(addToast({ message: "Người dùng này đã có trong dự án.", type: 'info' }));
            return;
        }

        setAddingUserId(userToAdd.id); // Set loading state for this user

        await onAddExistingUserToProject(userToAdd);

        // Remove the user from the potential list after a short delay for animation.
        setTimeout(() => {
            setPotentialUsers((prev: User[]) => prev.filter((u: User) => u.id !== userToAdd.id));
            setAddingUserId(null);
        }, 500);
    };

    const confirmRemoveUser = () => {
        if (!userToRemove || !onRemoveUserFromProject) return;

        onRemoveUserFromProject(userToRemove);
        setUserToRemove(null); // Close modal on success
    };

    return (
        <>
            {canEditUsers && (
                <div className="mb-4">
                    <Button onClick={() => setShowAddExistingUserModal(true)}>
                        <UserPlus className="w-4 h-4" /> Thêm thành viên vào dự án
                    </Button>
                </div>
            )}

            {showEditForm && canEditUsers && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800/30 mb-6 space-y-4 animate-in fade-in">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 text-lg">Chỉnh sửa thông tin thành viên</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Họ và tên</label>
                            <VietnameseInput
                                className="w-full p-2 border dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                                value={formUser.fullname}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUser({ ...formUser, fullname: e.target.value })}
                                readOnly={true}
                                title="Chỉ người dùng mới có thể tự sửa tên của họ (trong mục Hồ sơ cá nhân)."
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Số điện thoại (Tài khoản)</label>
                            <VietnameseInput
                                className={`w-full p-2 border rounded-lg ${!!editingUserId ? 'bg-gray-100 text-gray-500' : ''}`}
                                value={formUser.phone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormUser({ ...formUser, phone: e.target.value })}
                                readOnly={true} // Phone should not be editable here
                                placeholder="Dùng để đăng nhập"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block mb-1">Vai trò</label>
                            <select
                                className="w-full p-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400"
                                value={formUser.role}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormUser({ ...formUser, role: e.target.value as UserRole })}
                                disabled={rolesForEditDropdown.length <= 1}
                            >
                                {rolesForEditDropdown.map((role: UserRole) => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 border-t border-blue-100 dark:border-blue-800/30 pt-4">
                        <Button variant="secondary" onClick={resetForm}>Hủy</Button>
                        <Button onClick={handleSaveUser}>Lưu</Button>
                    </div>
                </div>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Nhân viên</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Liên hệ</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Vai trò</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm">Quản lý trực tiếp</th>
                            <th className="p-4 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right">Hoạt động cuối</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-800 dark:text-gray-200">
                        {activeUsers.map((user: User) => (
                            <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <img src={user.avatar} alt={user.fullname} className="w-10 h-10 rounded-full border border-gray-100" />
                                        <div>
                                            <div className="font-medium text-gray-800">{user.fullname}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-sm text-gray-600 space-y-1">
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Phone className="w-4 h-4 text-gray-400" /> {user.phone}</div>
                                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300"><Mail className="w-4 h-4 text-gray-400" /> {user.email || '--'}</div>
                                </td>
                                <td className="p-4">
                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs border border-gray-200 dark:border-gray-600">{user.role}</span>
                                </td>
                                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                    {user.managerPhone || 'N/A'}
                                </td>
                                <td className="p-4 text-right text-gray-800 dark:text-gray-200">
                                    <div className="flex items-center justify-end gap-2">
                                        {user.status === UserStatus.BLOCKED ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Đã khóa
                                            </span>
                                        ) : (() => {
                                            const lastActiveInfo = formatLastActive(user.lastActiveAt);
                                            return (
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${lastActiveInfo.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                                                    {lastActiveInfo.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse dark:border-gray-700"></span>}
                                                    {lastActiveInfo.text}
                                                </span>
                                            );
                                        })()}

                                        {canModifyUser(user) && user.id !== currentUser.id && (
                                            <>
                                                <button
                                                    onClick={() => handleEditClick(user)}
                                                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                                    title="Sửa thông tin"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                                        e.stopPropagation(); onAdminPasswordReset(user);
                                                    }}
                                                    className="text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 p-1"
                                                    title="Khôi phục mật khẩu"
                                                >
                                                    <KeyRound className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}

                                        {canModifyUser(user) && (
                                            <button onClick={() => setUserToRemove(user)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 p-1" title="Xóa khỏi dự án">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}

                                        {canEditUsers && user.id !== currentUser.id && (
                                            <button
                                                onClick={() => toggleBlock(user.id)}
                                                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                                                title={user.status === UserStatus.BLOCKED ? "Mở khóa" : "Khóa tài khoản"}
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Existing User Modal */}
            {showAddExistingUserModal && canEditUsers && (
                <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-2">
                                <UserCheck className="w-5 h-5" /> Thêm thành viên vào dự án
                            </h3>
                            <button onClick={() => setShowAddExistingUserModal(false)}><X className="w-5 h-5 text-gray-500 dark:text-gray-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                                {currentUser.role === UserRole.ADMIN
                                    ? "Danh sách tất cả người dùng đang hoạt động và chưa có trong dự án."
                                    : `Danh sách nhân sự đang hoạt động thuộc quyền quản lý của bạn và chưa có trong dự án.`
                                }
                            </p>

                            <div className="space-y-2 max-h-80 overflow-y-auto border-t pt-4">
                                {isLoadingPotentialUsers ? (
                                    <div className="text-center text-gray-500 dark:text-gray-400">Đang tải danh sách...</div>
                                ) : potentialUsers.length > 0 ? (
                                    potentialUsers.map((user: User) => (
                                        <div key={user.id} className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700 transition-all duration-500 ${addingUserId === user.id ? 'opacity-0 -translate-x-5' : 'opacity-100 translate-x-0'}`}>
                                            <div className="flex items-center gap-3">
                                                <img src={user.avatar} alt={user.fullname} className="w-8 h-8 rounded-full" />
                                                <div>
                                                    <div className="font-medium text-gray-800 dark:text-gray-200">{user.fullname}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-400">{user.phone} - {user.role}</div>
                                                </div>
                                            </div>
                                            <Button
                                                className="h-8 px-3 text-xs"
                                                onClick={() => handleAddExistingUser(user)}
                                                isLoading={addingUserId === user.id}
                                            >
                                                {addingUserId === user.id ? 'Đang thêm...' : 'Thêm vào dự án'}
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center text-sm text-gray-500">Không tìm thấy người dùng nào phù hợp để thêm.</p>
                                )}
                            </div>

                            <div className="flex justify-end pt-4 border-t">
                                <Button variant="secondary" onClick={() => setShowAddExistingUserModal(false)}>
                                    Đóng
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal for Deletion */}
            {userToRemove && (
                <div className="absolute inset-0 z-50 bg-gray-900/50 dark:bg-gray-900/80 flex items-center justify-center backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 text-gray-800 dark:text-gray-200">
                        <div className="p-6 text-center">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                            </div>
                            <h3 className="mt-5 text-lg font-medium text-gray-900 dark:text-gray-100">
                                Xóa thành viên khỏi dự án?
                            </h3>
                            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 space-y-1">
                                <p>Bạn có chắc muốn xóa <span className="font-bold">{userToRemove.fullname}</span> khỏi dự án này?</p>
                                <p>Họ sẽ không thể truy cập dữ liệu dự án nữa. Hành động này không xóa tài khoản của họ khỏi hệ thống.</p>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-b-xl">
                            <Button
                                variant="danger"
                                onClick={confirmRemoveUser}
                                className="w-full sm:ml-3 sm:w-auto"
                            >
                                Xác nhận Xóa
                            </Button>
                            <Button variant="secondary" onClick={() => setUserToRemove(null)} className="mt-3 w-full sm:mt-0 sm:w-auto">Hủy bỏ</Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};