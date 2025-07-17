import React from 'react';

const Stats = ({ stats, formatTime }) => {
  const {
    totalTime = 0,
    sessionsCount = 0,
    screenshotsCount = 0,
    isTracking = false,
    lastSession = null
  } = stats;

  return (
    <div className="stats">
      <div className="stats-header">
        <h3>📊 Statistics</h3>
        <p>Track your productivity metrics</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card total-time">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatTime(totalTime)}</div>
            <div className="stat-label">Total Time Tracked</div>
          </div>
        </div>

        <div className="stat-card sessions">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-value">{sessionsCount}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        <div className="stat-card screenshots">
          <div className="stat-icon">📸</div>
          <div className="stat-content">
            <div className="stat-value">{screenshotsCount}</div>
            <div className="stat-label">Screenshots Taken</div>
          </div>
        </div>

        <div className="stat-card status">
          <div className="stat-icon">{isTracking ? '🟢' : '🔴'}</div>
          <div className="stat-content">
            <div className="stat-value">{isTracking ? 'Active' : 'Inactive'}</div>
            <div className="stat-label">Current Status</div>
          </div>
        </div>
      </div>

      {lastSession && (
        <div className="last-session">
          <h4>🕐 Last Session</h4>
          <div className="session-details">
            <div className="session-item">
              <span className="session-label">Start Time:</span>
              <span className="session-value">
                {new Date(lastSession.startTime).toLocaleString()}
              </span>
            </div>
            <div className="session-item">
              <span className="session-label">End Time:</span>
              <span className="session-value">
                {new Date(lastSession.endTime).toLocaleString()}
              </span>
            </div>
            <div className="session-item">
              <span className="session-label">Duration:</span>
              <span className="session-value">
                {formatTime(lastSession.duration)}
              </span>
            </div>
            <div className="session-item">
              <span className="session-label">Screenshots:</span>
              <span className="session-value">
                {lastSession.screenshots ? lastSession.screenshots.length : 0}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="productivity-insights">
        <h4>💡 Insights</h4>
        <div className="insights-list">
          {totalTime > 0 && sessionsCount > 0 && (
            <div className="insight-item">
              <span className="insight-icon">📈</span>
              <span className="insight-text">
                Average session: {formatTime(totalTime / sessionsCount)}
              </span>
            </div>
          )}
          
          {screenshotsCount > 0 && totalTime > 0 && (
            <div className="insight-item">
              <span className="insight-icon">📷</span>
              <span className="insight-text">
                {Math.round(screenshotsCount / (totalTime / (1000 * 60 * 60)) * 10) / 10} screenshots per hour
              </span>
            </div>
          )}
          
          <div className="insight-item">
            <span className="insight-icon">🎯</span>
            <span className="insight-text">
              {isTracking ? 'Currently tracking your activity' : 'Ready to start tracking'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
