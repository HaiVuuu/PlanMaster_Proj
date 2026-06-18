import { AppNotification } from '../types';
import { generateUniqueId } from '../utils/idUtils'; // Assuming idUtils is available
import { db } from '../firebase'; // Import db from firebase
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from 'firebase/firestore';

/**
 * Creates a new application notification object.
 * @param title The title of the notification.
 * @param message The main message content.
 * @param type The type of notification (INFO, SUCCESS, WARNING, ERROR).
 * @param recipientIds An array of user IDs who should receive this notification.
 * @param taskId Optional ID of the task related to the notification.
 * @param senderName Optional name of the sender.
 * @returns An AppNotification object.
 */
const createNotification = (
  title: string,
  message: string,
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR',
  recipientIds: string[],
  taskId?: string,
  senderName?: string
): AppNotification => ({
  id: generateUniqueId('notif'),
  title,
  message,
  timestamp: new Date().toISOString(),
  isRead: false,
  type,
  recipientIds,
  taskId,
  senderName,
});

/**
 * Marks a specific notification as read for a given user within a project.
 * This function assumes notifications are stored as an array within the project document.
 * @param projectId The ID of the project.
 * @param userId The ID of the user for whom to mark the notification as read.
 * @param notificationId The ID of the notification to mark as read.
 */
const markNotificationAsRead = async (projectId: string, userId: string, notificationId: string) => {
  const projectDocRef = doc(db, 'projects', projectId);
  const projectDocSnap = await getDoc(projectDocRef);

  if (projectDocSnap.exists()) {
    const projectData = projectDocSnap.data();
    const notifications: AppNotification[] = projectData.notifications || [];

    const updatedNotifications = notifications.map(n => {
      // Only mark as read if it's for the current user and it's the target notification
      if (n.id === notificationId && n.recipientIds.includes(userId) && !n.isRead) {
        return { ...n, isRead: true };
      }
      return n;
    });

    await updateDoc(projectDocRef, { notifications: updatedNotifications });
  }
};

/**
 * Marks all unread notifications as read for a given user within a project.
 * This function assumes notifications are stored as an array within the project document.
 * @param projectId The ID of the project.
 * @param userId The ID of the user for whom to mark all notifications as read.
 */
const markAllNotificationsAsRead = async (projectId: string, userId: string) => {
  const projectDocRef = doc(db, 'projects', projectId);
  const projectDocSnap = await getDoc(projectDocRef);

  if (projectDocSnap.exists()) {
    const projectData = projectDocSnap.data();
    const notifications: AppNotification[] = projectData.notifications || [];

    const updatedNotifications = notifications.map(n => {
      // Mark as read if it's for the current user and it's unread
      if (n.recipientIds.includes(userId) && !n.isRead) {
        return { ...n, isRead: true };
      }
      return n;
    });

    await updateDoc(projectDocRef, { notifications: updatedNotifications });
  }
};

// Export an object containing all notification-related functions
export const notificationService = {
  createNotification,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};