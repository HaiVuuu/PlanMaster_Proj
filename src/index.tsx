import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; 
import { Provider } from 'react-redux';
import { store } from './store/store';

// --- IMMEDIATE THEME APPLICATION ---
// Đoạn script này chạy trước khi React được mount, giúp chống "nháy" giao diện.
// Rất quan trọng để có trải nghiệm tốt, đặc biệt trên mobile.
try {
  const theme = localStorage.getItem('planmaster-theme');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    // Đảm bảo không có class 'dark' nếu theme là light hoặc chưa được set, hoặc có lỗi khi đọc localStorage
    document.documentElement.classList.remove('dark');
  }
} catch (e) {
  console.error("Could not apply theme from localStorage", e);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);