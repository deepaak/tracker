import React, { useState, useEffect } from 'react';
import Header from './Header';
import TimerWidget from './TimerWidget';
import AISearch from './AISearch';
import Settings from './Settings';
import Stats from './Stats';

// Handle Electron IPC with error checking
let ipcRenderer;
try {
  ipcRenderer = window.require('electron').ipcRenderer;
  console.log('Electron IPC available');
} catch (error) {
  console.error('Electron IPC not available:', error);
  // Fallback for testing in browser
  ipcRenderer = {
    invoke: async () => ({}),
    on: () => {},
    send: () => {}
  };
}

const App = () => {
  const [currentView, setCurrentView] = useState('timer');
  const [isTracking, setIsTracking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [stats, setStats] = useState({});

  useEffect(() => {
    // Listen for time updates from main process
    ipcRenderer.on('time-update', (event, data) => {
      setSessionTime(data.sessionTime);
      setTotalTime(data.totalTime);
      setIsTracking(data.isTracking);
    });

    // Listen for activity updates
    ipcRenderer.on('activity-update', (event, data) => {
      console.log('Activity update:', data);
    });

    // Listen for screenshot notifications
    ipcRenderer.on('screenshot-taken', (event, data) => {
      console.log('Screenshot taken:', data);
    });

    // Load initial stats
    loadStats();

    return () => {
      ipcRenderer.removeAllListeners('time-update');
      ipcRenderer.removeAllListeners('activity-update');
      ipcRenderer.removeAllListeners('screenshot-taken');
    };
  }, []);

  const loadStats = async () => {
    try {
      const statsData = await ipcRenderer.invoke('get-stats');
      setStats(statsData);
      setIsTracking(statsData.isTracking);
      setTotalTime(statsData.totalTime);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const startTracking = async () => {
    try {
      const success = await ipcRenderer.invoke('start-tracking');
      if (success) {
        setIsTracking(true);
        setSessionTime(0);
      }
    } catch (error) {
      console.error('Error starting tracking:', error);
    }
  };

  const stopTracking = async () => {
    try {
      const result = await ipcRenderer.invoke('stop-tracking');
      if (result) {
        setIsTracking(false);
        setSessionTime(0);
        setTotalTime(result.totalTime);
        await loadStats();
      }
    } catch (error) {
      console.error('Error stopping tracking:', error);
    }
  };

  const minimizeWindow = async () => {
    await ipcRenderer.invoke('minimize-window');
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const closeWindow = async () => {
    await ipcRenderer.invoke('close-window');
  };

  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderMinimizedBar = () => {
    return (
      <div className="minimized-bar">
        <div className="bar-content">
          <div className="timer-status">
            <div className={`status-indicator ${isTracking ? 'tracking' : 'stopped'}`}>
              <div className={`status-dot ${isTracking ? 'active' : 'inactive'}`}></div>
              <span className="status-text">
                {isTracking ? formatTime(sessionTime) : 'Stopped'}
              </span>
            </div>
          </div>
          
          <div className="bar-controls">
            {!isTracking ? (
              <button 
                className="mini-button start-btn"
                onClick={startTracking}
                title="Start Tracking"
              >
                ▶️
              </button>
            ) : (
              <button 
                className="mini-button stop-btn"
                onClick={stopTracking}
                title="Stop Tracking"
              >
                ⏸️
              </button>
            )}
            
            <button 
              className="mini-button expand-btn"
              onClick={toggleExpanded}
              title="Expand"
            >
              ⬆️
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'timer':
        return (
          <TimerWidget
            isTracking={isTracking}
            sessionTime={sessionTime}
            totalTime={totalTime}
            onStart={startTracking}
            onStop={stopTracking}
            formatTime={formatTime}
          />
        );
      case 'search':
        return <AISearch />;
      case 'settings':
        return <Settings />;
      case 'stats':
        return <Stats stats={stats} formatTime={formatTime} />;
      default:
        return (
          <TimerWidget
            isTracking={isTracking}
            sessionTime={sessionTime}
            totalTime={totalTime}
            onStart={startTracking}
            onStop={stopTracking}
            formatTime={formatTime}
          />
        );
    }
  };

  return (
    <div className={`app ${isExpanded ? 'expanded' : 'minimized'}`}>
      {!isExpanded ? (
        renderMinimizedBar()
      ) : (
        <>
          <Header
            currentView={currentView}
            onViewChange={setCurrentView}
            onMinimize={minimizeWindow}
            onClose={closeWindow}
            onCollapse={toggleExpanded}
          />
          <div className="app-content">
            {renderCurrentView()}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
