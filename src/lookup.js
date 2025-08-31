/**
 * College search and lookup functionality
 * @version 1.1.0
 * @author College Tools
 * @description College name searching and results display in Lookup sheet
 */

/**
 * CollegeTools.Lookup - College search module
 * Handles college name searching and results display
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Lookup = (function() {
  'use strict';

  /**
   * Converts search results to rows for display in Lookup sheet
   * @param {Array} results - API results array
   * @returns {Array[]} 2D array with headers and data rows
   * @private
   */
  function resultsToRows(results) {
    var rows = [['Official Name', 'City', 'State', 'Type', 'IPEDS ID', 'Website']];
    results.forEach(function(r) {
      var name = CollegeTools.Utils.getField(r, ['school', 'name'], 'school.name');
      var city = CollegeTools.Utils.getField(r, ['school', 'city'], 'school.city');
      var st = CollegeTools.Utils.getField(r, ['school', 'state'], 'school.state');
      var own = CollegeTools.Utils.getField(r, ['school', 'ownership'], 'school.ownership');
      var type = CollegeTools.Scorecard.typeFromOwnership(own);
      var url = CollegeTools.Utils.getField(r, ['school', 'school_url'], 'school.school_url');
      var id = (typeof r['id'] !== 'undefined') ? r['id'] : '';
      rows.push([name, city, st, type, id, url]);
    });
    return rows;
  }

  /**
   * Search College Names via the College Scorecard API.
   * Prompts for a search query (e.g., "unh" or "new hampshire") with optional state filter.
   * Writes up to 25 official matches into a sheet named "Lookup" (created/cleared).
   * Results include: Official Name, City, State, Type, IPEDS ID, Website.
   * Use the "Official Name" from results for accurate data fetching in the Colleges sheet.
   */
  function searchCollegeNames() {
    var ss = SpreadsheetApp.getActive();
    var ui = SpreadsheetApp.getUi();

    // Prompt for search query
    var resp = ui.prompt(
      'Search College Names',
      'Enter a keyword (e.g., unh, new hampshire, georgia tech)\\nOptionally add a state after a comma (e.g., unh, NH)',
      ui.ButtonSet.OK_CANCEL,
    );

    if (resp.getSelectedButton() !== ui.Button.OK) return;
    var raw = (resp.getResponseText()||'').trim();
    if (!raw) {
      ui.alert('No query entered.');
      return;
    }

    // Parse query and optional state
    var query = raw; var state = '';
    if (raw.indexOf(',') !== -1) {
      var parts = raw.split(',');
      query = (parts[0]||'').trim();
      state = (parts[1]||'').trim().toUpperCase();
      if (state.length === 1) state = ''; // ignore single char junk
    }

    // Perform search
    var searchResult = CollegeTools.Scorecard.searchColleges(query, state);

    if (!searchResult.ok || !searchResult.results.length) {
      ui.alert('No matches found or API error.\\nDetails: ' + (searchResult.notes || searchResult.error || 'Unknown error'));
      return;
    }

    // Write results to Lookup sheet
    var rows = resultsToRows(searchResult.results);
    var lookup = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.LOOKUP);
    lookup.clear();
    lookup.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    lookup.getRange(1, 1, 1, rows[0].length).setFontWeight('bold').setBackground('#e8f0fe');
    for (var c=1; c<=rows[0].length; c++) lookup.autoResizeColumn(c);

    ui.alert('Found ' + (rows.length-1) + ' match(es) [' + searchResult.notes + '].\\nSee the "' +
             CollegeTools.Config.SHEET_NAMES.LOOKUP + '" sheet and copy the Official Name into ' +
             CollegeTools.Config.SHEET_NAMES.COLLEGES + ' → College Name.');
  }

  // Public API
  return {
    searchCollegeNames: searchCollegeNames,
  };
})();
