import { doc, updateDoc, arrayUnion, arrayRemove, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { Task, PaymentLog, Project } from '../types';

export const costService = {
  async updateTaskUnitPrice(projectId: string, taskId: string, unitPrice: number): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskDocRef, { unitPrice });
  },

  async addPaymentLog(projectId: string, task: Task, log: PaymentLog): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', task.id);
    const newPaidAmount = (task.paidAmount || 0) + log.amount;
    await updateDoc(taskDocRef, {
      paymentLogs: arrayUnion(log),
      paidAmount: newPaidAmount,
    });
  },

  async removePaymentLog(projectId: string, task: Task, logToRemove: PaymentLog): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', task.id);
    const newPaidAmount = Math.max(0, (task.paidAmount || 0) - logToRemove.amount);
    await updateDoc(taskDocRef, {
      paymentLogs: arrayRemove(logToRemove),
      paidAmount: newPaidAmount,
    });
  },

  async updateCostAssignees(projectId: string, taskId: string, newAssignees: string[]): Promise<void> {
    const taskDocRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskDocRef, { costAssignees: newAssignees });
  },
};