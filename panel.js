// panel.js - Main application logic

(() => {
  // State
  let recording = true;
  let rules = [];
  let capturedRequests = [];
  let filteredRequests = [];
  let settings = {};
  let ruleStats = {}; // Track matches per rule

  // Pagination
  let currentPage = 1;
  let pageSize = 25;
  let selectedRequestId = null;

  // UI Elements
  const recordBtn = document.getElementById("recordBtn");
  const clearBtn = document.getElementById("clearBtn");
  const exportBtn = document.getElementById("exportBtn");
  const rulesBtn = document.getElementById("rulesBtn");

  const rulesList = document.getElementById("rulesList");
  const rulesCount = document.getElementById("rulesCount");

  const searchInput = document.getElementById("searchInput");
  const ruleFilter = document.getElementById("ruleFilter");
  const methodFilter = document.getElementById("methodFilter");
  const statusFilter = document.getElementById("statusFilter");

  const pageSizeSelect = document.getElementById("pageSizeSelect");
  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageInfo = document.getElementById("pageInfo");
  const totalCount = document.getElementById("totalCount");

  const requestsList = document.getElementById("requestsList");
  const requestPreview = document.getElementById("requestPreview");
  const previewContent = document.getElementById("previewContent");
  const copyBtn = document.getElementById("copyBtn");

  // Modals
  const rulesModal = document.getElementById("rulesModal");
  const closeRulesModal = document.getElementById("closeRulesModal");
  const rulesManager = document.getElementById("rulesManager");
  const addRuleBtn = document.getElementById("addRuleBtn");
  const importRulesBtn = document.getElementById("importRulesBtn");
  const exportRulesBtn = document.getElementById("exportRulesBtn");
  const importFileInput = document.getElementById("importFileInput");

  const ruleEditorModal = document.getElementById("ruleEditorModal");
  const closeEditorModal = document.getElementById("closeEditorModal");
  const editorTitle = document.getElementById("editorTitle");
  const ruleForm = document.getElementById("ruleForm");
  const cancelRuleBtn = document.getElementById("cancelRuleBtn");

  let editingRuleId = null;

  // Initialize
  async function init() {
    settings = await Storage.getSettings();
    recording = settings.recording !== false;
    updateRecordButton();

    rules = await Storage.getRules();

    // Add default "Capture All" rule if no rules exist
    if (rules.length === 0) {
      await createDefaultCaptureAllRule();
      rules = await Storage.getRules();
    }

    initRuleStats();
    renderRules();
    renderRulesManager();
    updateRuleFilterDropdown();

    applyFilters();

    // Start listening to network requests
    startNetworkListener();
  }

  // Create default "Capture All" rule
  async function createDefaultCaptureAllRule() {
    const defaultRule = {
      id: Utils.uuid(),
      name: "🌐 Capture All Requests",
      enabled: false, // Disabled by default to avoid overwhelming users
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
      notes: "Default rule that captures all network requests. Enable to see everything happening on the page.",
    };

    await Storage.addRule(defaultRule);
  }

  // Initialize rule stats
  function initRuleStats() {
    ruleStats = {};
    rules.forEach((rule) => {
      ruleStats[rule.id] = { count: 0, matched: false };
    });
  }

  // Record/Pause
  function updateRecordButton() {
    recordBtn.textContent = recording ? "⏺ Record" : "⏸ Paused";
    recordBtn.classList.toggle("btn-primary", recording);
  }

  recordBtn.addEventListener("click", async () => {
    recording = !recording;
    settings.recording = recording;
    await Storage.saveSettings(settings);
    updateRecordButton();
  });

  // Clear
  clearBtn.addEventListener("click", () => {
    if (!confirm("Clear all captured requests?")) return;
    capturedRequests = [];
    filteredRequests = [];
    selectedRequestId = null;
    initRuleStats();
    currentPage = 1;
    renderRules();
    renderRequestsList();
    previewContent.textContent = "Select a request to view details";
  });

  // Export
  exportBtn.addEventListener("click", () => {
    if (filteredRequests.length === 0) {
      alert("No requests to export");
      return;
    }

    const exportData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      totalRequests: filteredRequests.length,
      requests: filteredRequests,
    };

    Utils.downloadJSON(exportData, `captured-requests-${Date.now()}.json`);
  });

  // Rules modal
  rulesBtn.addEventListener("click", () => {
    rulesModal.classList.add("active");
    renderRulesManager();
  });

  closeRulesModal.addEventListener("click", () => {
    rulesModal.classList.remove("active");
  });

  // Add rule
  addRuleBtn.addEventListener("click", () => {
    editingRuleId = null;
    editorTitle.textContent = "Add Rule";
    resetRuleForm();
    ruleEditorModal.classList.add("active");
  });

  // Import rules
  importRulesBtn.addEventListener("click", () => {
    importFileInput.click();
  });

  importFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const count = await Storage.importRules(event.target.result);
        alert(`Successfully imported ${count} rule(s)`);
        rules = await Storage.getRules();
        initRuleStats();
        renderRules();
        renderRulesManager();
        updateRuleFilterDropdown();
      } catch (error) {
        alert("Import failed: " + error.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  });

  // Export rules
  exportRulesBtn.addEventListener("click", () => {
    if (rules.length === 0) {
      alert("No rules to export");
      return;
    }
    Storage.exportRules(rules);
  });

  // Rule editor
  closeEditorModal.addEventListener("click", () => {
    ruleEditorModal.classList.remove("active");
  });

  cancelRuleBtn.addEventListener("click", () => {
    ruleEditorModal.classList.remove("active");
  });

  ruleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ruleData = {
      name: document.getElementById("ruleName").value.trim(),
      matchText: document.getElementById("matchText").value.trim(),
      matchField: document.getElementById("matchField").value,
      matchMethod: Array.from(document.querySelectorAll(".method-check:checked")).map((cb) => cb.value),
      matchDomain: document
        .getElementById("matchDomain")
        .value.split(",")
        .map((d) => d.trim())
        .filter((d) => d),
      capture: {
        queryParams: document.getElementById("captureQueryParams").checked,
        requestHeaders: document.getElementById("captureRequestHeaders").checked,
        requestBody: document.getElementById("captureRequestBody").checked,
        responseHeaders: document.getElementById("captureResponseHeaders").checked,
        responseBody: document.getElementById("captureResponseBody").checked,
        timing: document.getElementById("captureTiming").checked,
      },
      keepLastOnly: document.getElementById("keepLastOnly").checked,
      maxMatches: parseInt(document.getElementById("maxMatches").value) || null,
      notes: document.getElementById("ruleNotes").value.trim(),
    };

    if (editingRuleId) {
      await Storage.updateRule(editingRuleId, ruleData);
    } else {
      await Storage.addRule({ ...Storage.createDefaultRule(), ...ruleData });
    }

    rules = await Storage.getRules();
    initRuleStats();
    renderRules();
    renderRulesManager();
    updateRuleFilterDropdown();

    ruleEditorModal.classList.remove("active");
  });

  // Reset rule form
  function resetRuleForm() {
    ruleForm.reset();
    document.getElementById("captureQueryParams").checked = true;
    document.getElementById("captureRequestHeaders").checked = true;
    document.getElementById("captureRequestBody").checked = true;
    document.getElementById("captureResponseHeaders").checked = true;
    document.getElementById("captureResponseBody").checked = true;
    document.getElementById("captureTiming").checked = true;
  }

  // Load rule into form
  function loadRuleIntoForm(rule) {
    document.getElementById("ruleName").value = rule.name;
    document.getElementById("matchText").value = rule.matchText || "";
    document.getElementById("matchField").value = rule.matchField || "any";

    document.querySelectorAll(".method-check").forEach((cb) => {
      cb.checked = rule.matchMethod?.includes(cb.value) || false;
    });

    document.getElementById("matchDomain").value = rule.matchDomain?.join(", ") || "";

    document.getElementById("captureQueryParams").checked = rule.capture?.queryParams !== false;
    document.getElementById("captureRequestHeaders").checked = rule.capture?.requestHeaders !== false;
    document.getElementById("captureRequestBody").checked = rule.capture?.requestBody !== false;
    document.getElementById("captureResponseHeaders").checked = rule.capture?.responseHeaders !== false;
    document.getElementById("captureResponseBody").checked = rule.capture?.responseBody !== false;
    document.getElementById("captureTiming").checked = rule.capture?.timing !== false;

    document.getElementById("keepLastOnly").checked = rule.keepLastOnly || false;
    document.getElementById("maxMatches").value = rule.maxMatches || 0;
    document.getElementById("ruleNotes").value = rule.notes || "";
  }

  // Render rules panel
  function renderRules() {
    rulesCount.textContent = rules.filter((r) => r.enabled).length;

    if (rules.length === 0) {
      rulesList.innerHTML =
        '<div style="padding:16px;text-align:center;color:var(--text-muted);">No rules defined<br><small>Click "Rules" to add one</small></div>';
      return;
    }

    rulesList.innerHTML = "";

    rules.forEach((rule) => {
      const stats = ruleStats[rule.id] || { count: 0, matched: false };
      const status = stats.matched ? "✓" : "⏱";

      const item = document.createElement("div");
      item.className = "rule-item";
      if (!rule.enabled) item.classList.add("disabled");

      item.innerHTML = `
        <div class="rule-header">
          <span class="rule-status">${status}</span>
          <span class="rule-name">${Utils.truncate(rule.name, 20)}</span>
          ${stats.count > 0 ? `<span class="rule-count">${stats.count}</span>` : ""}
        </div>
        <div class="rule-details">
          ${rule.matchText ? `Match: "${Utils.truncate(rule.matchText, 25)}"` : "No text filter"}
          ${rule.matchDomain.length ? ` • ${rule.matchDomain[0]}` : ""}
        </div>
      `;

      item.addEventListener("click", () => {
        ruleFilter.value = rule.id;
        applyFilters();
      });

      rulesList.appendChild(item);
    });
  }

  // Render rules manager
  function renderRulesManager() {
    if (rules.length === 0) {
      rulesManager.innerHTML =
        '<div style="padding:20px;text-align:center;color:var(--text-muted);">No rules yet. Click "Add Rule" to create one.</div>';
      return;
    }

    rulesManager.innerHTML = "";

    rules.forEach((rule) => {
      const stats = ruleStats[rule.id] || { count: 0, matched: false };

      const card = document.createElement("div");
      card.className = "rule-card";

      card.innerHTML = `
        <div class="rule-card-header">
          <div class="rule-card-title">
            ${rule.enabled ? "✓" : "⏸"}
            ${rule.name}
            ${stats.count > 0 ? `<span class="badge">${stats.count} matches</span>` : ""}
          </div>
          <div class="rule-card-actions">
            <button class="toggle-rule">${rule.enabled ? "Disable" : "Enable"}</button>
            <button class="edit-rule">Edit</button>
            <button class="delete-rule">Delete</button>
          </div>
        </div>
        <div class="rule-card-body">
          ${rule.matchText ? `<div><strong>Match:</strong> "${rule.matchText}" in ${rule.matchField}</div>` : ""}
          ${rule.matchMethod.length ? `<div><strong>Methods:</strong> ${rule.matchMethod.join(", ")}</div>` : ""}
          ${rule.matchDomain.length ? `<div><strong>Domains:</strong> ${rule.matchDomain.join(", ")}</div>` : ""}
          ${rule.notes ? `<div><strong>Notes:</strong> ${rule.notes}</div>` : ""}
        </div>
      `;

      // Toggle
      card.querySelector(".toggle-rule").addEventListener("click", async () => {
        await Storage.toggleRule(rule.id);
        rules = await Storage.getRules();
        renderRules();
        renderRulesManager();
        updateRuleFilterDropdown();
      });

      // Edit
      card.querySelector(".edit-rule").addEventListener("click", () => {
        editingRuleId = rule.id;
        editorTitle.textContent = "Edit Rule";
        loadRuleIntoForm(rule);
        ruleEditorModal.classList.add("active");
      });

      // Delete
      card.querySelector(".delete-rule").addEventListener("click", async () => {
        if (!confirm(`Delete rule "${rule.name}"?`)) return;
        await Storage.deleteRule(rule.id);
        rules = await Storage.getRules();

        // Remove captured requests for this rule if keepLastOnly
        if (rule.keepLastOnly) {
          capturedRequests = capturedRequests.filter((req) => req.ruleId !== rule.id);
        }

        delete ruleStats[rule.id];
        renderRules();
        renderRulesManager();
        updateRuleFilterDropdown();
        applyFilters();
      });

      rulesManager.appendChild(card);
    });
  }

  // Update rule filter dropdown
  function updateRuleFilterDropdown() {
    const currentValue = ruleFilter.value;
    ruleFilter.innerHTML = '<option value="">All Rules</option>';

    rules.forEach((rule) => {
      const option = document.createElement("option");
      option.value = rule.id;
      option.textContent = rule.name;
      ruleFilter.appendChild(option);
    });

    ruleFilter.value = currentValue;
  }

  // Filters
  searchInput.addEventListener("input", applyFilters);
  ruleFilter.addEventListener("change", applyFilters);
  methodFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);

  function applyFilters() {
    const searchText = searchInput.value.toLowerCase().trim();
    const ruleId = ruleFilter.value;
    const method = methodFilter.value;
    const statusRange = statusFilter.value;

    filteredRequests = capturedRequests.filter((req) => {
      // Search text
      if (searchText && !req.url.toLowerCase().includes(searchText)) {
        return false;
      }

      // Rule filter
      if (ruleId && req.ruleId !== ruleId) {
        return false;
      }

      // Method filter
      if (method && req.method !== method) {
        return false;
      }

      // Status filter
      if (statusRange) {
        const status = req.status;
        if (statusRange === "2xx" && (status < 200 || status >= 300)) return false;
        if (statusRange === "3xx" && (status < 300 || status >= 400)) return false;
        if (statusRange === "4xx" && (status < 400 || status >= 500)) return false;
        if (statusRange === "5xx" && status < 500) return false;
      }

      return true;
    });

    currentPage = 1;
    renderRequestsList();
  }

  // Pagination
  pageSizeSelect.addEventListener("change", (e) => {
    pageSize = parseInt(e.target.value);
    currentPage = 1;
    renderRequestsList();
  });

  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderRequestsList();
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
    if (currentPage < totalPages) {
      currentPage++;
      renderRequestsList();
    }
  });

  // Render requests list
  function renderRequestsList() {
    const totalPages = Math.ceil(filteredRequests.length / pageSize) || 1;
    pageInfo.textContent = `Page ${currentPage} / ${totalPages}`;
    totalCount.textContent = `${filteredRequests.length} request${filteredRequests.length !== 1 ? "s" : ""}`;

    if (filteredRequests.length === 0) {
      requestsList.innerHTML =
        '<div style="padding:40px;text-align:center;color:var(--text-muted);">No requests captured yet<br><small>Network requests matching your rules will appear here</small></div>';
      return;
    }

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const pageRequests = filteredRequests.slice(start, end);

    requestsList.innerHTML = "";

    pageRequests.forEach((req) => {
      const row = document.createElement("div");
      row.className = "request-row";
      if (req.id === selectedRequestId) row.classList.add("active");

      const statusClass = getStatusClass(req.status);

      row.innerHTML = `
        <div class="request-main">
          <span class="method-badge method-${req.method}">${req.method}</span>
          <span class="request-url" title="${req.url}">${Utils.truncate(req.url, 70)}</span>
          <span class="status-badge ${statusClass}">${req.status || "-"}</span>
        </div>
        <div class="request-meta">
          <span>📋 ${req.ruleMatched}</span>
          <span>🔖 ${req.resourceType}</span>
          <span>🕐 ${Utils.formatTime(req.timestamp)}</span>
        </div>
      `;

      row.addEventListener("click", () => {
        selectedRequestId = req.id;
        renderRequestsList();
        showRequestPreview(req);
      });

      requestsList.appendChild(row);
    });
  }

  // Get status class
  function getStatusClass(status) {
    if (status >= 500) return "status-5xx";
    if (status >= 400) return "status-4xx";
    if (status >= 300) return "status-3xx";
    if (status >= 200) return "status-2xx";
    return "";
  }

  // Show request preview
  function showRequestPreview(request) {
    const preview = {
      id: request.id,
      timestamp: new Date(request.timestamp).toISOString(),
      rule: request.ruleMatched,
      url: request.url,
      method: request.method,
      status: request.status,
      resourceType: request.resourceType,
      fromCache: request.fromCache,
    };

    if (request.queryParams) preview.queryParams = request.queryParams;
    if (request.requestHeaders) preview.requestHeaders = request.requestHeaders;
    if (request.requestBody) preview.requestBody = request.requestBody;
    if (request.responseHeaders) preview.responseHeaders = request.responseHeaders;
    if (request.responseBody) preview.responseBody = request.responseBody;
    if (request.timing) preview.timing = request.timing;
    if (request.notes) preview.notes = request.notes;

    previewContent.textContent = Utils.prettyJSON(preview);
  }

  // Copy preview
  copyBtn.addEventListener("click", () => {
    if (previewContent.textContent && previewContent.textContent !== "Select a request to view details") {
      Utils.copyToClipboard(previewContent.textContent);

      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✓ Copied";
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    }
  });

  // Network listener
  function startNetworkListener() {
    chrome.devtools.network.onRequestFinished.addListener(async (chromeRequest) => {
      if (!recording) return;
      if (rules.length === 0) return;

      try {
        chromeRequest.getContent((responseBody, encoding) => {
          const rawRequest = {
            url: chromeRequest.request.url,
            method: chromeRequest.request.method,
            type:
              typeof chromeRequest.resourceType === "function"
                ? chromeRequest.resourceType()
                : chromeRequest._resourceType || "other",
            requestHeaders: chromeRequest.request.headers || [],
            requestBody: chromeRequest.request.postData?.text || "",
            responseHeaders: chromeRequest.response?.headers || [],
            responseBody: typeof responseBody === "string" ? responseBody : "",
            status: chromeRequest.response?.status || 0,
            fromCache: chromeRequest.response?.fromDiskCache || chromeRequest.response?.fromCache || false,
            initiator: chromeRequest.initiator?.type || "",
            timing: {
              startTime: chromeRequest.startedDateTime,
              duration: chromeRequest.time,
            },
          };

          // Match against all rules
          const matchedRules = Matcher.matchAllRules(rawRequest, rules);

          if (matchedRules.length === 0) return;

          // Process each matched rule
          matchedRules.forEach((rule) => {
            // Update stats
            if (!ruleStats[rule.id]) {
              ruleStats[rule.id] = { count: 0, matched: false };
            }
            ruleStats[rule.id].matched = true;
            ruleStats[rule.id].count++;

            // Check max matches
            if (rule.maxMatches && ruleStats[rule.id].count > rule.maxMatches) {
              return; // Skip if exceeded
            }

            // Capture request
            const captured = Matcher.captureRequest(rawRequest, rule, matchedRules);

            // Handle keepLastOnly
            if (rule.keepLastOnly) {
              capturedRequests = capturedRequests.filter((r) => r.ruleId !== rule.id);
            }

            capturedRequests.push(captured);

            // Limit total stored requests
            const maxStored = settings.maxStoredRequests || 1000;
            if (capturedRequests.length > maxStored) {
              capturedRequests = capturedRequests.slice(-maxStored);
            }
          });

          // Update UI
          renderRules();
          applyFilters();
        });
      } catch (error) {
        console.error("Failed to process request:", error);
      }
    });
  }

  // Initialize app
  init();
})();
