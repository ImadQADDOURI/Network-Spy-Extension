// matcher.js - Rule matching engine

const Matcher = {
  // Match a request against a rule
  matchRule(request, rule) {
    if (!rule.enabled) return false;

    // Check HTTP method
    if (rule.matchMethod && rule.matchMethod.length > 0) {
      if (!rule.matchMethod.includes(request.method)) {
        return false;
      }
    }

    // Check domain
    if (rule.matchDomain && rule.matchDomain.length > 0) {
      const domain = Utils.extractDomain(request.url);
      const matches = rule.matchDomain.some((d) => domain.includes(d.trim()));
      if (!matches) return false;
    }

    // Check match text
    if (rule.matchText && rule.matchText.trim()) {
      const searchText = rule.matchText.toLowerCase();
      let found = false;

      switch (rule.matchField) {
        case "url":
          found = request.url.toLowerCase().includes(searchText);
          break;

        case "header":
          found = this.searchInHeaders(request.requestHeaders, searchText);
          break;

        case "body":
          found = this.searchInBody(request.requestBody, searchText);
          break;

        case "queryParam":
          found = this.searchInQueryParams(request.url, searchText);
          break;

        case "any":
        default:
          found =
            request.url.toLowerCase().includes(searchText) ||
            this.searchInHeaders(request.requestHeaders, searchText) ||
            this.searchInBody(request.requestBody, searchText) ||
            this.searchInQueryParams(request.url, searchText);
          break;
      }

      if (!found) return false;
    }

    return true;
  },

  // Search in headers
  searchInHeaders(headers, searchText) {
    if (!headers) return false;
    const headersObj = Utils.headersToObject(headers);
    return Utils.deepSearch(headersObj, searchText);
  },

  // Search in body
  searchInBody(body, searchText) {
    if (!body) return false;
    if (typeof body === "string") {
      return body.toLowerCase().includes(searchText);
    }
    return Utils.deepSearch(body, searchText);
  },

  // Search in query params
  searchInQueryParams(url, searchText) {
    const params = Utils.parseQueryParams(url);
    return Utils.deepSearch(params, searchText);
  },

  // Match request against all rules
  matchAllRules(request, rules) {
    const matched = [];

    for (const rule of rules) {
      if (this.matchRule(request, rule)) {
        matched.push(rule);
      }
    }

    return matched;
  },

  // Build captured request object based on rule settings
  captureRequest(rawRequest, rule, matchedRules, config) {
    const captured = {
      id: Utils.uuid(),
      timestamp: Date.now(),

      // Always include basics
      url: rawRequest.url,
      method: rawRequest.method,
      status: rawRequest.status,
      resourceType: rawRequest.type,
      fromCache: rawRequest.fromCache || false,
      initiator: rawRequest.initiator || "",

      // Rule match info
      ruleMatched: rule.name,
      ruleId: rule.id,
      matchField: rule.matchField,
      allMatchedRules: matchedRules.map((r) => r.name),
    };

    // Capture fields based on rule settings
    if (rule.capture.queryParams) {
      captured.queryParams = Utils.parseQueryParams(rawRequest.url);
    }

    if (rule.capture.requestHeaders) {
      let headers = Utils.headersToObject(rawRequest.requestHeaders || []);
      // Apply header filtering
      if (rule.headerFiltering) {
        headers = Utils.filterHeaders(headers, rule.headerFiltering, config);
      }
      captured.requestHeaders = headers;
    }

    if (rule.capture.requestBody) {
      captured.requestBody = rawRequest.requestBody || "";
    }

    if (rule.capture.responseHeaders) {
      let headers = Utils.headersToObject(rawRequest.responseHeaders || []);
      // Apply header filtering
      if (rule.headerFiltering) {
        headers = Utils.filterHeaders(headers, rule.headerFiltering, config);
      }
      captured.responseHeaders = headers;
    }

    if (rule.capture.responseBody) {
      let body = rawRequest.responseBody || "";
      // Apply size limit
      if (rule.maxResponseSize) {
        body = Utils.truncateBySize(body, rule.maxResponseSize);
      }
      captured.responseBody = body;
      captured.responseSize = typeof body === "string" ? body.length : JSON.stringify(body).length;
    }

    if (rule.capture.timing) {
      captured.timing = {
        startTime: rawRequest.timing?.startTime || 0,
        duration: rawRequest.timing?.duration || 0,
      };
    }

    if (rule.notes) {
      captured.notes = rule.notes;
    }

    return captured;
  },
};
