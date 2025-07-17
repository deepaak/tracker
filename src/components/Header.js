import React from 'react';

const Header = ({ currentView, onViewChange, onMinimize, onClose }) => {
  const navItems = [
    { id: 'timer', label: '⏱️', title: 'Timer' },
    { id: 'search', label: '🔍', title: 'AI Search' },
    { id: 'stats', label: '📊', title: 'Statistics' },
    { id: 'settings', label: '⚙️', title: 'Settings' }
  ];

  return (
    <div className="header">
      <div className="header-drag-area">
        <div className="app-title">Time Tracker</div>
      </div>
      
      <div className="header-controls">
        <button 
          className="control-btn minimize-btn"
          onClick={onMinimize}
          title="Minimize"
        >
          ➖
        </button>
        <button 
          className="control-btn close-btn"
          onClick={onClose}
          title="Hide to tray"
        >
          ✕
        </button>
      </div>
      
      <nav className="nav-tabs">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-tab ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onViewChange(item.id)}
            title={item.title}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Header;
