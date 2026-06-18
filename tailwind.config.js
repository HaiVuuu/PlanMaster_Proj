/** @type {import('tailwindcss').Config} */
export default {
  // Thêm dòng này để kích hoạt dark mode dựa trên class 'dark' trên thẻ <html>
  darkMode: 'class', 
  content: [
    "./index.html",
    // Cấu hình này sẽ quét tất cả các file cần thiết bên trong thư mục `src`.
    // Nó đơn giản, an toàn và dễ bảo trì hơn.
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  // Xóa bỏ key 'plugins' bị trùng lặp và chỉ giữ lại một khai báo đúng.
  plugins: [
    require('@tailwindcss/forms'), // Plugin này rất hữu ích cho việc tạo kiểu form
    require('tailwindcss-animate'), // Plugin cho các animation tiện ích
  ],
}