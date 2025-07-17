import React, { useState } from 'react';

const { ipcRenderer } = window.require('electron');

const AISearch = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('openai');
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');
    setResponse('');

    try {
      const result = await ipcRenderer.invoke('search-ai', {
        query: query.trim(),
        provider
      });
      
      setResponse(result);
    } catch (err) {
      setError(err.message || 'An error occurred during the search');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setQuery('');
    setResponse('');
    setError('');
  };

  return (
    <div className="ai-search">
      <div className="search-header">
        <h3>AI Search</h3>
        <p>Search using OpenAI or Anthropic APIs</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="provider-selection">
          <label>
            <input
              type="radio"
              value="openai"
              checked={provider === 'openai'}
              onChange={(e) => setProvider(e.target.value)}
            />
            OpenAI GPT
          </label>
          <label>
            <input
              type="radio"
              value="anthropic"
              checked={provider === 'anthropic'}
              onChange={(e) => setProvider(e.target.value)}
            />
            Anthropic Claude
          </label>
        </div>

        <div className="search-input-group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your question or search query..."
            className="search-input"
            rows={3}
            disabled={loading}
          />
          
          <div className="search-buttons">
            <button
              type="submit"
              className="search-btn"
              disabled={loading || !query.trim()}
            >
              {loading ? '🔄 Searching...' : '🔍 Search'}
            </button>
            
            {(response || error) && (
              <button
                type="button"
                className="clear-btn"
                onClick={clearResults}
                disabled={loading}
              >
                🗑️ Clear
              </button>
            )}
          </div>
        </div>
      </form>

      {error && (
        <div className="search-error">
          <h4>❌ Error</h4>
          <p>{error}</p>
          <small>
            Make sure your API keys are configured in Settings.
          </small>
        </div>
      )}

      {response && (
        <div className="search-results">
          <h4>✅ Response from {provider === 'openai' ? 'OpenAI' : 'Anthropic'}</h4>
          <div className="response-content">
            {response}
          </div>
        </div>
      )}

      {loading && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Searching with {provider === 'openai' ? 'OpenAI' : 'Anthropic'}...</p>
        </div>
      )}
    </div>
  );
};

export default AISearch;
