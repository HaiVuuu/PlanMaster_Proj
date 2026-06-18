import {
  doc,
  addDoc,
  updateDoc,
  collection,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import { db, storage } from '../firebase';
import { Project, User, ProjectDocument } from '../types';
import { formatBytes, cleanForFirestore } from '../utils/helpers';
import { generateUniqueId } from '../utils/idUtils';

const SAMPLE_PROJECT_SKELETON = {
  location: '',
  description: '',
  documents: [],
  tasks: [],
  team: [],
  stakeholders: [],
  participants: [
      { id: 'p1', label: 'Chủ đầu tư', value: '', isVisible: true, isSystem: true },
      { id: 'p2', label: 'Tư vấn giám sát', value: '', isVisible: true, isSystem: true },
      { id: 'p3', label: 'Nhà thầu thi công', value: '', isVisible: true, isSystem: true },
      { id: 'p4', label: 'Tư vấn thiết kế', value: '', isVisible: true, isSystem: true },
  ],
  notifications: [],
  issues: [],
  reports: [],
};

export const projectService = {
  async createProject(currentUser: User, existingProjectsCount: number): Promise<Project> {
    const newProjectName = `Dự án Mới ${existingProjectsCount + 1}`;
    const newProjectData = {
      ...SAMPLE_PROJECT_SKELETON,
      name: newProjectName,
      ownerId: currentUser.id, // Set owner
      memberUids: [currentUser.id],
      createdAt: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'projects'), newProjectData);
    
    // Return the full project object for local state update
    return { 
        ...newProjectData, 
        id: docRef.id,
        team: [currentUser], // Add creator to local team object
    } as Project;
  },

  async updateProjectDetails(projectId: string, updates: Partial<Pick<Project, 'name' | 'location' | 'description' | 'participants'>>): Promise<void> {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, cleanForFirestore(updates));
  },

  async uploadProjectDocument(currentProject: Project, currentUser: User, file: File, docName: string): Promise<void> {
    const fileExtension = file.name.split('.').pop()?.toUpperCase() || 'FILE';
    const fileName = `${docName.replace(/ /g, '_')}_v1.${fileExtension.toLowerCase()}`;
    const storageRef = ref(storage, `projects/${currentProject.id}/documents/${fileName}`);

    const uploadResult = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(uploadResult.ref);

    const newDoc: ProjectDocument = {
        id: generateUniqueId('doc'),
        name: docName,
        type: fileExtension,
        uploadDate: new Date().toISOString(),
        size: formatBytes(file.size),
        uploadedBy: currentUser.fullname || 'Unknown',
        url: downloadURL,
        storagePath: storageRef.fullPath,
        version: 1
    };

    const updatedDocuments = [...(currentProject.documents || []), newDoc];
    const projectDocRef = doc(db, 'projects', currentProject.id);
    await updateDoc(projectDocRef, { documents: updatedDocuments });
  },

  async removeProjectDocument(currentProject: Project, docToRemove: ProjectDocument): Promise<void> {
    if (docToRemove.storagePath) {
        const fileRef = ref(storage, docToRemove.storagePath);
        try {
            await deleteObject(fileRef);
        } catch (error: any) {
            console.warn("Could not delete file from storage (it may have been already deleted):", error.code);
            if (error.code !== 'storage/object-not-found') throw error;
        }
    }
    const updatedDocuments = (currentProject.documents || []).filter((d: ProjectDocument) => d.id !== docToRemove.id);
    const projectDocRef = doc(db, 'projects', currentProject.id);
    await updateDoc(projectDocRef, { documents: updatedDocuments });
  },
};