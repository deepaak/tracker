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
  console.log('App component mounting');
  const [currentView, setCurrentView] = useState('timer');
  const [isTracking, setIsTracking] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
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
    setIsMinimized(true);
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
    <div className="app">
      {console.log('App rendering with currentView:', currentView)}
      <div style={{color: 'white', background: 'red', padding: '10px'}}>
        DEBUG: App is rendering! Current view: {currentView}
      </div>
      <Header
        currentView={currentView}
        onViewChange={setCurrentView}
        onMinimize={minimizeWindow}
        onClose={closeWindow}
      />
      <div className="app-content">
        {renderCurrentView()}
      </div>
    </div>
  );
};

export default App;
