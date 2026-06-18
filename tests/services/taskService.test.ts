import { describe, it, expect, vi, beforeEach } from 'vitest';
import { taskService } from '../../src/services/taskService';
import { setDoc, doc, collection } from 'firebase/firestore';
import { generateUniqueId } from '../../src/utils/idUtils';
import { Task, TaskStatus, User } from '../../src/types';

// Mock dependencies from external libraries
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  setDoc: vi.fn(),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()), // Thêm dòng này
  getFirestore: vi.fn(),
}));

// Mock local dependencies. This is the most robust way.
// Vitest hoists this call, so it runs before the `import`. This mocks the entire module.
vi.mock('../../src/utils/idUtils'); 

// Cast mocks for type safety and autocompletion
const mockedSetDoc = vi.mocked(setDoc);
const mockedCollection = vi.mocked(collection);
const mockedDoc = vi.mocked(doc);
// After mocking the module, the imported `generateUniqueId` is a mock. We use `vi.mocked()` to get correct TypeScript types for it.
const mockedGenerateUniqueId = vi.mocked(generateUniqueId);

describe('taskService', () => {
  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    vi.clearAllMocks();
    // This setup correctly simulates the `collection` -> `doc` chain.
    // 1. `collection()` is called and returns a dummy reference object.
    const mockCollectionRef = { path: 'mock/collection' };
    mockedCollection.mockReturnValue(mockCollectionRef as any);
    // 2. `doc()` is then called with that dummy reference and the task ID.
  });

  describe('addTask', () => {
    it('should create a root task with parentId as null when adding the first task', async () => {
      const projectId = 'p1';
      const existingTasks: Task[] = [];
      const newTaskId = 'task_123';
      const expectedCode = 'NEW-1';

      // Setup mock return values
      mockedGenerateUniqueId.mockReturnValue(newTaskId);
      
      // Call the function to test
      await taskService.addTask(projectId, null, existingTasks);

      // Assertions
      // 1. Check if the collection and document references were created correctly
      expect(mockedCollection).toHaveBeenCalledWith(undefined, 'projects', projectId, 'tasks');
      expect(mockedDoc).toHaveBeenCalledWith(expect.anything(), newTaskId);
      // 2. Check if setDoc() was called exactly once
      expect(mockedSetDoc).toHaveBeenCalledOnce();

      // 3. Check the data payload sent to Firestore
      const callArg = mockedSetDoc.mock.calls[0][1]; // Get the data object from the setDoc call
      
      expect(callArg).toEqual(expect.objectContaining({
        id: newTaskId,
        code: expectedCode, // Verify code generation
        name: 'Công việc mới',
        status: TaskStatus.NEW,
        parentId: null, // <<< CRUCIAL: Verify parentId is null, not undefined
        order: 0,
      }));
    });

    it('should create a sub-task with the correct parentId and generated code', async () => {
        const projectId = 'p1';
        const parentTaskId = 'parent_task_abc';
        const existingTasks: Task[] = [
            // A more realistic parent task. As the first task, its order should be 0.
            { id: parentTaskId, code: 'CV.01', order: 0 } as Task,
        ];
        const newSubTaskId = 'subtask_456';
        const expectedSubCode = 'CV.01.1';

        mockedGenerateUniqueId.mockReturnValue(newSubTaskId);
        await taskService.addTask(projectId, parentTaskId, existingTasks);

        expect(mockedCollection).toHaveBeenCalledWith(undefined, 'projects', projectId, 'tasks');
        expect(mockedDoc).toHaveBeenCalledWith(expect.anything(), newSubTaskId);
        expect(mockedSetDoc).toHaveBeenCalledOnce();

        const callArg = mockedSetDoc.mock.calls[0][1];
        
        expect(callArg).toEqual(expect.objectContaining({
            id: newSubTaskId,
            code: expectedSubCode, // Verify sub-task code generation
            name: 'Công việc phụ/phát sinh',
            status: TaskStatus.NEW,
            parentId: parentTaskId,
            order: 1,
        }));
    });
  });
});