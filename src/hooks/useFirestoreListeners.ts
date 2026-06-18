import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { setProjects, updateTasksInCurrentProject, updateTeamInCurrentProject } from '../store/projectSlice';
import { Project, User, UserRole, UserStatus, Task } from '../types';

/**
 * A custom hook to set up and tear down real-time Firestore listeners.
 * It listens for changes to projects, tasks, and team members.
 * It is "guest-aware" and will not run for guest users.
 */
export const useFirestoreListeners = (currentUser: User | null, currentProject: Project | null) => {
  const dispatch = useDispatch();
  const [systemPendingUsers, setSystemPendingUsers] = useState<User[]>([]);

  useEffect(() => {
    // --- KEY FIX ---
    // If there is no user or the user is a guest, do not set up any listeners.
    if (!currentUser) {
      // User is logged out. Clear all project data.
      dispatch(setProjects([]));
      dispatch(setCurrentProject(null));
      setSystemPendingUsers([]);
      return;
    }

    if (currentUser.role === UserRole.GUEST) {
      // Guest is logged in. Don't set up listeners, but also don't clear the
      // currentProject, which should be the sample project.
      return;
    }

    // --- Listener for Projects list ---
    const projectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', currentUser.id));
    const unsubscribeProjects = onSnapshot(projectsQuery, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
      dispatch(setProjects(projectsData));
    }, (error) => {
      console.error("Lỗi khi lấy dữ liệu projects real-time: ", error);
    });

    // --- Listeners related to the ACTIVE project ---
    let unsubscribeTasks: () => void = () => {};
    let unsubscribeTeam: () => void = () => {};

    if (currentProject) {
      // Listener for Tasks in the current project
      const tasksQuery = query(collection(db, 'projects', currentProject.id, 'tasks'));
      unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => doc.data() as Task);
        dispatch(updateTasksInCurrentProject(tasksData));
      }, (error) => {
        console.error("Lỗi khi lấy dữ liệu tasks real-time: ", error);
      });

      // Listener for Team members in the current project
      if (currentProject.memberUids && currentProject.memberUids.length > 0) {
        const teamQuery = query(collection(db, 'users'), where('__name__', 'in', currentProject.memberUids));
        unsubscribeTeam = onSnapshot(teamQuery, (snapshot) => {
          const teamData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
          dispatch(updateTeamInCurrentProject(teamData));
        }, (error) => {
          console.error("Lỗi khi lấy dữ liệu team real-time: ", error);
        });
      }
    }
    
    // --- Listener for System-wide Pending Users (for Admins) ---
    let unsubscribeSystemPending: () => void = () => {};
    if (currentUser.role === UserRole.ADMIN) {
        const pendingQuery = query(collection(db, 'users'), where('status', '==', UserStatus.PENDING));
        unsubscribeSystemPending = onSnapshot(pendingQuery, (snapshot) => {
            const pendingUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setSystemPendingUsers(pendingUsers);
        });
    }

    // Cleanup function to unsubscribe from all listeners
    return () => {
      unsubscribeProjects();
      unsubscribeTasks();
      unsubscribeTeam();
      unsubscribeSystemPending();
    };
  }, [currentUser, currentProject?.id, dispatch]); // Rerun if user or project changes

  return { systemPendingUsers, setSystemPendingUsers };
};