import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { Project } from '../types';

export const storageService = {
  /**
   * Uploads a file to Firebase Storage.
   * @param projectId The ID of the project.
   * @param pathPrefix The path prefix within the project's storage bucket (e.g., 'task_images/taskId', 'payment_proofs').
   * @param file The file to upload.
   * @returns Promise<string | null> The download URL of the uploaded file, or null if failed.
   */
  async uploadFile(projectId: string, pathPrefix: string, file: File): Promise<string | null> {
    if (!projectId) {
      console.error("Cannot upload file, project ID is missing.");
      throw new Error("Project ID is missing");
    }
    const uniqueName = `${Date.now()}-${file.name}`;
    const storageRef = ref(storage, `projects/${projectId}/${pathPrefix}/${uniqueName}`);
    try {
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error("Error uploading file:", error);
      throw new Error("Có lỗi xảy ra trong quá trình tải file lên.");
    }
  },

  /**
   * Deletes a file from Firebase Storage given its full path.
   * @param filePath The full path to the file in Firebase Storage (e.g., 'projects/projectId/task_images/taskId/fileName').
   * @returns Promise<void>
   */
  async deleteFile(filePath: string): Promise<void> {
    const fileRef = ref(storage, filePath);
    try {
      await deleteObject(fileRef);
    } catch (error) {
      console.error("Error deleting file from storage:", error);
      throw new Error("Có lỗi xảy ra khi xóa file khỏi bộ nhớ.");
    }
  },

  /**
   * Extracts the file path from a Firebase Storage download URL.
   * This is useful for constructing a Storage reference to delete the file.
   * @param downloadUrl The Firebase Storage download URL.
   * @returns The file path within the storage bucket, or null if it cannot be parsed.
   */
  getFilePathFromUrl(downloadUrl: string): string | null {
    try {
      const url = new URL(downloadUrl);
      // Path is typically /o/projects%2FprojectId%2Fpath%2Fto%2Ffile.jpg?alt...
      const path = decodeURIComponent(url.pathname.split('/o/')[1].split('?')[0]);
      return path;
    } catch (e) {
      console.error("Could not parse URL to get file path:", downloadUrl, e);
      return null;
    }
  },

  // Placeholder for client-side backup (actual backup should be server-side for large data)
  downloadProjectBackup(project: Project): void {
    const backupData = project.tasks.flatMap(t =>
      t.logs.filter(l => l.images && l.images.length > 0)
        .map(l => ({
          taskCode: t.code,
          taskName: t.name,
          logDate: l.timestamp,
          user: l.userName,
          note: l.note,
          images: l.images
        }))
    );
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Backup_Images_${project.id}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};