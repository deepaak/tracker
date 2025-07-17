// Test script to check screenshot storage and AI analysis
const { ipcRenderer } = window.require('electron');

async function testScreenshotAnalysis() {
  console.log('=== Testing Screenshot Analysis ===');
  
  try {
    // Test 1: Check if screenshots are stored
    console.log('1. Checking stored screenshots...');
    const stats = await ipcRenderer.invoke('get-stats');
    console.log('Screenshots in store:', stats.totalScreenshots);
    
    // Test 2: Check settings
    console.log('2. Checking settings...');
    const settings = await ipcRenderer.invoke('get-settings');
    console.log('Screenshot analysis enabled:', settings.enableScreenshotAnalysis);
    console.log('API keys configured:', {
      openai: !!settings.openAIKey,
      anthropic: !!settings.anthropicKey
    });
    
    // Test 3: Try AI search with a simple query
    if (settings.openAIKey || settings.anthropicKey) {
      console.log('3. Testing AI search...');
      const provider = settings.openAIKey ? 'openai' : 'anthropic';
      
      try {
        const response = await ipcRenderer.invoke('search-ai', {
          query: 'What am I working on?',
          provider: provider,
          model: 'gpt-4o'
        });
        console.log('AI Response:', response);
      } catch (error) {
        console.error('AI Search Error:', error);
      }
    } else {
      console.log('3. Skipping AI search - no API keys configured');
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

// Export for console use
window.testScreenshotAnalysis = testScreenshotAnalysis;

console.log('Screenshot analysis test loaded. Run testScreenshotAnalysis() to test.');
