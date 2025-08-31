/**
 * College data operations
 */

/**
 * CollegeTools.Colleges - College data management module
 * Handles filling college data, region mapping, and batch operations
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Colleges = (function() {
  'use strict';

  /**
   * Displays the current version of College Tools in an alert dialog.
   */
  function showVersion() { 
    SpreadsheetApp.getUi().alert('College Tools: ' + CollegeTools.Config.VERSION); 
  }

  /**
   * Core function that fills a row with college data from the Scorecard API.
   * Used by both single-row and batch fill operations.
   * @param {number} row - Row number to fill (1-based)
   * @param {Object} opts - Options object
   * @param {boolean} opts.suppressAlert - If true, suppresses UI alerts
   * @returns {Object} Result object with {ok: boolean, msg: string}
   * @private
   */
  function fillCollegeRowCore(row, opts) {
    opts = opts || {};
    var suppressAlert = !!opts.suppressAlert;

    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) { 
      if(!suppressAlert) SpreadsheetApp.getUi().alert('Sheet "' + 
        CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.'); 
      return {ok:false, msg:'no sheet'};
    }
    if (row < 3) { 
      if(!suppressAlert) SpreadsheetApp.getUi().alert("Click a data row (row 3 or below)."); 
      return {ok:false, msg:'row<3'};
    }

    // Headers (row 2)
    var hdrs = sh.getRange(2,1,1,sh.getLastColumn()).getValues()[0]
      .map(function(x){ return (x||"").toString().trim(); });
    
    function col(h){ 
      var i = hdrs.indexOf(h); 
      if(i===-1) throw new Error('Missing header: '+h); 
      return i+1; 
    }
    var idxRegion0 = hdrs.indexOf("Region");

    var COL = {
      NAME: col("College Name"),
      CITY: col("City"),
      STATE: col("State"),
      TYPE: col("Type (Public/Private)"),
      ACC:  col("Acceptance Rate"),
      RET:  col("First-Year Retention"),
      GRAD: col("Grad Rate"),
      EARN: col("Median Earnings (10yr)"),
      COA:  col("Total Cost of Attendance"),
      NET:  col("Estimated Net Price"),
      LINK: col("Link"),
      SAT25: col("SAT 25%"),
      SAT75: col("SAT 75%"),
      ACT25: col("ACT 25%"),
      ACT75: col("ACT 75%"),
      NOTES: col("Notes")
    };

    var name = (sh.getRange(row, COL.NAME).getValue()||"").toString().trim();
    if (!name) return {ok:false, msg:'empty name'};

    // Fetch college data via API
    var apiResult = CollegeTools.Scorecard.fetchCollegeData(name);
    if (!apiResult.ok) {
      sh.getRange(row, COL.NOTES).setValue(CollegeTools.Config.VERSION + ' | ' + apiResult.error);
      if(!suppressAlert) SpreadsheetApp.getUi().alert('No match for "' + name + '". See Notes.');
      return {ok:false, msg:'no match'};
    }

    var r = apiResult.data;

    // Extract data using utility functions
    var usedName = CollegeTools.Utils.getField(r, ['school','name'], 'school.name');
    var city     = CollegeTools.Utils.getField(r, ['school','city'], 'school.city');
    var state    = CollegeTools.Utils.getField(r, ['school','state'], 'school.state');
    var link     = CollegeTools.Utils.getField(r, ['school','school_url'], 'school.school_url');

    var ownCode  = CollegeTools.Utils.getField(r, ['school','ownership'], 'school.ownership');
    var typeText = CollegeTools.Scorecard.typeFromOwnership(ownCode);

    var acc        = CollegeTools.Utils.getField(r, ['latest','admissions','admission_rate','overall'], 'latest.admissions.admission_rate.overall');
    var retention  = CollegeTools.Utils.getField(r, ['latest','student','retention_rate','four_year','full_time'], 'latest.student.retention_rate.four_year.full_time');
    var gradRate   = CollegeTools.Utils.getField(r, ['latest','completion','rate_suppressed','overall'], 'latest.completion.rate_suppressed.overall');
    var earnings10 = CollegeTools.Utils.getField(r, ['latest','earnings','10_yrs_after_entry','median'], 'latest.earnings.10_yrs_after_entry.median');
    var coa        = CollegeTools.Utils.getField(r, ['latest','cost','attendance','academic_year'], 'latest.cost.attendance.academic_year');
    var netPrice   = CollegeTools.Utils.getField(r, ['latest','cost','avg_net_price','overall'], 'latest.cost.avg_net_price.overall');

    function n(x){ return (x===null||x===undefined||x==="") ? null : Number(x); }
    var sat25m = n(CollegeTools.Utils.getField(r, ['latest','admissions','sat_scores','25th_percentile','math'], 'latest.admissions.sat_scores.25th_percentile.math'));
    var sat25r = n(CollegeTools.Utils.getField(r, ['latest','admissions','sat_scores','25th_percentile','critical_reading'], 'latest.admissions.sat_scores.25th_percentile.critical_reading'));
    var sat75m = n(CollegeTools.Utils.getField(r, ['latest','admissions','sat_scores','75th_percentile','math'], 'latest.admissions.sat_scores.75th_percentile.math'));
    var sat75r = n(CollegeTools.Utils.getField(r, ['latest','admissions','sat_scores','75th_percentile','critical_reading'], 'latest.admissions.sat_scores.75th_percentile.critical_reading'));
    var satAvg = n(CollegeTools.Utils.getField(r, ['latest','admissions','sat_scores','average','overall'], 'latest.admissions.sat_scores.average.overall'));

    var sat25 = (sat25m!=null && sat25r!=null) ? (sat25m + sat25r) : (satAvg!=null ? satAvg : "");
    var sat75 = (sat75m!=null && sat75r!=null) ? (sat75m + sat75r) : (satAvg!=null ? satAvg : "");

    var act25 = CollegeTools.Utils.getField(r, ['latest','admissions','act_scores','25th_percentile','cumulative'], 'latest.admissions.act_scores.25th_percentile.cumulative');
    var act75 = CollegeTools.Utils.getField(r, ['latest','admissions','act_scores','75th_percentile','cumulative'], 'latest.admissions.act_scores.75th_percentile.cumulative');

    var regionVal = (idxRegion0 !== -1) ? CollegeTools.Utils.getRegionForState(state) : "";

    // Write data to sheet
    var writes = [
      [COL.CITY, city],
      [COL.STATE, state],
      [COL.TYPE, typeText],
      [COL.ACC, acc],
      [COL.RET, retention],
      [COL.GRAD, gradRate],
      [COL.EARN, earnings10],
      [COL.COA, coa],
      [COL.NET, netPrice],
      [COL.LINK, link],
      [COL.SAT25, sat25],
      [COL.SAT75, sat75],
      [COL.ACT25, act25],
      [COL.ACT75, act75]
    ];
    if (idxRegion0 !== -1) writes.push([idxRegion0 + 1, regionVal]);

    writes.forEach(function(w){ sh.getRange(row, w[0]).setValue(w[1]); });
    sh.getRange(row, COL.NOTES).setValue(CollegeTools.Config.VERSION + ' | ' + (usedName||name));

    if (!suppressAlert) {
      // Highlight when run one-off
      var toFlash = writes.map(function(w){ return sh.getRange(row, w[0]); });
      toFlash.push(sh.getRange(row, COL.NOTES));
      CollegeTools.Utils.highlight(toFlash);
    }

    // Seed trackers (quietly in batch mode too)
    CollegeTools.Trackers.setupAllTrackers();
    CollegeTools.Trackers.syncCollegeToTrackers({ name: (usedName||name), coa: coa });

    return {ok:true, msg:'ok'};
  }

  /**
   * Fills the currently selected row in the Colleges sheet with data from the College Scorecard API.
   * Automatically populates college information including city, state, type, acceptance rate, costs, etc.
   * Also seeds tracker sheets with the college name and triggers region auto-fill.
   */
  function fillCollegeRow() {
    var sh = SpreadsheetApp.getActive().getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) { 
      SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.'); 
      return; 
    }
    var row = sh.getActiveCell().getRow();
    var res = fillCollegeRowCore(row, {suppressAlert:false});
    if (res.ok) SpreadsheetApp.getUi().alert('Updated row ' + row + '.');
  }

  /**
   * Automatically fills the Region column for all rows in the Colleges sheet based on state.
   * Maps US states to four regions: Northeast, Midwest, South, West.
   * Only updates rows that have a college name and where the region differs from the calculated value.
   */
  function fillRegionsAllRows() {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) { 
      SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.'); 
      return; 
    }

    var lastRow = sh.getLastRow();
    if (lastRow < 3) { 
      SpreadsheetApp.getUi().alert('No data rows to process.'); 
      return; 
    }

    // Read header row 2
    var hdrs = sh.getRange(2,1,1,sh.getLastColumn()).getValues()[0]
      .map(function(x){ return (x||"").toString().trim(); });
    
    function mustCol(h){ 
      var i = hdrs.indexOf(h); 
      if(i===-1) throw new Error('Missing header: '+h); 
      return i+1; 
    }
    var colName = mustCol('College Name');
    var colState = mustCol('State');
    var idxRegion = hdrs.indexOf('Region');
    
    if (idxRegion === -1) { 
      SpreadsheetApp.getUi().alert('No "Region" column found on ' + 
        CollegeTools.Config.SHEET_NAMES.COLLEGES + ' sheet.'); 
      return; 
    }
    var colRegion = idxRegion + 1;

    var range = sh.getRange(3, 1, lastRow-2, sh.getLastColumn());
    var values = range.getValues();

    var updates = [];
    for (var r=0; r<values.length; r++){
      var rowVals = values[r];
      var name = (rowVals[colName-1]||"").toString().trim();
      if (!name) continue; // skip empty rows
      var st = (rowVals[colState-1]||"").toString().trim();
      var currentRegion = (rowVals[colRegion-1]||"").toString().trim();
      var newRegion = CollegeTools.Utils.getRegionForState(st);
      if (newRegion && newRegion !== currentRegion){
        updates.push({ r: r+3, c: colRegion, v: newRegion }); // store absolute position
      }
    }

    updates.forEach(function(u){ sh.getRange(u.r, u.c).setValue(u.v); });
    SpreadsheetApp.getUi().alert('Regions updated for ' + updates.length + ' row(s).');
  }

  /**
   * Batch fills multiple selected rows in the Colleges sheet with data from the College Scorecard API.
   * Processes all selected rows that contain a college name, skipping empty rows.
   * Displays a summary of successful, skipped, and failed operations.
   */
  function fillSelectedRows() {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    if (!sh) { 
      SpreadsheetApp.getUi().alert('Sheet "' + CollegeTools.Config.SHEET_NAMES.COLLEGES + '" not found.'); 
      return; 
    }

    // Use selected rows from the active range/list; require header row 2 present
    var ranges = [];
    var rl = sh.getActiveRangeList && sh.getActiveRangeList();
    if (rl) ranges = rl.getRanges();
    else {
      var r = sh.getActiveRange();
      if (!r) { 
        SpreadsheetApp.getUi().alert('Select one or more rows in "' + 
          CollegeTools.Config.SHEET_NAMES.COLLEGES + '" first.'); 
        return; 
      }
      ranges = [r];
    }

    // Gather unique row numbers (only rows >=3)
    var rows = {};
    ranges.forEach(function(rg){
      for (var r = rg.getRow(); r < rg.getRow() + rg.getNumRows(); r++) {
        if (r >= 3) rows[r] = true;
      }
    });
    var list = Object.keys(rows).map(function(x){ return parseInt(x,10); })
      .sort(function(a,b){ return a-b; });
    
    if (!list.length) { 
      SpreadsheetApp.getUi().alert('Select data rows (row 3 or below).'); 
      return; 
    }

    // Process each row
    var ok=0, skipped=0, failed=0;
    for (var i=0;i<list.length;i++){
      var row = list[i];
      var name = (sh.getRange(row, 1).getValue()||"").toString().trim(); // A = College Name
      if (!name) { skipped++; continue; }
      try {
        var res = fillCollegeRowCore(row, {suppressAlert:true});
        if (res && res.ok) ok++; else failed++;
      } catch(e){
        failed++;
      }
      Utilities.sleep(200); // polite spacing for API quotas
    }

    SpreadsheetApp.getUi().alert('Batch fill complete.\\nOK: ' + ok + 
      ' | Skipped (no name): ' + skipped + ' | Failed: ' + failed);
  }

  // Public API
  return {
    showVersion: showVersion,
    fillCollegeRow: fillCollegeRow,
    fillSelectedRows: fillSelectedRows,
    fillRegionsAllRows: fillRegionsAllRows
  };
})();