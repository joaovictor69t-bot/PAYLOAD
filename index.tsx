import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initializeStorage } from './services/storage';

// Initialize admin seed if needed
initializeStorage();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);