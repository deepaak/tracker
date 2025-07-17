import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './components/App';
import './styles/global.css';

console.log('Index.js loading...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, mounting React app...');
  
  const container = document.getElementById('root');
  if (container) {
    console.log('Root container found, creating React root...');
    const root = createRoot(container);
    root.render(<App />);
    console.log('React app rendered successfully!');
  } else {
    console.error('Root container not found!');
  }
});

// Fallback for cases where DOMContentLoaded already fired
if (document.readyState === 'loading') {
  console.log('Document still loading, waiting for DOMContentLoaded...');
} else {
  console.log('Document already ready, mounting React app immediately...');
  const container = document.getElementById('root');
  if (container) {
    console.log('Root container found, creating React root...');
    const root = createRoot(container);
    root.render(<App />);
    console.log('React app rendered successfully!');
  } else {
    console.error('Root container not found!');
  }
}
