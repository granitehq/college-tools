/**
 * College Scorecard API client
 */

/**
 * CollegeTools.Scorecard - API client module
 * Handles all interactions with the College Scorecard API
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Scorecard = (function() {
  'use strict';

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
   * Fetches JSON data from a URL with retry logic
   * @param {string} url - URL to fetch
   * @param {number} tries - Number of retry attempts (default: 3)
   * @returns {Object} Result object with {ok: boolean, data?: Object, code?: number, err?: string}
   * @private
   */
  function fetchJson(url, tries) {
    tries = tries || CollegeTools.Config.API_CONFIG.RETRY_ATTEMPTS;
    var delay = CollegeTools.Config.API_CONFIG.RETRY_DELAY;
    
    for (var i=0; i<tries; i++) {
      var res;
      try { 
        res = UrlFetchApp.fetch(url, {muteHttpExceptions:true}); 
      }
      catch(e) { 
        Utilities.sleep(delay * (i+1)); 
        continue; 
      }
      
      var code = res.getResponseCode();
      if (code === 200) {
        try { 
          return { ok:true, data: JSON.parse(res.getContentText()) }; 
        }
        catch(e2) { 
          return { ok:false, code:200, err:"parse" }; 
        }
      }
      
      // Retry on transient 5xx
      if (code >= 500 && code < 600) { 
        Utilities.sleep(delay * (i+1)); 
        continue; 
      }
      return { ok:false, code:code, body:res.getContentText() };
    }
    return { ok:false, code:500, err:"retries_exhausted" };
  }

  /**
   * Makes a simple API call without retry logic (used internally by fillCollegeRowCore)
   * @param {Object} params - Query parameters
   * @returns {Object} Result with {code: number, body: string}
   * @private
   */
  function fetchOnce(params) {
    var url = buildUrl(params);
    var res = UrlFetchApp.fetch(url, {muteHttpExceptions:true});
    return { code: res.getResponseCode(), body: res.getContentText() };
  }

  /**
   * Gets the API key from the designated sheet
   * @returns {string|null} API key or null if not found
   * @private
   */
  function getApiKey() {
    var ss = SpreadsheetApp.getActive();
    var keySheet = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.API_KEY);
    if (!keySheet) return null;
    var apiKey = (keySheet.getRange("A1").getValue()||"").toString().trim();
    return apiKey || null;
  }

  /**
   * Converts ownership code to readable type
   * @param {number} code - Ownership code from API
   * @returns {string} Human-readable ownership type
   * @private
   */
  function typeFromOwnership(code) {
    if (code===1) return 'Public';
    if (code===2) return 'Private (nonprofit)';
    if (code===3) return 'Private (for-profit)';
    return '';
  }

  /**
   * Searches for colleges by name with fallback strategies
   * @param {string} query - Search query
   * @param {string} state - Optional state filter (2-letter code)
   * @returns {Object} Result object with colleges data
   */
  function searchColleges(query, state) {
    var apiKey = getApiKey();
    if (!apiKey) {
      return { ok: false, error: 'API key not found in ' + CollegeTools.Config.SHEET_NAMES.API_KEY + ' sheet' };
    }

    // Shared request pieces
    var baseParams = {
      api_key: apiKey,
      per_page: CollegeTools.Config.API_CONFIG.PER_PAGE,
      fields: 'id,school.name,school.city,school.state,school.ownership,school.school_url',
      'school.operating': 1
    };
    if (state && /^[A-Z]{2}$/.test(state)) {
      baseParams['school.state'] = state;
    }

    // Try multiple search strategies
    var attempts = [
      // 1. Fuzzy search
      (function(){
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.search'] = query;
        return { label:'search', url: buildUrl(p) };
      })(),
      // 2. Exact name match
      (function(){
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.name'] = query;
        return { label:'exact', url: buildUrl(p) };
      })(),
      // 3. Regex contains
      (function(){
        var p = JSON.parse(JSON.stringify(baseParams));
        p['school.name'] = '~.*' + CollegeTools.Utils.escapeRegex(query) + '.*';
        return { label:'regex', url: buildUrl(p) };
      })()
    ];

    var results = [];
    var notes = [];
    
    for (var a=0; a<attempts.length; a++) {
      var r = fetchJson(attempts[a].url, 3);
      if (r.ok && r.data && r.data.results && r.data.results.length) {
        results = r.data.results;
        notes.push(attempts[a].label + ':200(' + r.data.results.length + ')');
        break;
      } else {
        notes.push(attempts[a].label + ':' + (r.code||'err'));
      }
    }

    return {
      ok: results.length > 0,
      results: results,
      notes: notes.join(' | ')
    };
  }

  /**
   * Fetches detailed college data for filling a row
   * @param {string} collegeName - Name of the college to search for
   * @returns {Object} Result with college data or error info
   */
  function fetchCollegeData(collegeName) {
    var apiKey = getApiKey();
    if (!apiKey) {
      return { ok: false, error: 'API key not found' };
    }

    // Try exact match first, then regex fallback
    var baseParams = {
      api_key: apiKey,
      per_page: 5,
      fields: CollegeTools.Config.API_FIELDS,
      'school.operating': 1
    };

    // Exact match attempt
    var q1 = JSON.parse(JSON.stringify(baseParams));
    q1['school.name'] = collegeName;
    var r1 = fetchOnce(q1);

    var results = [];
    var noteBits = ['HTTP ' + r1.code];
    
    if (r1.code === 200) {
      try { 
        results = (JSON.parse(r1.body).results)||[]; 
      } catch(e) { 
        results=[]; 
        noteBits.push('parse err'); 
      }
    }
    
    // Regex fallback if no results
    if (!results.length) {
      var q2 = JSON.parse(JSON.stringify(baseParams));
      q2['school.name'] = '~.*' + CollegeTools.Utils.escapeRegex(collegeName) + '.*';
      var r2 = fetchOnce(q2);
      noteBits.push('regex ' + r2.code);
      
      if (r2.code === 200) {
        try { 
          results = (JSON.parse(r2.body).results)||[]; 
        } catch(e2) { 
          results=[]; 
          noteBits.push('parse err'); 
        }
      }
    }

    if (!results.length) {
      return {
        ok: false,
        error: 'no match for "' + collegeName + '" (' + noteBits.join(' | ') + ')'
      };
    }

    return {
      ok: true,
      data: results[0],
      notes: noteBits.join(' | ')
    };
  }

  // Public API
  return {
    searchColleges: searchColleges,
    fetchCollegeData: fetchCollegeData,
    typeFromOwnership: typeFromOwnership
  };
})();