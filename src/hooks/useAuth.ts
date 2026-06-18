import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, UserStatus } from '../types';
import { setUser, setAuthStatus, setAuthError } from '../store/authSlice';

export const useAuthListener = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log('[Auth Listener] Hook mounted. Setting auth status to LOADING.');
    dispatch(setAuthStatus('LOADING'));
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        console.log(`[Auth Listener] onAuthStateChanged fired with user: ${firebaseUser.uid}`);
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const privateDocRef = doc(db, 'user_private_details', firebaseUser.uid);

        try {
          const [userDocSnap, privateDocSnap] = await Promise.all([
            getDoc(userDocRef),
            getDoc(privateDocRef)
          ]);
          
          if (userDocSnap.exists() && privateDocSnap.exists()) {
            const userData = userDocSnap.data();
            const privateData = privateDocSnap.data();

            // --- ROBUST DATA VALIDATION ---
            // This is the most critical part. We ensure all non-optional fields in the User type are present.
            const requiredFields = ['username', 'fullname', 'role', 'status', 'phone', 'email'];
            const combinedData = { ...userData, ...privateData };
            const missingFields = requiredFields.filter(field => !(field in combinedData) || combinedData[field] === undefined || combinedData[field] === null);

            if (missingFields.length > 0) {
              const errorMsg = `Dữ liệu tài khoản không đầy đủ (thiếu: ${missingFields.join(', ')}). Vui lòng liên hệ quản trị viên.`; // prettier-ignore
              console.error(`[Auth Abort] UID ${firebaseUser.uid}: ${errorMsg}`);
              await auth.signOut();
              dispatch(setAuthError(errorMsg));
              dispatch(setUser(null));
              return; // Stop execution
            }

            // --- STATUS CHECK ---
            const fullUser = { ...combinedData, id: firebaseUser.uid } as User;

            if (fullUser.status === UserStatus.ACTIVE) {
              console.log(`[Auth Listener] User ${firebaseUser.uid} is ACTIVE. Dispatching setUser and setAuthStatus('LOGGED_IN').`);
              dispatch(setUser(fullUser));
              dispatch(setAuthStatus('LOGGED_IN'));
            } else {
              let errorMessage = 'Tài khoản của bạn đang chờ duyệt hoặc đã bị khóa.';
              if (fullUser.status === UserStatus.PENDING) {
                  errorMessage = 'Tài khoản của bạn đang chờ quản lý duyệt.';
              } else if (fullUser.status === UserStatus.BLOCKED) {
                  errorMessage = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.';
              }
              console.warn(`[Auth Listener] User ${firebaseUser.uid} status is NOT ACTIVE ('${fullUser.status}'). Signing out.`);
              await auth.signOut();
              dispatch(setAuthError(errorMessage));
              dispatch(setUser(null));
              // No need to set status here, signOut will re-trigger the listener which handles LOGGED_OUT state
            }
          } else {
            console.error(`[Auth Abort] User data is incomplete for UID ${firebaseUser.uid}. Public doc exists: ${userDocSnap.exists()}, Private doc exists: ${privateDocSnap.exists()}. Signing out.`);
            await auth.signOut(); // prettier-ignore
            const errorMessage = userDocSnap.exists() ? 'Dữ liệu tài khoản không đầy đủ.' : 'Không tìm thấy thông tin người dùng.';
            dispatch(setAuthError(`${errorMessage} Vui lòng liên hệ quản trị viên.`));
            dispatch(setUser(null));
            // No need to set status here, signOut will re-trigger the listener
          }
        } catch (error) {
            console.error("Error fetching user data:", error);
            await auth.signOut(); // prettier-ignore
            dispatch(setAuthError('Lỗi khi tải dữ liệu người dùng.'));
            dispatch(setUser(null));
            // No need to set status here, signOut will re-trigger the listener
        }
      } else {
        console.log("[Auth Listener] onAuthStateChanged fired with NULL user. Dispatching setUser(null) and setAuthStatus('LOGGED_OUT').");
        dispatch(setUser(null));
        dispatch(setAuthStatus('LOGGED_OUT'));
      }
    });

    return () => {
      console.log('[Auth Listener] Hook unmounting. Unsubscribing from onAuthStateChanged.');
      unsubscribe();
    };
  }, [dispatch]);
};