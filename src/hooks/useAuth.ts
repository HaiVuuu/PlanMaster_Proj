import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { setUser, setAuthError } from '../store/authSlice';
import { User, UserStatus } from '../types';

/**
 * A custom hook that listens to Firebase auth state changes.
 * It fetches the user's profile from Firestore upon login and updates the Redux store.
 * It specifically ignores anonymous (guest) users, as they are handled by a different process.
 */
export const useAuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // --- KEY FIX ---
        // If the user is anonymous (a guest), we do nothing.
        // The guest session is managed by a separate effect in App.tsx.
        // This prevents this hook from trying to fetch a non-existent profile for the guest.
        if (user.isAnonymous) {
          return;
        }

        // For real users, fetch their profile from Firestore.
        try {
          const publicDocRef = doc(db, 'users', user.uid);
          const privateDocRef = doc(db, 'user_private_details', user.uid);
          
          const [publicDoc, privateDoc] = await Promise.all([
            getDoc(publicDocRef),
            getDoc(privateDocRef),
          ]);

          if (!publicDoc.exists() || !privateDoc.exists()) {
            console.error(`[Auth Abort] User data is incomplete for UID ${user.uid}. Public doc exists: ${publicDoc.exists()}, Private doc exists: ${privateDoc.exists()}. Signing out.`);
            await signOut(auth);
            dispatch(setUser(null));
            dispatch(setAuthError("Hồ sơ người dùng không đầy đủ hoặc chưa được tạo. Vui lòng đăng ký lại hoặc liên hệ quản trị viên."));
            return;
          }

          const userProfile: User = {
            id: user.uid,
            ...publicDoc.data(),
            ...privateDoc.data(),
          } as User;

          if (userProfile.status === UserStatus.BLOCKED || userProfile.status === UserStatus.PENDING) {
            const message = userProfile.status === UserStatus.BLOCKED ? "Tài khoản của bạn đã bị khóa." : "Tài khoản của bạn đang chờ quản lý duyệt.";
            await signOut(auth);
            dispatch(setUser(null));
            dispatch(setAuthError(message));
            return;
          }

          dispatch(setUser(userProfile));

        } catch (error) {
          console.error("Error fetching user profile:", error);
          await signOut(auth);
          dispatch(setUser(null));
          dispatch(setAuthError("Lỗi khi tải hồ sơ người dùng."));
        }
      } else {
        // User is signed out
        dispatch(setUser(null));
      }
    });

    return () => unsubscribe();
  }, [dispatch]);
};