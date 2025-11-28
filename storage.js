// storage.js - Storage management for rules and settings

const Storage = {
  // Get all rules
  async getRules() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["rules"], (data) => {
        resolve(data.rules || []);
      });
    });
  },

  // Save rules
  async saveRules(rules) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ rules }, () => {
        resolve();
      });
    });
  },

  // Add rule
  async addRule(rule) {
    const rules = await this.getRules();
    rule.id = rule.id || Utils.uuid();
    rules.push(rule);
    await this.saveRules(rules);
    return rule;
  },

  // Update rule
  async updateRule(ruleId, updates) {
    const rules = await this.getRules();
    const index = rules.findIndex((r) => r.id === ruleId);
    if (index !== -1) {
      rules[index] = { ...rules[index], ...updates };
      await this.saveRules(rules);
      return rules[index];
    }
    return null;
  },

  // Delete rule
  async deleteRule(ruleId) {
    const rules = await this.getRules();
    const filtered = rules.filter((r) => r.id !== ruleId);
    await this.saveRules(filtered);
  },

  // Toggle rule enabled status
  async toggleRule(ruleId) {
    const rules = await this.getRules();
    const rule = rules.find((r) => r.id === ruleId);
    if (rule) {
      rule.enabled = !rule.enabled;
      await this.saveRules(rules);
      return rule;
    }
    return null;
  },

  // Get settings
  async getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(["settings"], (data) => {
        resolve(
          data.settings || {
            recording: true,
            captureQueryParams: true,
            captureRequestHeaders: true,
            captureRequestBody: true,
            captureResponseHeaders: true,
            captureResponseBody: true,
            captureTiming: true,
            maxStoredRequests: 1000,
          }
        );
      });
    });
  },

  // Save settings
  async saveSettings(settings) {
    return new Promise((resolve) => {
      chrome.storage.sync.set({ settings }, () => {
        resolve();
      });
    });
  },

  // Create default rule
  createDefaultRule(overrides = {}) {
    return {
      id: Utils.uuid(),
      name: "New Rule",
      enabled: true,
      matchText: "",
      matchField: "any",
      matchMethod: [],
      matchDomain: [],
      capture: {
        queryParams: true,
        requestHeaders: true,
        requestBody: true,
        responseHeaders: true,
        responseBody: true,
        timing: true,
      },
      keepLastOnly: false,
      maxMatches: null,
      notes: "",
      ...overrides,
    };
  },

  // Export rules to JSON
  exportRules(rules) {
    const exportData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      rules: rules,
    };
    Utils.downloadJSON(exportData, `request-capture-rules-${Date.now()}.json`);
  },

  // Import rules from JSON
  async importRules(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (!data.rules || !Array.isArray(data.rules)) {
        throw new Error("Invalid rules format");
      }

      // Validate and assign new IDs to avoid conflicts
      const importedRules = data.rules.map((rule) => ({
        ...this.createDefaultRule(),
        ...rule,
        id: Utils.uuid(), // New ID to avoid conflicts
      }));

      const existingRules = await this.getRules();
      const mergedRules = [...existingRules, ...importedRules];
      await this.saveRules(mergedRules);

      return importedRules.length;
    } catch (error) {
      throw new Error("Failed to import rules: " + error.message);
    }
  },
};
