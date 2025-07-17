import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/global.css';

console.log('ReactApp.js loading...');

const container = document.getElementById('root');
if (container) {
  console.log('Root container found in reactApp.js, creating React root');
  
  // Clear any existing content
  container.innerHTML = '';
  
  const root = createRoot(container);
  root.render(<App />);
  console.log('React app rendered');
} else {
  console.error('Root container not found in reactApp.js!');
}
