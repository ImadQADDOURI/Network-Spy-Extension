// utils.js - Utility functions

const Utils = {
  // Generate UUID
  uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  // Format timestamp
  formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  },

  // Format date
  formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US");
  },

  // Truncate string
  truncate(str, maxLen = 80) {
    if (!str || str.length <= maxLen) return str;
    return str.slice(0, maxLen) + "…";
  },

  // Extract domain from URL
  extractDomain(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return "";
    }
  },

  // Parse query params from URL
  parseQueryParams(url) {
    try {
      const urlObj = new URL(url);
      const params = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return params;
    } catch {
      return {};
    }
  },

  // Convert headers array to object
  headersToObject(headersArray) {
    if (!Array.isArray(headersArray)) return {};
    const obj = {};
    headersArray.forEach((h) => {
      if (h.name && h.value !== undefined) {
        obj[h.name] = h.value;
      }
    });
    return obj;
  },

  // Check if domain matches
  domainMatches(url, domains) {
    if (!domains || domains.length === 0) return true;
    const urlDomain = this.extractDomain(url);
    return domains.some((d) => urlDomain.includes(d.trim()));
  },

  // Deep search in object/string
  deepSearch(obj, searchText) {
    if (!searchText) return false;
    searchText = searchText.toLowerCase();

    const search = (val) => {
      if (typeof val === "string") {
        return val.toLowerCase().includes(searchText);
      }
      if (typeof val === "object" && val !== null) {
        return Object.values(val).some((v) => search(v));
      }
      return false;
    };

    return search(obj);
  },

  // Format bytes
  formatBytes(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  },

  // Copy to clipboard
  copyToClipboard(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  },

  // Download as JSON file
  downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  // Pretty print JSON
  prettyJSON(obj) {
    return JSON.stringify(obj, null, 2);
  },

  // Safely parse JSON
  safeJSONParse(str) {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  },

  // Format JSON with syntax highlighting (simple)
  formatJSON(obj) {
    const json = JSON.stringify(obj, null, 2);
    return json
      .replace(/(".*?"):/g, '<span class="json-key">$1</span>:')
      .replace(/: (".*?")/g, ': <span class="json-string">$1</span>')
      .replace(/: (\d+)/g, ': <span class="json-number">$1</span>')
      .replace(/: (true|false)/g, ': <span class="json-boolean">$1</span>')
      .replace(/: (null)/g, ': <span class="json-null">$1</span>');
  },

  // Try to parse and format response body
  tryFormatResponse(body) {
    if (!body) return { formatted: false, content: "" };

    // Try JSON
    const json = this.safeJSONParse(body);
    if (json) {
      return { formatted: true, type: "json", content: json };
    }

    // Return as-is
    return { formatted: false, content: body };
  },

  // Generate cURL command
  generateCurl(request) {
    let curl = `curl '${request.url}'`;

    // Add method
    if (request.method && request.method !== "GET") {
      curl += ` -X ${request.method}`;
    }

    // Add headers
    if (request.requestHeaders) {
      Object.entries(request.requestHeaders).forEach(([key, value]) => {
        // Skip pseudo-headers
        if (key.startsWith(":")) return;
        curl += ` \\\n  -H '${key}: ${value}'`;
      });
    }

    // Add body
    if (request.requestBody) {
      const body = typeof request.requestBody === "string" ? request.requestBody : JSON.stringify(request.requestBody);
      curl += ` \\\n  --data-raw '${body.replace(/'/g, "\\'")}'`;
    }

    return curl;
  },

  // Filter headers based on rule settings
  filterHeaders(headers, filterSettings, config) {
    if (!headers || !filterSettings) return headers;

    // If no filtering mode, return all headers
    if (!filterSettings.mode || filterSettings.mode === "none") {
      return headers;
    }

    let filtered = { ...headers };

    // Include mode (whitelist)
    if (filterSettings.mode === "include") {
      if (filterSettings.includeHeadersCustom && filterSettings.includeHeadersCustom.length > 0) {
        const include = filterSettings.includeHeadersCustom.map((h) => h.toLowerCase());
        filtered = Object.keys(filtered).reduce((acc, key) => {
          if (include.includes(key.toLowerCase())) {
            acc[key] = filtered[key];
          }
          return acc;
        }, {});
      }
      return filtered;
    }

    // Exclude mode (blacklist)
    if (filterSettings.mode === "exclude") {
      // Exclude HTTP/2 pseudo-headers
      if (filterSettings.excludePseudoHeaders) {
        Object.keys(filtered).forEach((key) => {
          if (key.startsWith(":")) delete filtered[key];
        });
      }

      // Exclude common headers
      if (filterSettings.excludeCommonHeaders && config?.headerPresets?.common) {
        config.headerPresets.common.forEach((header) => {
          delete filtered[header];
          delete filtered[header.toLowerCase()];
        });
      }

      // Exclude security headers
      if (filterSettings.excludeSecurityHeaders && config?.headerPresets?.security) {
        config.headerPresets.security.forEach((header) => {
          delete filtered[header];
          delete filtered[header.toLowerCase()];
        });
      }

      // Exclude cache headers
      if (filterSettings.excludeCacheHeaders && config?.headerPresets?.cache) {
        config.headerPresets.cache.forEach((header) => {
          delete filtered[header];
          delete filtered[header.toLowerCase()];
        });
      }

      // Exclude cookies
      if (filterSettings.excludeCookies) {
        delete filtered["cookie"];
        delete filtered["Cookie"];
        delete filtered["set-cookie"];
        delete filtered["Set-Cookie"];
      }

      // Exclude custom headers
      if (filterSettings.excludeHeadersCustom && filterSettings.excludeHeadersCustom.length > 0) {
        filterSettings.excludeHeadersCustom.forEach((header) => {
          delete filtered[header];
          delete filtered[header.toLowerCase()];
        });
      }
    }

    return filtered;
  },

  // Truncate response body by size
  truncateBySize(content, maxSizeKB) {
    if (!maxSizeKB || maxSizeKB === 0) return content;

    const maxBytes = maxSizeKB * 1024;
    const contentStr = typeof content === "string" ? content : JSON.stringify(content);

    if (contentStr.length <= maxBytes) return content;

    return contentStr.slice(0, maxBytes) + "\n\n[... truncated at " + maxSizeKB + "KB limit]";
  },
};
