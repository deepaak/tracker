# Screenshot Analysis Feature Testing

## Debugging Steps

**If the feature is not working, follow these debugging steps:**

### 1. Check Console Output
Open Developer Tools (F12 or Cmd+Option+I) and look for:
- "AI Search started with query: [your query]"
- "Screenshot analysis enabled: true/false"
- "Screenshots for analysis: [number]"
- "Total screenshots in store: [number]"

### 2. Browser Console Test
Run this in the browser console to test:

```javascript
// Check if screenshots are stored
window.require('electron').ipcRenderer.invoke('get-stats').then(stats => {
  console.log('Screenshots stored:', stats.totalScreenshots);
});

// Test AI search (replace with your API key first)
window.require('electron').ipcRenderer.invoke('search-ai', {
  query: 'What am I working on?',
  provider: 'openai',  // or 'anthropic'
  model: 'gpt-4o'
}).then(response => {
  console.log('AI Response:', response);
}).catch(error => {
  console.error('Error:', error);
});
```

### 3. Common Issues and Solutions

**Issue: "Screenshots for analysis: 0"**
- Solution: Start tracking first, wait for screenshots to be taken
- Check: Go to Settings > verify screenshot path exists
- Check: Screenshots files exist in the directory

**Issue: "OpenAI API key not configured"**
- Solution: Go to Settings > add your OpenAI or Anthropic API key
- Test: Make sure the key is saved (refresh and check if it's still there)

**Issue: "Error converting image to base64"**
- Solution: Screenshot files might be corrupted or in wrong format
- Check: Screenshots should be .png files
- Fix: Take new screenshots by starting/stopping tracking

**Issue: API errors with vision models**
- Solution: Make sure you're using vision-capable models:
  - OpenAI: gpt-4o (not gpt-4 or gpt-3.5)
  - Anthropic: claude-3-5-sonnet-20241022 (supports vision)

### 4. Manual Testing Steps

1. **Start Fresh**
   ```bash
   npm run dev
   ```

2. **Configure API Key**
   - Go to Settings tab
   - Add OpenAI API key (starts with sk-...)
   - Make sure "Enable AI Screenshot Analysis" is checked
   - Click Save Settings

3. **Generate Screenshots**
   - Click "Start Tracking" 
   - Wait 10-20 seconds for screenshots to be taken
   - Check console for "Screenshot taken:" messages

4. **Test AI Search**
   - Go to AI Search tab  
   - Select "OpenAI GPT-4o" from dropdown
   - Type: "What am I working on?"
   - Click Search
   - Check console for debugging output

### 5. Expected Console Output

When working correctly, you should see:
```
AI Search started with query: What am I working on?
Provider: openai Model: gpt-4o
Screenshot analysis enabled: true
Total screenshots in store: 5
Recent screenshots before filtering: 3
Screenshot /path/to/screenshot1.png exists: true
Screenshot /path/to/screenshot2.png exists: true  
Screenshot /path/to/screenshot3.png exists: true
Existing screenshots for analysis: 3
Screenshots for analysis: 3
```

### 6. Reset if Needed

If all else fails, reset the app data:
```bash
# Stop the app first, then:
rm -rf ~/Library/Application\ Support/timetracker-desktop/
npm run dev
```

This will clear all stored data and you can start fresh.
