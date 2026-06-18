/* eslint-disable @typescript-eslint/no-var-requires */
const admin = require('firebase-admin');

// --- CẤU HÌNH ---
// 1. Đặt file serviceAccountKey.json của bạn vào cùng thư mục `scripts`.
// 2. Đảm bảo bạn đã thêm `serviceAccountKey.json` vào file .gitignore.
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const BATCH_LIMIT = 400; // Giới hạn của Firestore là 500, để 400 cho an toàn.

async function migratePrivateDetails() {
  console.log('🚀 Bắt đầu quá trình di chuyển dữ liệu...');

  const usersSnapshot = await db.collection('users').get();
  const allUserIds = usersSnapshot.docs.map(doc => doc.id);

  console.log(`🔍 Tìm thấy ${usersSnapshot.size} tài khoản người dùng để kiểm tra.`);

  let batch = db.batch();
  let missingCount = 0;
  let operationsInBatch = 0;

  for (const userId of allUserIds) {
    const userDocRef = db.collection('users').doc(userId);
    const privateDocRef = db.collection('user_private_details').doc(userId);

    const privateDocSnap = await privateDocRef.get();

    if (!privateDocSnap.exists) {
      missingCount++;
      console.log(`[❗️ MISSING] User ID: ${userId} thiếu tài liệu private. Đang chuẩn bị tạo...`);

      const userDocSnap = await userDocRef.get();
      const userData = userDocSnap.data();

      if (userData && userData.phone) {
        const privateData = {
          phone: userData.phone,
          email: userData.email || `${userData.phone}@planmaster.vn`, // Ưu tiên email có sẵn, nếu không thì tạo mới
          cccd: userData.cccd || '', // Lấy cccd nếu có, nếu không thì để trống
        };

        batch.set(privateDocRef, privateData);
        operationsInBatch++;

        if (operationsInBatch >= BATCH_LIMIT) {
          console.log(`⚡️ Ghi một lô ${operationsInBatch} tài liệu...`);
          await batch.commit();
          batch = db.batch();
          operationsInBatch = 0;
        }
      } else {
        console.warn(`[⚠️ WARNING] User ID: ${userId} không có trường 'phone'. Bỏ qua.`);
      }
    }
  }

  if (operationsInBatch > 0) {
    console.log(`⚡️ Ghi lô cuối cùng gồm ${operationsInBatch} tài liệu...`);
    await batch.commit();
  }

  console.log('------------------------------------');
  console.log('✅ Quá trình di chuyển hoàn tất!');
  console.log(`   - Tổng số tài khoản đã kiểm tra: ${usersSnapshot.size}`);
  console.log(`   - Số tài liệu private đã tạo mới: ${missingCount}`);
  console.log('------------------------------------');
}

migratePrivateDetails().catch(error => {
  console.error("❌ Đã xảy ra lỗi nghiêm trọng:", error);
});