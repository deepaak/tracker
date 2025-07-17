import React, { useState, useEffect } from 'react';

const { ipcRenderer } = window.require('electron');

const Settings = () => {
  const [settings, setSettings] = useState({
    openAIKey: '',
    anthropicKey: '',
    firstName: '',
    lastName: '',
    email: '',
    serverUrl: 'https://api.example.com',
    screenshotPath: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await ipcRenderer.invoke('get-settings');
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
    setSaved(false);
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      await ipcRenderer.invoke('save-settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const uploadData = async () => {
    setUploading(true);
    setUploadResult('');
    
    try {
      await ipcRenderer.invoke('upload-data');
      setUploadResult('✅ Data uploaded successfully!');
    } catch (error) {
      setUploadResult(`❌ Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
      setTimeout(() => setUploadResult(''), 5000);
    }
  };

  return (
    <div className="settings">
      <div className="settings-header">
        <h3>Settings</h3>
        <p>Configure your API keys and profile</p>
      </div>

      <form onSubmit={saveSettings} className="settings-form">
        <div className="settings-section">
          <h4>👤 Profile Information</h4>
          
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              value={settings.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value)}
              placeholder="Enter your first name"
            />
          </div>
          
          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              value={settings.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value)}
              placeholder="Enter your last name"
            />
          </div>
          
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={settings.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter your email"
            />
          </div>
        </div>

        <div className="settings-section">
          <h4>🔑 API Keys</h4>
          
          <div className="form-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              value={settings.openAIKey}
              onChange={(e) => handleInputChange('openAIKey', e.target.value)}
              placeholder="sk-..."
            />
            <small>Used for AI search with GPT models</small>
          </div>
          
          <div className="form-group">
            <label>Anthropic API Key</label>
            <input
              type="password"
              value={settings.anthropicKey}
              onChange={(e) => handleInputChange('anthropicKey', e.target.value)}
              placeholder="sk-ant-..."
            />
            <small>Used for AI search with Claude models</small>
          </div>
        </div>

        <div className="settings-section">
          <h4>🌐 Server Configuration</h4>
          
          <div className="form-group">
            <label>Server URL</label>
            <input
              type="url"
              value={settings.serverUrl}
              onChange={(e) => handleInputChange('serverUrl', e.target.value)}
              placeholder="https://api.example.com"
            />
            <small>URL for uploading tracking data</small>
          </div>
        </div>

        <div className="settings-section">
          <h4>📸 Screenshot Settings</h4>
          
          <div className="form-group">
            <label>Screenshot Save Path</label>
            <div className="path-input-group">
              <input
                type="text"
                value={settings.screenshotPath}
                onChange={(e) => handleInputChange('screenshotPath', e.target.value)}
                placeholder="Leave empty for default location"
              />
              <button
                type="button"
                className="browse-button"
                onClick={async () => {
                  try {
                    const path = await ipcRenderer.invoke('select-screenshot-path');
                    if (path) {
                      handleInputChange('screenshotPath', path);
                    }
                  } catch (error) {
                    console.error('Error selecting path:', error);
                  }
                }}
              >
                📁 Browse
              </button>
            </div>
            <small>Choose where screenshots will be saved. Default: Documents/TimeTracker/Screenshots</small>
          </div>
        </div>

        <div className="settings-actions">
          <button
            type="submit"
            className="save-btn"
            disabled={saving}
          >
            {saving ? '💾 Saving...' : '💾 Save Settings'}
          </button>
          
          {saved && (
            <span className="save-success">✅ Settings saved!</span>
          )}
        </div>
      </form>

      <div className="settings-section">
        <h4>📤 Data Upload</h4>
        <p>Upload your tracking data to the configured server</p>
        
        <button
          className="upload-btn"
          onClick={uploadData}
          disabled={uploading || !settings.serverUrl}
        >
          {uploading ? '📤 Uploading...' : '📤 Upload Data'}
        </button>
        
        {uploadResult && (
          <div className="upload-result">
            {uploadResult}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
