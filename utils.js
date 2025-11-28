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
};
