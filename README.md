# Universal Request Capture Chrome Extension

A powerful Chrome DevTools extension for capturing and analyzing network requests with rule-based filtering. Perfect for debugging, API monitoring, and capturing specific requests like Facebook Ads GraphQL queries.

## 🎯 Features

### Rule-Based Capture

- **Flexible Matching**: Match requests by text, URL, headers, body, query parameters, or any field
- **Multi-Rule Support**: Multiple rules run simultaneously
- **Method Filtering**: Filter by HTTP methods (GET, POST, PUT, DELETE, PATCH)
- **Domain Filtering**: Target specific domains or all domains
- **Smart Capture**: Choose exactly what to capture per rule (headers, body, timing, etc.)
- **Advanced Header Filtering**: Three modes - No filtering, Exclude mode, Include mode
  - Exclude HTTP/2 pseudo-headers, common browser headers, security headers, cache headers, cookies
  - Custom include/exclude lists
  - Configurable presets via global config

### Real-Time Dashboard

- **Live Status**: See which rules are active and matched
- **Match Counter**: Track total matches per rule
- **Visual Indicators**: ✓ for matched rules, ⏱ for waiting

### Request Management

- **Pagination**: Handle thousands of requests with configurable page sizes
- **Advanced Filtering**: Search, filter by rule, method, or status code
- **Collapsible Preview**: View request details in organized, collapsible sections
- **Multiple View Modes**: Collapsible (organized sections), Formatted (syntax highlighting), Raw (plain JSON)
- **Quick Actions**:
  - 📊 Format - Cycle through view modes
  - 🔄 cURL - Copy request as cURL command
  - 📋 Copy - Copy full request JSON
- **Response Metadata**: Size, duration, cache status displayed prominently
- **Export**: Export filtered requests or all rules as JSON

### Global Configuration

- **Default Rule Values**: Set default max response size and header filter mode for new rules
- **Header Presets**: Customize which headers are considered "common", "security", "cache"
- **Performance Settings**: Configure max stored requests
- **Easy Reset**: Reset to defaults anytime

### Performance

- **Record/Pause**: Control when to capture (like Chrome DevTools)
- **Memory Management**: Automatic limiting of stored requests
- **Keep Last Only**: Option to keep only the most recent match per rule
- **Max Matches**: Set limits per rule to prevent memory issues
- **Response Size Limits**: Truncate large responses automatically

## 📋 Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. Open DevTools on any page
7. Click the "Request Capture" panel

## 🎮 Usage

### Creating Rules

1. Click the **⚙ Rules** button
2. Click **+ Add Rule**
3. Configure your rule:
   - **Rule Name**: Descriptive name (e.g., "Facebook GraphQL")
   - **Match Text**: Text to search for (e.g., "GraphQLQuery")
   - **Match Field**: Where to search (any, url, header, body, queryParam)
   - **HTTP Methods**: Leave empty for all or select specific methods
   - **Domains**: Comma-separated list (e.g., "facebook.com, graph.facebook.com")
4. Configure capture settings (what data to save)
5. Optionally set max matches or keep last only
6. Click **Save Rule**

### Example: Capture Facebook Ads Requests

**Simple approach - Include mode:**

```json
{
  "name": "Facebook Ads GraphQL",
  "matchText": "x-fb-friendly-name",
  "matchField": "header",
  "matchDomain": ["facebook.com"],
  "headerFiltering": {
    "mode": "include",
    "includeHeadersCustom": ["x-fb-friendly-name", "authorization", "content-type"]
  },
  "maxResponseSize": 500,
  "capture": {
    "requestHeaders": true,
    "requestBody": true,
    "responseBody": true
  }
}
```

**Advanced approach - Exclude mode:**

```json
{
  "name": "Facebook Clean Capture",
  "matchText": "GraphQL",
  "matchField": "url",
  "matchDomain": ["facebook.com"],
  "headerFiltering": {
    "mode": "exclude",
    "excludePseudoHeaders": true,
    "excludeCommonHeaders": true,
    "excludeSecurityHeaders": true,
    "excludeCookies": true
  }
}
```

### Filtering Captured Requests

Use the filter bar to narrow down captured requests:

- **Search**: Filter by URL text
- **Rule**: Show only requests from specific rule
- **Method**: Filter by HTTP method
- **Status**: Filter by status code range (2xx, 3xx, 4xx, 5xx)

### Exporting Data

**Export Requests**:

1. Apply filters to select desired requests
2. Click **⬇ Export**
3. Save JSON file with all filtered requests

**Export Rules**:

1. Open Rules Manager
2. Click **📤 Export**
3. Save rules configuration for backup or sharing

**Import Rules**:

1. Open Rules Manager
2. Click **📥 Import**
3. Select a rules JSON file

## 📁 File Structure

```
/extension
  ├── manifest.json          # Extension configuration
  ├── devtools.html          # DevTools entry point
  ├── devtools.js            # Panel registration
  ├── panel.html             # Main UI
  ├── panel.css              # Styles
  ├── panel.js               # Main application logic
  ├── utils.js               # Utility functions
  ├── storage.js             # Storage management
  ├── matcher.js             # Rule matching engine
  └── README.md              # This file
```

## 🔧 Rule Schema

```javascript
{
  "id": "uuid",
  "name": "Rule Name",
  "enabled": true,

  // Matching criteria
  "matchText": "search term",
  "matchField": "any|url|header|body|queryParam",
  "matchMethod": ["GET", "POST"],  // empty = all
  "matchDomain": ["example.com"],  // empty = all

  // Capture settings
  "capture": {
    "queryParams": true,
    "requestHeaders": true,
    "requestBody": true,
    "responseHeaders": true,
    "responseBody": true,
    "timing": true
  },

  // Limits
  "keepLastOnly": false,
  "maxMatches": null,  // null = unlimited

  "notes": "Optional description"
}
```

## 📦 Captured Request Schema

```javascript
{
  "id": "uuid",
  "timestamp": 1234567890,

  // Request details
  "url": "https://...",
  "method": "POST",
  "queryParams": {},
  "requestHeaders": {},
  "requestBody": "",

  // Response details
  "responseHeaders": {},
  "responseBody": "",
  "status": 200,

  // Metadata
  "resourceType": "xhr",
  "fromCache": false,
  "initiator": "",
  "timing": {},

  // Rule info
  "ruleMatched": "Rule Name",
  "ruleId": "uuid",
  "matchField": "any",
  "allMatchedRules": ["Rule 1", "Rule 2"],
  "notes": ""
}
```

## 🎨 Supported Request Types

- XHR
- Fetch
- Document
- Script
- Stylesheet
- Image
- Font
- WebSocket (handshake)
- EventSource (SSE)
- Beacon
- Ping
- Manifest
- Other

## 💡 Tips & Best Practices

1. **Start Broad**: Begin with simple rules and refine as needed
2. **Use Domain Filtering**: Improve performance by targeting specific domains
3. **Capture What You Need**: Disable unnecessary capture fields to save memory
4. **Export Regularly**: Back up your rules configuration
5. **Monitor Memory**: Use "Keep Last Only" for high-traffic rules
6. **Organize Rules**: Use descriptive names and notes for easy management

## ⚠️ Limitations

- WebSocket frame data is not captured (only the initial handshake)
- Very large response bodies may be truncated by Chrome
- Binary content is not fully supported
- Runs only when DevTools is open

## 🐛 Troubleshooting

**No requests captured?**

- Ensure recording is active (⏺ Record button)
- Check that rules are enabled
- Verify match criteria (try broad matching first)
- Ensure DevTools is open

**Extension not showing?**

- Refresh the extensions page
- Reload the extension
- Check console for errors

**Performance issues?**

- Reduce max stored requests in settings
- Enable "Keep Last Only" for high-traffic rules
- Clear captured requests periodically

## 🔒 Privacy

This extension:

- Runs locally in your browser
- Does not send data to external servers
- Stores rules in Chrome sync storage
- Only captures requests while DevTools is open

## 📄 License

MIT License - Feel free to use, modify, and distribute.

## 🤝 Contributing

Contributions welcome! Feel free to submit issues or pull requests.

## 🙏 Credits

Built with Chrome DevTools Network API and modern web technologies.
