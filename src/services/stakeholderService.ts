import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Stakeholder } from '../types';

export const stakeholderService = {
  async addStakeholder(projectId: string, stakeholder: Stakeholder): Promise<void> {
    const projectDocRef = doc(db, 'projects', projectId);
    await updateDoc(projectDocRef, {
      stakeholders: arrayUnion(stakeholder),
    });
  },
};