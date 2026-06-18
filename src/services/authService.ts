    import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { writeBatch, doc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserRole, UserStatus } from '../types';

export const authService = {
  /**
   * Handles user login with email and password.
   * @param phone The user's phone number (will be converted to email).
   * @param password The user's password.
   * @returns Promise<void>
   * @throws Error with specific message for UI.
   */
  async login(phone: string, password: string): Promise<void> {
    const email = phone.includes('@') ? phone : `${phone}@planmaster.vn`;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged in useAuthListener will handle the rest.
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('Số điện thoại hoặc mật khẩu không đúng.');
      } else {
        throw new Error('Đã xảy ra lỗi khi đăng nhập.');
      }
    }
  },

  /**
   * Handles user registration.
   * @param fullname User's full name.
   * @param phone User's phone number.
   * @param password User's password.
   * @param managerPhone Manager's phone number for approval.
   * @param role User's desired role.
   * @returns Promise<void>
   * @throws Error with specific message for UI.
   */
  async register(fullname: string, phone: string, password: string, managerPhone: string, role: UserRole): Promise<void> {
    const email = `${phone}@planmaster.vn`;

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newFirebaseUser = userCredential.user;

      const publicUserData = {
        username: phone,
        fullname: fullname,
        managerPhone: managerPhone,
        role: role,
        status: UserStatus.PENDING,
        avatar: `https://ui-avatars.com/api/?name=${fullname.replace(/\s/g, '+')}`,
        lastActiveAt: new Date().toISOString(),
        stats: { accessTime: { week: 0, month: 0, year: 0, total: 0 }, uploads: 0, notes: 0 }
      };

      const privateUserData = {
        phone: phone,
        email: email,
        cccd: '',
      };

      const batch = writeBatch(db);
      batch.set(doc(db, 'users', newFirebaseUser.uid), publicUserData);
      batch.set(doc(db, 'user_private_details', newFirebaseUser.uid), privateUserData);
      await batch.commit();
    } catch (error: any) {
      console.error("Firebase Registration Error:", error);
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Số điện thoại này đã được đăng ký.');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Mật khẩu quá yếu. Vui lòng chọn mật khẩu khác.');
      } else {
        throw new Error('Đã xảy ra lỗi khi đăng ký. Vui lòng thử lại.');
      }
    }
  },

  /**
   * Sends a password reset email to the given phone number (converted to email).
   * @param phone The user's phone number.
   * @returns Promise<void>
   * @throws Error if email cannot be sent.
   */
  async sendPasswordReset(phone: string): Promise<void> {
    const email = phone.includes('@') ? phone : `${phone}@planmaster.vn`;
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
      console.error("Error sending password reset email:", error);
      throw new Error("Không thể gửi email khôi phục. Số điện thoại có thể không tồn tại.");
    }
  },

  /**
   * Signs out the current user.
   * @returns Promise<void>
   */
  async logout(): Promise<void> {
    await signOut(auth);
  }
};