/**
 * College Scorecard API client with hardening features
 * @version 2.6.5
 * @author College Tools
 * @description Hardened API client with retry logic, caching, and an execution-time guard
 */

/**
 * CollegeTools.Scorecard - Hardened API client module
 * Features: exponential backoff, caching, execution-time guard
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Scorecard = (function() {
  'use strict';

  // Tracks when the current fill/search operation started so long-running
  // batches stop before hitting the Apps Script execution limit. A family
  // fills 20-60 rows against an API allowing 1,000 requests/hour, so no
  // daily quota accounting is needed here -- the batch loop in colleges.js
  // already stops itself well before Apps Script's own execution ceiling.
  var executionState = {
    startTime: null,
  };

  /**
   * Checks if we're approaching execution time limits
   * @param {Object=} options - Optional shared execution options
   * @returns {boolean} True if we should continue, false if approaching limit
   * @private
   */
  function checkExecutionTimeLimit(options) {
    options = options || {};
    if (options.executionBudget) return options.executionBudget.canContinue();

    if (!executionState.startTime) {
      executionState.startTime = new Date().getTime();
      return true;
    }

    var elapsed = new Date().getTime() - executionState.startTime;
    return elapsed < CollegeTools.Config.API_CONFIG.EXECUTION_TIME_LIMIT;
  }

  /**
   * Builds a URL for the College Scorecard API with given parameters
   * @param {Object} params - Query parameters for the API
   * @returns {string} Complete API URL
   * @private
   */
  function buildUrl(params) {
    var base = CollegeTools.Config.API_CONFIG.BASE_URL;
    var arr = [];
    for (var k in params) {
      if (params.hasOwnProperty(k)) {
        arr.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return base + '?' + arr.join('&');
  }

  /**
   * Generates a cache key for API requests
   * @param {string} url - The API URL
   * @returns {string} Cache key
   * @private
   */
  function getCacheKey(url) {
    // Use URL hash for cache key, truncated for Apps Script limits
    return 'scorecard_' + Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, url))
      .replace(/[^a-zA-Z0-9]/g, '').substring(0, 200);
  }

  /**
   * Gets cached data if available and not expired
   * @param {string} cacheKey - Cache key to look up
   * @returns {Object|null} Cached data or null if not found/expired
   * @private
   */
  function getCachedData(cacheKey) {
    try {
      var cache = CacheService.getScriptCache();
      var cached = cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // Cache miss or error, continue with API call
    }
    return null;
  }

  /**
   * Stores data in cache
   * @param {string} cacheKey - Cache key
   * @param {Object} data - Data to cache
   * @private
   */
  function setCachedData(cacheKey, data) {
    try {
      var cache = CacheService.getScriptCache();
      cache.put(cacheKey, JSON.stringify(data), CollegeTools.Config.API_CONFIG.CACHE_DURATION);
      // Register the key so clearCache() can remove it explicitly
      var props = PropertiesService.getScriptProperties();
      var registry = props.getProperty('scorecard_cache_keys');
      var keys = registry ? JSON.parse(registry) : [];
      if (keys.indexOf(cacheKey) === -1) {
        keys.push(cacheKey);
        props.setProperty('scorecard_cache_keys', JSON.stringify(keys));
      }
    } catch (e) {
      // Cache storage failed, continue without caching
    }
  }

  /**
   * Calculates delay for exponential backoff
   * @param {number} attempt - Current attempt number (0-based)
   * @returns {number} Delay in milliseconds
   * @private
   */
  function calculateBackoffDelay(attempt) {
    var delay = CollegeTools.Config.API_CONFIG.RETRY_DELAY_BASE * Math.pow(2, attempt);
    return Math.min(delay, CollegeTools.Config.API_CONFIG.RETRY_DELAY_MAX);
  }

  /**
   * Determines if an HTTP status code should trigger a retry
   * @param {number} statusCode - HTTP status code
   * @returns {boolean} True if should retry
   * @private
   */
  function shouldRetry(statusCode) {
    // Retry on 5xx server errors and 429 rate limiting
    return (statusCode >= 500 && statusCode < 600) || statusCode === 429;
  }

  /**
   * Makes a single HTTP request with timeout and error handling
   * @param {string} url - URL to fetch
   * @returns {Object} Result with {success: boolean, statusCode: number, data?: Object, error?: string}
   * @private
   */
  function makeHttpRequest(url) {
    try {
      // Note: UrlFetchApp has no configurable request timeout; requests are
      // bounded by the Apps Script execution limit instead.
      var options = {
        method: 'GET',
        headers: {
          'User-Agent': 'CollegeTools/' + CollegeTools.Config.VERSION,
        },
        muteHttpExceptions: true,
      };

      var response = UrlFetchApp.fetch(url, options);
      var statusCode = response.getResponseCode();
      var body = response.getContentText();

      return {
        success: statusCode === 200,
        statusCode: statusCode,
        body: body,
      };
    } catch (e) {
      return {
        success: false,
        statusCode: 0,
        error: e.toString(),
      };
    }
  }

  /**
   * Fetches JSON data from a URL with retry logic, caching, and an execution-time guard
   * @param {string} url - URL to fetch
   * @param {Object} options - Options object
   * @param {boolean} options.useCache - Whether to use caching (default: true for searches)
   * @param {number} options.maxRetries - Override default retry count
   * @returns {Object} Result object with {ok: boolean, data?: Object, error?: string, fromCache?: boolean}
   * @private
   */
  function fetchJsonWithRetries(url, options) {
    options = options || {};
    var useCache = options.useCache !== false; // Default to true
    var maxRetries = options.maxRetries || CollegeTools.Config.API_CONFIG.RETRY_ATTEMPTS;

    // Check cache first if enabled
    var cacheKey = null;
    if (useCache) {
      cacheKey = getCacheKey(url);
      var cached = getCachedData(cacheKey);
      if (cached) {
        return {
          ok: true,
          data: cached,
          fromCache: true,
        };
      }
    }

    // Check execution time limit before making API call
    if (!checkExecutionTimeLimit(options)) {
      return {
        ok: false,
        error: 'Execution time limit approaching',
      };
    }

    // Attempt API call with retries
    for (var attempt = 0; attempt < maxRetries; attempt++) {
      var response = makeHttpRequest(url);

      if (response.success) {
        try {
          var data = JSON.parse(response.body);

          // Cache successful responses
          if (useCache && cacheKey) {
            setCachedData(cacheKey, data);
          }

          return {
            ok: true,
            data: data,
          };
        } catch (parseError) {
          return {
            ok: false,
            error: 'Failed to parse JSON response: ' + parseError.toString(),
          };
        }
      }

      // Check if we should retry
      if (shouldRetry(response.statusCode) && attempt < maxRetries - 1) {
        var delay = calculateBackoffDelay(attempt);
        Utilities.sleep(delay);
        continue;
      }

      // Final attempt failed
      return {
        ok: false,
        error: 'HTTP ' + response.statusCode + (response.error ? ': ' + response.error : ''),
        statusCode: response.statusCode,
      };
    }

    return {
      ok: false,
      error: 'Maximum retries exceeded',
    };
  }

  /**
   * Gets the API key from the designated sheet with validation
   * @returns {string|null} API key or null if not found
   * @private
   */
  function getApiKey() {
    var ss = SpreadsheetApp.getActive();
    var keySheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.API_KEY);
    if (!keySheet) {
      showApiKeySetupInstructions();
      return null;
    }

    var apiKey = (keySheet.getRange('A1').getValue()||'').toString().trim();

    // Validate API key format and warn about placeholder
    if (!apiKey) {
      showApiKeySetupInstructions();
      return null;
    }

    if (apiKey === 'your_api_key_here' || apiKey === 'DEMO_KEY' || apiKey.length < 10) {
      SpreadsheetApp.getUi().alert(
        'Invalid API Key',
        'Please replace the placeholder API key with your actual College Scorecard API key.\n\n' +
        'Get your free key at: https://api.data.gov/signup/',
        SpreadsheetApp.getUi().ButtonSet.OK,
      );
      return null;
    }

    return apiKey;
  }

  /**
   * Shows instructions for setting up the API key
   * @private
   */
  function showApiKeySetupInstructions() {
    var ui = SpreadsheetApp.getUi();
    ui.alert(
      'College Scorecard API Key Required',
      'To use College Tools, you need a free College Scorecard API key.\n\n' +
      'Setup Steps:\n' +
      '1. Go to: https://api.data.gov/signup/\n' +
      '2. Sign up for a free API key\n' +
      '3. Create a sheet named "' + CollegeTools.Config.SHEET_NAMES.API_KEY + '"\n' +
      '4. Paste your API key in cell A1\n' +
      '5. Try again!\n\n' +
      'Need help? Check the documentation.',
      ui.ButtonSet.OK,
    );
  }

  /**
   * Converts ownership code to readable type
   * @param {number} code - Ownership code from API
   * @returns {string} Human-readable ownership type
   */
  function typeFromOwnership(code) {
    if (code===1) return 'Public';
    if (code===2) return 'Private (nonprofit)';
    if (code===3) return 'Private (for-profit)';
    return '';
  }

  /**
   * Searches for colleges by name with fallback strategies and caching
   * @param {string} query - Search query
   * @param {string} state - Optional state filter (2-letter code)
   * @param {Object=} options - Optional shared execution options
   * @returns {Object} Result object with colleges data
   */
  function searchColleges(query, state, options) {
    options = options || {};
    var apiKey = getApiKey();
    if (!apiKey) {
      return {ok: false, error: 'API key not found in ' + CollegeTools.Config.SHEET_NAMES.API_KEY + ' sheet'};
    }

    // Reset fallback execution timer for new operations without a shared budget.
    if (!options.executionBudget) executionState.startTime = new Date().getTime();

    // Shared request pieces
    var baseParams = {
      'api_key': apiKey,
      'per_page': CollegeTools.Config.API_CONFIG.PER_PAGE,
      'fields': 'id,school.name,school.city,school.state,school.ownership,school.school_url',
      'school.operating': 1,
    };
    if (state && /^[A-Z]{2}$/.test(state)) {
      baseParams['school.state'] = state;
    }

    // Try multiple search strategies
    var attempts = [
      // 1. Fuzzy search
      (function() {
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.search'] = query;
        return {label: 'search', url: buildUrl(p)};
      })(),
      // 2. Exact name match
      (function() {
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.name'] = query;
        return {label: 'exact', url: buildUrl(p)};
      })(),
      // 3. Regex contains
      (function() {
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.name'] = '~.*' + CollegeTools.Utils.escapeRegex(query) + '.*';
        return {label: 'regex', url: buildUrl(p)};
      })(),
    ];

    var results = [];
    var notes = [];

    for (var a=0; a<attempts.length; a++) {
      var response = fetchJsonWithRetries(attempts[a].url, {useCache: true, executionBudget: options.executionBudget});

      if (response.ok && response.data && response.data.results && response.data.results.length) {
        results = response.data.results;
        var cacheNote = response.fromCache ? ' (cached)' : '';
        notes.push(attempts[a].label + ':200(' + response.data.results.length + ')' + cacheNote);
        break;
      } else {
        notes.push(attempts[a].label + ':' + (response.statusCode || 'err'));
        if (response.error && response.error.includes('time limit')) {
          notes.push('time_limit');
          break; // Don't continue if we're approaching the execution limit
        }
      }
    }

    return {
      ok: results.length > 0,
      results: results,
      notes: notes.join(' | '),
    };
  }

  /**
   * Fetches detailed college data for filling a row
   * @param {string} collegeName - Name of the college to search for
   * @param {Object=} options - Optional shared execution options
   * @returns {Object} Result with college data or error info
   */
  function fetchCollegeData(collegeName, options) {
    options = options || {};
    var apiKey = getApiKey();
    if (!apiKey) {
      return {ok: false, error: 'API key not found'};
    }

    // Check execution time limit before proceeding
    if (!checkExecutionTimeLimit(options)) {
      return {
        ok: false,
        error: 'Execution time limit approaching',
      };
    }

    // Try exact match first, then regex fallback
    var baseParams = {
      'api_key': apiKey,
      'per_page': 5,
      'fields': CollegeTools.Config.API_FIELDS,
      'school.operating': 1,
    };

    // Exact match attempt
    var q1 = JSON.parse(JSON.stringify(baseParams));
    q1['school.name'] = collegeName;
    var url1 = buildUrl(q1);

    var r1 = fetchJsonWithRetries(url1, {
      useCache: false,
      executionBudget: options.executionBudget,
    }); // Don't cache detailed data
    var results = [];
    var noteBits = [];

    if (r1.ok && r1.data && r1.data.results) {
      results = r1.data.results;
      noteBits.push('exact:200');
    } else {
      noteBits.push('exact:' + (r1.statusCode || 'err'));
    }

    // Regex fallback if no results and time allows
    if (!results.length && checkExecutionTimeLimit(options)) {
      var q2 = JSON.parse(JSON.stringify(baseParams));
      q2['school.name'] = '~.*' + CollegeTools.Utils.escapeRegex(collegeName) + '.*';
      var url2 = buildUrl(q2);

      var r2 = fetchJsonWithRetries(url2, {useCache: false, executionBudget: options.executionBudget});
      if (r2.ok && r2.data && r2.data.results) {
        results = r2.data.results;
        noteBits.push('regex:200');
      } else {
        noteBits.push('regex:' + (r2.statusCode || 'err'));
      }
    }

    if (!results.length) {
      return {
        ok: false,
        error: 'no match for "' + collegeName + '" (' + noteBits.join(' | ') + ')',
      };
    }

    return {
      ok: true,
      data: results[0],
      notes: noteBits.join(' | '),
    };
  }

  /**
   * Clears tracked API response cache entries.
   * Keys written by setCachedData are registered in ScriptProperties so they
   * can be explicitly removed here.
   */
  function clearCache() {
    try {
      var props = PropertiesService.getScriptProperties();
      var registry = props.getProperty('scorecard_cache_keys');
      var keys = registry ? JSON.parse(registry) : [];
      if (keys.length) {
        var cache = CacheService.getScriptCache();
        cache.removeAll(keys);
        props.deleteProperty('scorecard_cache_keys');
      }
      SpreadsheetApp.getUi().alert('API cache cleared (' + keys.length + ' entr' +
        (keys.length === 1 ? 'y' : 'ies') + ' removed).');
    } catch (e) {
      SpreadsheetApp.getUi().alert('Cache clearing failed: ' + e.toString());
    }
  }

  /**
   * Returns true if the API key sheet exists and contains a plausible key.
   * Does not make a network call; useful for quick setup checks without
   * triggering the full getApiKey() alert flow.
   * @returns {boolean}
   */
  function isApiKeyConfigured() {
    var ss = SpreadsheetApp.getActive();
    var keySheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.API_KEY);
    if (!keySheet) return false;
    var apiKey = (keySheet.getRange('A1').getValue() || '').toString().trim();
    return !!(apiKey &&
      apiKey !== 'your_api_key_here' &&
      apiKey !== 'DEMO_KEY' &&
      !apiKey.includes('your') &&
      !apiKey.includes('<') &&
      apiKey.length >= 10);
  }

  // Public API
  return {
    searchColleges: searchColleges,
    fetchCollegeData: fetchCollegeData,
    typeFromOwnership: typeFromOwnership,
    clearCache: clearCache,
    isApiKeyConfigured: isApiKeyConfigured,
  };
})();
