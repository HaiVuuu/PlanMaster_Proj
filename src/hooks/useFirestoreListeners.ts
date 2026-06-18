import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Project, User, Task, UserRole, UserStatus } from '../types';
import { setProjects, updateTasksInCurrentProject, updateTeamInCurrentProject } from '../store/projectSlice';

export const useFirestoreListeners = (currentUser: User | null, currentProject: Project | null) => {
  const dispatch = useDispatch();
  const [systemPendingUsers, setSystemPendingUsers] = useState<User[]>([]);

  // --- PROJECT LISTENER (User's projects) ---
  useEffect(() => {
    if (!currentUser) {
        dispatch(setProjects([]));
        return;
    }

    const projectsQuery = query(collection(db, 'projects'), where('memberUids', 'array-contains', currentUser.id));

    const unsubscribe = onSnapshot(projectsQuery, (querySnapshot) => {
        const userProjects = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Project));
        dispatch(setProjects(userProjects));
    }, (error) => {
        console.error("Error fetching projects: ", error);
    });
    
    return () => unsubscribe();
  }, [currentUser, dispatch]);

  // --- TASK DATA LISTENER (Sub-collection of current project) ---
  useEffect(() => {
    if (!currentProject?.id) return;

    const tasksCollectionRef = collection(db, 'projects', currentProject.id, 'tasks');
    const q = query(tasksCollectionRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreTasks = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      
      dispatch(updateTasksInCurrentProject(firestoreTasks));
    }, (error) => {
      console.error("Lỗi khi lấy dữ liệu tasks real-time: ", error);
    });

    return () => unsubscribe();
  }, [currentProject?.id, dispatch]);

  // --- TEAM DATA LISTENER (Members of current project) ---
  useEffect(() => {
    if (!currentProject?.id || !currentProject.memberUids || currentProject.memberUids.length === 0) {
        if (currentProject && (!currentProject.memberUids || currentProject.memberUids.length === 0) && currentProject.team.length > 0) {
           return;
        }
        if (currentProject && currentProject.team?.length > 0) {
            dispatch(updateTeamInCurrentProject([]));
        }
        return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('__name__', 'in', currentProject.memberUids));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const teamMembers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));            
        dispatch(updateTeamInCurrentProject(teamMembers));
    }, (error) => {
        console.error("Error fetching real-time team details: ", error);
    });

    return () => unsubscribe();
  }, [currentProject?.id, currentProject?.memberUids, dispatch]);

  // --- SYSTEM PENDING USERS LISTENER (ADMIN ONLY) ---
  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
        const pendingUsersQuery = query(collection(db, 'users'), where('status', '==', UserStatus.PENDING));

        const unsubscribe = onSnapshot(pendingUsersQuery, (querySnapshot) => {
            const users = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as User));
            setSystemPendingUsers(users);
        }, (error) => {
            console.error("Error fetching system pending users: ", error);
        });

        return () => unsubscribe();
    } else {
        setSystemPendingUsers([]);
    }
  }, [currentUser]);

  return { systemPendingUsers, setSystemPendingUsers };
};