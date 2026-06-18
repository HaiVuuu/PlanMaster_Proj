import { collection, doc, updateDoc, arrayUnion, arrayRemove, writeBatch, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { User, UserRole, UserStatus } from '../types';
import { sendPasswordResetEmail } from 'firebase/auth';

export const userService = {
  /**
   * Updates a user's profile information.
   * @param userId The ID of the user to update.
   * @param updates Partial User object with fields to update.
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, updates);
  },

  /**
   * Toggles a user's status between ACTIVE and BLOCKED.
   * @param userId The ID of the user to block/unblock.
   * @param newStatus The new status to set (UserStatus.ACTIVE or UserStatus.BLOCKED).
   */
  async toggleUserBlock(userId: string, newStatus: UserStatus): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { status: newStatus });
  },

  /**
   * Adds an existing active user to a project.
   * @param projectId The ID of the project.
   * @param userId The ID of the user to add.
   */
  async addUserToProject(projectId: string, userId: string): Promise<void> {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, {
      memberUids: arrayUnion(userId)
    });
  },

  /**
   * Removes a user from a project.
   * @param projectId The ID of the project.
   * @param userId The ID of the user to remove.
   */
  async removeUserFromProject(projectId: string, userId: string): Promise<void> {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, {
      memberUids: arrayRemove(userId)
    });
  },

  /**
   * Approves a pending user and adds them to a project.
   * @param projectId The ID of the project.
   * @param userToAssign The user object to approve and assign.
   */
  async assignUserToProject(projectId: string, userToAssign: User): Promise<void> {
    const batch = writeBatch(db);
    const userDocRef = doc(db, 'users', userToAssign.id);
    batch.update(userDocRef, { status: UserStatus.ACTIVE });

    const projectDocRef = doc(db, 'projects', projectId);
    batch.update(projectDocRef, { memberUids: arrayUnion(userToAssign.id) });
    await batch.commit();
  },

  /**
   * Rejects a pending user by deleting their account from Firestore.
   * @param userId The ID of the user to reject.
   */
  async rejectUser(userId: string): Promise<void> {
    const userDocRef = doc(db, 'users', userId);
    await deleteDoc(userDocRef);
    // Note: Deleting from Firebase Auth is a separate, more complex step
    // often handled by a server-side function for security reasons.
  },

  /**
   * Sends a password reset email to a user.
   * @param userToReset The user object for whom to reset the password.
   */
  async adminPasswordReset(userToReset: User): Promise<void> {
    const email = userToReset.phone.includes('@') ? userToReset.phone : `${userToReset.phone}@planmaster.vn`;
    await sendPasswordResetEmail(auth, email);
  },

  /**
   * Fetches potential users who can be added to a project.
   * Filters based on current user's role and managerPhone.
   * @param currentUserRole The role of the current logged-in user.
   * @param currentUserPhone The phone number of the current logged-in user.
   * @param currentUserId The ID of the current logged-in user.
   * @returns An array of User objects.
   */
  async fetchPotentialUsers(currentUserRole: UserRole, currentUserPhone: string, currentUserId: string): Promise<User[]> {
    const usersRef = collection(db, 'users');
    let q;

    if (currentUserRole === UserRole.ADMIN) {
      q = query(usersRef, where('status', '==', UserStatus.ACTIVE), where('__name__', '!=', currentUserId));
    } else {
      q = query(usersRef,
        where('managerPhone', '==', currentUserPhone),
        where('status', '==', UserStatus.ACTIVE),
        where('__name__', '!=', currentUserId)
      );
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(d => Object.assign({ id: d.id }, d.data()) as User);
  }
};