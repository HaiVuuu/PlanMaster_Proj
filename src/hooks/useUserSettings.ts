import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User, AppSettings } from '../types';
import { setSettings } from '../store/settingsSlice';
import { setCurrentProject, setProjects } from '../store/projectSlice';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  compactMode: false,
  currency: 'VND',
  dateFormat: 'DD/MM/YYYY'
};

export const useUserSettings = (currentUser: User | null, setView: (view: 'PROJECT_SELECT' | 'WORKSPACE') => void) => {
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchSettings = async () => {
      if (currentUser) {
        const settingsDocRef = doc(db, 'userSettings', currentUser.id);
        const settingsDocSnap = await getDoc(settingsDocRef);
        const loadedSettings = settingsDocSnap.exists() ? (settingsDocSnap.data() as AppSettings) : DEFAULT_SETTINGS;
        
        document.documentElement.classList.toggle('dark', loadedSettings.theme === 'dark');
        localStorage.setItem('planmaster-theme', loadedSettings.theme);

        dispatch(setSettings(loadedSettings));
        setView('PROJECT_SELECT');
      } else {
        document.documentElement.classList.remove('dark');
        try { localStorage.removeItem('planmaster-theme'); } catch (e) {}
        dispatch(setCurrentProject(null));
        dispatch(setProjects([]));
        dispatch(setSettings(DEFAULT_SETTINGS));
        setView('PROJECT_SELECT');
      }
    };

    fetchSettings();
  }, [currentUser, dispatch, setView]);
};