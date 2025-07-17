import React from 'react';

// Handle Electron IPC with error checking
let ipcRenderer;
try {
  ipcRenderer = window.require('electron').ipcRenderer;
} catch (error) {
  console.error('Electron IPC not available:', error);
  ipcRenderer = {
    invoke: async () => ({}),
    on: () => {},
    send: () => {}
  };
}

const TimerWidget = ({ 
  isTracking, 
  sessionTime, 
  totalTime, 
  onStart, 
  onStop, 
  formatTime 
}) => {

  const testPermissions = async () => {
    try {
      console.log('Testing permissions from UI...');
      const hasPermissions = await ipcRenderer.invoke('test-permissions');
      console.log('Permission test result from UI:', hasPermissions);
    } catch (error) {
      console.error('Error testing permissions:', error);
    }
  };

  return (
    <div className="timer-widget">
      <div className="timer-display">
        <div className="session-time">
          <label>Session Time</label>
          <div className="time-value session">
            {formatTime(sessionTime)}
          </div>
        </div>
        
        <div className="total-time">
          <label>Total Time Today</label>
          <div className="time-value total">
            {formatTime(totalTime)}
          </div>
        </div>
      </div>
      
      <div className="timer-controls">
        {!isTracking ? (
          <button 
            className="control-button start-btn"
            onClick={onStart}
          >
            ▶️ Start Tracking
          </button>
        ) : (
          <button 
            className="control-button stop-btn"
            onClick={onStop}
          >
            ⏸️ Stop Tracking
          </button>
        )}
        
        <button 
          className="control-button test-btn"
          onClick={testPermissions}
          style={{ 
            background: '#4a5568', 
            fontSize: '12px', 
            padding: '5px 10px',
            marginTop: '10px' 
          }}
        >
          🔍 Test Permissions
        </button>
      </div>
      
      <div className="status-indicator">
        <div className={`status-dot ${isTracking ? 'active' : 'inactive'}`}></div>
        <span className="status-text">
          {isTracking ? 'Tracking Active' : 'Tracking Stopped'}
        </span>
      </div>
      
      {isTracking && (
        <div className="tracking-info">
          <div className="info-item">
            <span className="info-label">📸 Screenshots:</span>
            <span className="info-value">Auto every 10min</span>
          </div>
          <div className="info-item">
            <span className="info-label">👁️ Activity:</span>
            <span className="info-value">Monitoring</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimerWidget;
