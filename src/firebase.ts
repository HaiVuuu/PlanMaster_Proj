// firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// We will use environment variables to keep your keys secure
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// --- KÍCH HOẠT OFFLINE PERSISTENCE ---
// Phải được gọi ngay sau khi khởi tạo Firestore và trước bất kỳ thao tác nào khác với db.
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // Lỗi này thường xảy ra khi có nhiều tab cùng mở.
      console.warn("Firestore persistence failed: Có thể do nhiều tab đang mở.");
    } else if (err.code == 'unimplemented') {
      // Trình duyệt không hỗ trợ.
      console.error("Trình duyệt này không hỗ trợ Firestore persistence.");
    }
  });

// Xuất các dịch vụ sau khi đã cấu hình
export { db, auth, storage };
