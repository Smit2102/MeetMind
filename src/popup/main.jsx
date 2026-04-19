import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Polyfill for local dev preview
if (typeof chrome === 'undefined' || !chrome.storage) {
  window.chrome = {
    storage: {
      local: { get: async () => ({}), set: async () => ({}), clear: () => {} },
      session: { get: async () => ({}), set: async () => ({}), remove: async () => ({}) },
    },
    runtime: {
      sendMessage: (msg, callback) => { if (callback) callback({}); }
    }
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
