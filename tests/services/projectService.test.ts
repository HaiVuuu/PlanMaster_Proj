import { describe, it, expect, vi, beforeEach } from 'vitest';
import { projectService } from '../../src/services/projectService';
import { addDoc, updateDoc, collection, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { generateUniqueId } from '../../src/utils/idUtils';
import { formatBytes, cleanForFirestore } from '../../src/utils/helpers';
import { Project, User, UserRole, ProjectDocument } from '../../src/types';

// 1. Mock tất cả các dependency bên ngoài và bên trong
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  getFirestore: vi.fn(),
  enableIndexedDbPersistence: vi.fn(() => Promise.resolve()),
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
  getStorage: vi.fn(),
}));

vi.mock('../../src/utils/idUtils');
vi.mock('../../src/utils/helpers');

// 2. Ép kiểu các hàm đã mock để sử dụng
const mockedAddDoc = vi.mocked(addDoc);
const mockedUpdateDoc = vi.mocked(updateDoc);
const mockedCollection = vi.mocked(collection);
const mockedDoc = vi.mocked(doc);
const mockedRef = vi.mocked(ref);
const mockedUploadBytes = vi.mocked(uploadBytes);
const mockedGetDownloadURL = vi.mocked(getDownloadURL);
const mockedDeleteObject = vi.mocked(deleteObject);
const mockedGenerateUniqueId = vi.mocked(generateUniqueId);
const mockedFormatBytes = vi.mocked(formatBytes);
const mockedCleanForFirestore = vi.mocked(cleanForFirestore);

describe('projectService', () => {
  // 3. Reset mock trước mỗi bài test
  beforeEach(() => {
    vi.clearAllMocks();
    // Giả lập hàm cleanForFirestore chỉ đơn giản là trả về dữ liệu đầu vào
    // để chúng ta không cần test logic của nó ở đây.
    mockedCleanForFirestore.mockImplementation(updates => updates);

    // Giả lập chuỗi `collection` và `doc` để test trở nên chặt chẽ hơn
    // 1. `collection()` trả về một tham chiếu giả
    const mockCollectionRef = { path: 'mock/collection' };
    mockedCollection.mockReturnValue(mockCollectionRef as any);

    // 2. `doc()` trả về một tham chiếu giả khác
    const mockDocRef = { path: 'mock/doc' };
    mockedDoc.mockReturnValue(mockDocRef as any);

    // Default mock for ref and uploadBytes for consistency
    // This ensures `ref` always returns an object with `fullPath`
    const defaultMockStorageRef = { fullPath: 'mock/path/default.file' };
    mockedRef.mockReturnValue(defaultMockStorageRef as any);
    mockedUploadBytes.mockResolvedValue({ ref: defaultMockStorageRef } as any);
  });

  describe('createProject', () => {
    it('should create a new project with the current user as owner and member', async () => {
      const currentUser: User = { id: 'user-1', fullname: 'Test User' } as User;
      const projectsCount = 5;
      const newProjectId = 'new-project-id';
      const mockCollectionRef = { path: 'mock/collection' };

      // Giả lập addDoc trả về một tham chiếu có id
      mockedAddDoc.mockResolvedValue({ id: newProjectId } as any);

      const result = await projectService.createProject(currentUser, projectsCount);

      // Kiểm tra `collection` được gọi đúng
      expect(mockedCollection).toHaveBeenCalledWith(undefined, 'projects');
      
      // Kiểm tra xem `addDoc` có được gọi với đúng collection ref và dữ liệu không
      expect(mockedAddDoc).toHaveBeenCalledOnce();
      const [collectionArg, dataArg] = mockedAddDoc.mock.calls[0];
      expect(collectionArg).toEqual(mockCollectionRef);
      expect((dataArg as any).name).toBe(`Dự án Mới ${projectsCount + 1}`);
      expect((dataArg as any).ownerId).toBe(currentUser.id);
      expect((dataArg as any).memberUids).toEqual([currentUser.id]);

      // Kiểm tra kết quả trả về của hàm
      expect(result.id).toBe(newProjectId);
      expect(result.team).toEqual([currentUser]);
    });
  });

  describe('updateProjectDetails', () => {
    it('should call updateDoc with cleaned data', async () => {
      const projectId = 'p1';
      const updates = { name: 'New Project Name' };
      const mockDocRef = { path: 'mock/doc' };

      await projectService.updateProjectDetails(projectId, updates);

      // Kiểm tra `doc` được gọi đúng
      expect(mockedDoc).toHaveBeenCalledWith(undefined, 'projects', projectId);
      // Kiểm tra `updateDoc` được gọi đúng với doc ref và dữ liệu
      expect(mockedUpdateDoc).toHaveBeenCalledOnce();
      const [docArg, dataArg] = mockedUpdateDoc.mock.calls[0];
      expect(docArg).toEqual(mockDocRef);
      expect(dataArg).toEqual(updates);
      expect(mockedCleanForFirestore).toHaveBeenCalledWith(updates);
    });
  });

  describe('uploadProjectDocument', () => {
    it('should upload a file and update the project documents array', async () => {
      const project: Project = { id: 'p1', documents: [] } as Project;
      const user: User = { fullname: 'Uploader' } as User;
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      const docName = 'Test Document';
      const downloadURL = 'http://fake-url.com/test.pdf';
      const newDocId = 'doc-123';
      const mockDocRef = { path: 'mock/doc' };

      // Giả lập các hàm liên quan
      mockedUploadBytes.mockResolvedValue({} as any);
      mockedGetDownloadURL.mockResolvedValue(downloadURL);
      mockedGenerateUniqueId.mockReturnValue(newDocId);
      mockedFormatBytes.mockReturnValue('10 KB');

      await projectService.uploadProjectDocument(project, user, file, docName);

      expect(mockedUploadBytes).toHaveBeenCalledOnce();
      
      // Kiểm tra `doc` và `updateDoc`
      expect(mockedDoc).toHaveBeenCalledWith(undefined, 'projects', project.id);
      expect(mockedUpdateDoc).toHaveBeenCalledOnce();

      // Kiểm tra xem document mới có được thêm vào mảng documents không
      const [docArg, dataArg] = mockedUpdateDoc.mock.calls[0];
      expect(docArg).toEqual(mockDocRef);
      expect((dataArg as any).documents).toHaveLength(1);
      expect((dataArg as any).documents[0]).toEqual(expect.objectContaining({
        id: newDocId,
        name: docName,
        url: downloadURL,
        uploadedBy: user.fullname,
      }));
    });
  });

  describe('removeProjectDocument', () => {
    it('should delete file from storage and remove from project array', async () => {
      const docToRemove: ProjectDocument = { id: 'doc-to-remove', storagePath: 'path/to/file.pdf' } as ProjectDocument;
      const project: Project = { id: 'p1', documents: [docToRemove] } as Project;
      const mockDocRef = { path: 'mock/doc' };

      mockedDeleteObject.mockResolvedValue(undefined);

      await projectService.removeProjectDocument(project, docToRemove);

      expect(mockedDeleteObject).toHaveBeenCalledOnce();
      
      // Kiểm tra `doc` và `updateDoc`
      expect(mockedDoc).toHaveBeenCalledWith(undefined, 'projects', project.id);
      expect(mockedUpdateDoc).toHaveBeenCalledWith(mockDocRef, { documents: [] });
    });

    it('should not throw if storage deletion fails with object-not-found', async () => {
      const docToRemove: ProjectDocument = { id: 'doc-to-remove', storagePath: 'path/to/file.pdf' } as ProjectDocument;
      const project: Project = { id: 'p1', documents: [docToRemove] } as Project;
      const mockDocRef = { path: 'mock/doc' };

      // Giả lập lỗi "không tìm thấy" từ storage
      mockedDeleteObject.mockRejectedValue({ code: 'storage/object-not-found' });

      // Hàm không nên throw lỗi ra ngoài
      await expect(projectService.removeProjectDocument(project, docToRemove)).resolves.not.toThrow();
      
      // Và vẫn phải cập nhật firestore
      expect(mockedDoc).toHaveBeenCalledWith(undefined, 'projects', project.id);
      expect(mockedUpdateDoc).toHaveBeenCalledWith(mockDocRef, { documents: [] });
    });
  });
});