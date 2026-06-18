import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { ProjectReport } from '../types';

export const reportService = {
  async addReport(projectId: string, report: ProjectReport): Promise<void> {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, {
      reports: arrayUnion(report),
    });
  },
};