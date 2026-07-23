/**
 * Offline travel estimates and Travel Planner sheet maintenance.
 * @version 2.7.0
 * @author College Tools
 * @description Approximate home-to-college travel estimates without external APIs
 */

/**
 * CollegeTools.Travel - Travel Planner module
 * Builds approximate offline travel distance, mode, time, and cost estimates.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Travel = (function() {
  'use strict';

  var CITY_COORDS = {
    'AL|MONTGOMERY': {lat: 32.3777, lon: -86.3000},
    'AK|JUNEAU': {lat: 58.3019, lon: -134.4197},
    'AZ|PHOENIX': {lat: 33.4484, lon: -112.0740},
    'AR|LITTLE ROCK': {lat: 34.7465, lon: -92.2896},
    'CA|BERKELEY': {lat: 37.8715, lon: -122.2730},
    'CA|SACRAMENTO': {lat: 38.5816, lon: -121.4944},
    'CA|LOS ANGELES': {lat: 34.0522, lon: -118.2437},
    'CO|DENVER': {lat: 39.7392, lon: -104.9903},
    'CT|HARTFORD': {lat: 41.7658, lon: -72.6734},
    'DE|DOVER': {lat: 39.1582, lon: -75.5244},
    'FL|TALLAHASSEE': {lat: 30.4383, lon: -84.2807},
    'GA|ATLANTA': {lat: 33.7490, lon: -84.3880},
    'HI|HONOLULU': {lat: 21.3069, lon: -157.8583},
    'ID|BOISE': {lat: 43.6150, lon: -116.2023},
    'IL|CHICAGO': {lat: 41.8781, lon: -87.6298},
    'IL|SPRINGFIELD': {lat: 39.7817, lon: -89.6501},
    'IN|INDIANAPOLIS': {lat: 39.7684, lon: -86.1581},
    'IA|DES MOINES': {lat: 41.5868, lon: -93.6250},
    'KS|TOPEKA': {lat: 39.0473, lon: -95.6752},
    'KY|FRANKFORT': {lat: 38.2009, lon: -84.8733},
    'LA|BATON ROUGE': {lat: 30.4515, lon: -91.1871},
    'ME|AUGUSTA': {lat: 44.3106, lon: -69.7795},
    'MD|ANNAPOLIS': {lat: 38.9784, lon: -76.4922},
    'MA|BOSTON': {lat: 42.3601, lon: -71.0589},
    'MI|LANSING': {lat: 42.7325, lon: -84.5555},
    'MN|SAINT PAUL': {lat: 44.9537, lon: -93.0900},
    'MS|JACKSON': {lat: 32.2988, lon: -90.1848},
    'MO|JEFFERSON CITY': {lat: 38.5767, lon: -92.1735},
    'MT|HELENA': {lat: 46.5891, lon: -112.0391},
    'NE|LINCOLN': {lat: 40.8136, lon: -96.7026},
    'NV|CARSON CITY': {lat: 39.1638, lon: -119.7674},
    'NH|CONCORD': {lat: 43.2081, lon: -71.5376},
    'NJ|TRENTON': {lat: 40.2206, lon: -74.7597},
    'NM|SANTA FE': {lat: 35.6870, lon: -105.9378},
    'NY|ALBANY': {lat: 42.6526, lon: -73.7562},
    'NY|NEW YORK': {lat: 40.7128, lon: -74.0060},
    'NC|RALEIGH': {lat: 35.7796, lon: -78.6382},
    'ND|BISMARCK': {lat: 46.8083, lon: -100.7837},
    'OH|COLUMBUS': {lat: 39.9612, lon: -82.9988},
    'OK|OKLAHOMA CITY': {lat: 35.4676, lon: -97.5164},
    'OR|SALEM': {lat: 44.9429, lon: -123.0351},
    'PA|HARRISBURG': {lat: 40.2732, lon: -76.8867},
    'RI|PROVIDENCE': {lat: 41.8240, lon: -71.4128},
    'SC|COLUMBIA': {lat: 34.0007, lon: -81.0348},
    'SD|PIERRE': {lat: 44.3683, lon: -100.3510},
    'TN|NASHVILLE': {lat: 36.1627, lon: -86.7816},
    'TX|AUSTIN': {lat: 30.2672, lon: -97.7431},
    'TX|DALLAS': {lat: 32.7767, lon: -96.7970},
    'UT|SALT LAKE CITY': {lat: 40.7608, lon: -111.8910},
    'VT|MONTPELIER': {lat: 44.2601, lon: -72.5754},
    'VA|RICHMOND': {lat: 37.5407, lon: -77.4360},
    'WA|OLYMPIA': {lat: 47.0379, lon: -122.9007},
    'WV|CHARLESTON': {lat: 38.3498, lon: -81.6326},
    'WI|MADISON': {lat: 43.0731, lon: -89.4012},
    'WY|CHEYENNE': {lat: 41.1400, lon: -104.8202},
    'DC|WASHINGTON': {lat: 38.9072, lon: -77.0369},
  };

  var STATE_CAPITAL_CITY = {
    AL: 'Montgomery', AK: 'Juneau', AZ: 'Phoenix', AR: 'Little Rock', CA: 'Sacramento',
    CO: 'Denver', CT: 'Hartford', DE: 'Dover', FL: 'Tallahassee', GA: 'Atlanta',
    HI: 'Honolulu', ID: 'Boise', IL: 'Springfield', IN: 'Indianapolis', IA: 'Des Moines',
    KS: 'Topeka', KY: 'Frankfort', LA: 'Baton Rouge', ME: 'Augusta', MD: 'Annapolis',
    MA: 'Boston', MI: 'Lansing', MN: 'Saint Paul', MS: 'Jackson', MO: 'Jefferson City',
    MT: 'Helena', NE: 'Lincoln', NV: 'Carson City', NH: 'Concord', NJ: 'Trenton',
    NM: 'Santa Fe', NY: 'Albany', NC: 'Raleigh', ND: 'Bismarck', OH: 'Columbus',
    OK: 'Oklahoma City', OR: 'Salem', PA: 'Harrisburg', RI: 'Providence', SC: 'Columbia',
    SD: 'Pierre', TN: 'Nashville', TX: 'Austin', UT: 'Salt Lake City', VT: 'Montpelier',
    VA: 'Richmond', WA: 'Olympia', WV: 'Charleston', WI: 'Madison', WY: 'Cheyenne',
    DC: 'Washington',
  };

  var ASSUMPTION_ROWS = [
    ['Travel Assumptions', ''],
    ['Driving Cost per Mile', 0.79],
    ['Drive Max Miles', 250],
    ['Drive-or-Fly Max Miles', 700],
    ['Medium Flight Cost', 450],
    ['Long Flight Cost', 800],
    ['Long Flight Threshold Miles', 1500],
  ];

  /**
   * Returns default editable travel assumptions.
   * @returns {Object} Default travel assumption values
   */
  function defaultAssumptions_() {
    return {
      drivingCostPerMile: 0.79,
      driveMaxMiles: 250,
      driveOrFlyMaxMiles: 700,
      mediumFlightCost: 450,
      longFlightCost: 800,
      longFlightThresholdMiles: 1500,
    };
  }

  /**
   * Normalizes a state code for lookup.
   * @param {*} state - Raw state value
   * @returns {string} Uppercase state code
   */
  function normalizeState_(state) {
    return (state || '').toString().trim().toUpperCase();
  }

  /**
   * Normalizes a city name for lookup.
   * @param {*} city - Raw city value
   * @returns {string} Uppercase city key
   */
  function normalizeCity_(city) {
    return (city || '').toString().trim().toUpperCase();
  }

  /**
   * Looks up city coordinates, falling back to the state capital when possible.
   * @param {*} city - City name
   * @param {*} state - Two-letter state code
   * @returns {Object} Lookup result with coord and fallback flag
   */
  function lookupCoord_(city, state) {
    var st = normalizeState_(state);
    var cityKey = normalizeCity_(city);
    if (!st || !cityKey) return {coord: null, fallback: false};
    var exact = CITY_COORDS[st + '|' + cityKey];
    if (exact) return {coord: exact, fallback: false};
    var capital = STATE_CAPITAL_CITY[st];
    var fallback = capital ? CITY_COORDS[st + '|' + normalizeCity_(capital)] : null;
    return {coord: fallback || null, fallback: !!fallback};
  }

  /**
   * Calculates great-circle distance in miles.
   * @param {Object} a - First coordinate with lat and lon
   * @param {Object} b - Second coordinate with lat and lon
   * @returns {number} Distance in miles
   */
  function haversineMiles_(a, b) {
    var earthMiles = 3958.8;
    var dLat = (b.lat - a.lat) * Math.PI / 180;
    var dLon = (b.lon - a.lon) * Math.PI / 180;
    var lat1 = a.lat * Math.PI / 180;
    var lat2 = b.lat * Math.PI / 180;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return earthMiles * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  /**
   * Rounds a number to the nearest increment.
   * @param {number} value - Number to round
   * @param {number} increment - Increment to round to
   * @returns {number} Rounded number
   */
  function roundToNearest_(value, increment) {
    return Math.round(value / increment) * increment;
  }

  /**
   * Reads a positive number or returns the fallback.
   * @param {*} value - Candidate number
   * @param {number} fallback - Fallback value
   * @returns {number} Positive number or fallback
   */
  function numberOrDefault_(value, fallback) {
    var n = Number(value);
    return isNaN(n) || n <= 0 ? fallback : n;
  }

  /**
   * Estimates distance, mode, time, and cost for one home-to-college pair.
   * @param {Object} input - Travel estimate input
   * @returns {Object} Travel estimate fields for the planner row
   */
  function estimateTravel(input) {
    input = input || {};
    var assumptions = input.assumptions || defaultAssumptions_();
    var trips = Number(input.tripsHomePerYear || 0);
    var home = lookupCoord_(input.homeCity, input.homeState);
    var college = lookupCoord_(input.collegeCity, input.collegeState);
    if (!home.coord || !college.coord) {
      return {
        distanceMiles: '', mode: '', driveTimeHours: '', flightTravelTimeHours: '',
        travelCostPerTrip: '', annualTravelCost: '', notes: '',
      };
    }

    var distance = roundToNearest_(haversineMiles_(home.coord, college.coord), 10);
    var mode = distance < assumptions.driveMaxMiles ? 'Drive' :
      (distance <= assumptions.driveOrFlyMaxMiles ? 'Drive or Fly' : 'Fly');
    var driveTime = roundToNearest_(distance / 60, 0.5);
    var flightTime = roundToNearest_(2 + distance / 500, 0.5);
    var driveCost = Math.round(distance * 2 * assumptions.drivingCostPerMile);
    var cost = mode === 'Drive' ? driveCost :
      (mode === 'Drive or Fly' ? Math.max(driveCost, assumptions.mediumFlightCost) :
        (distance >= assumptions.longFlightThresholdMiles ? assumptions.longFlightCost : assumptions.mediumFlightCost));
    var annual = trips > 0 ? cost * trips : '';
    var notes = [];
    if (home.fallback || college.fallback) notes.push('Used state-level estimate');

    return {
      distanceMiles: distance,
      mode: mode,
      driveTimeHours: driveTime,
      flightTravelTimeHours: flightTime,
      travelCostPerTrip: cost,
      annualTravelCost: annual,
      notes: notes.join('; '),
    };
  }

  /**
   * Reads optional home travel inputs from Personal Profile.
   * @returns {Object} Home state, home city, and trips per year
   */
  function readProfile_() {
    var ss = SpreadsheetApp.getActive();
    var profile = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
    if (!profile) return {homeState: '', homeCity: '', tripsHomePerYear: ''};
    return {
      homeState: (profile.getRange(13, 2).getValue() || '').toString().trim(),
      homeCity: (profile.getRange(14, 2).getValue() || '').toString().trim(),
      tripsHomePerYear: profile.getRange(15, 2).getValue() || '',
    };
  }

  /**
   * Seeds and reads editable travel assumptions from the Travel Planner sheet.
   * @param {Sheet} sheet - Travel Planner sheet
   * @returns {Object} Travel assumption values
   */
  function ensureAssumptions_(sheet) {
    for (var i = 0; i < ASSUMPTION_ROWS.length; i++) {
      var row = i + 1;
      sheet.getRange(row, 15).setValue(ASSUMPTION_ROWS[i][0]);
      if (row === 1) continue;
      var valueCell = sheet.getRange(row, 16);
      if (valueCell.getValue() === '') valueCell.setValue(ASSUMPTION_ROWS[i][1]);
    }
    var defaults = defaultAssumptions_();
    return {
      drivingCostPerMile: numberOrDefault_(sheet.getRange(2, 16).getValue(), defaults.drivingCostPerMile),
      driveMaxMiles: numberOrDefault_(sheet.getRange(3, 16).getValue(), defaults.driveMaxMiles),
      driveOrFlyMaxMiles: numberOrDefault_(sheet.getRange(4, 16).getValue(), defaults.driveOrFlyMaxMiles),
      mediumFlightCost: numberOrDefault_(sheet.getRange(5, 16).getValue(), defaults.mediumFlightCost),
      longFlightCost: numberOrDefault_(sheet.getRange(6, 16).getValue(), defaults.longFlightCost),
      longFlightThresholdMiles: numberOrDefault_(sheet.getRange(7, 16).getValue(), defaults.longFlightThresholdMiles),
    };
  }

  /**
   * Returns the Travel Planner sheet, inserting it immediately after the
   * Scholarship Tracker when it does not exist yet.
   * @param {Spreadsheet} ss - Active spreadsheet
   * @returns {Sheet} Existing or newly inserted Travel Planner sheet
   * @private
   */
  function ensureTravelPlannerSheet_(ss) {
    var name = CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER;
    var existing = ss.getSheetByName(name);
    if (existing) return existing;

    var scholarship = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.SCHOLARSHIP_TRACKER);
    if (scholarship) {
      // insertSheet uses a zero-based insertion index while getIndex() is
      // one-based, so the Scholarship Tracker index places the new sheet
      // immediately after it.
      return ss.insertSheet(name, scholarship.getIndex());
    }
    return ss.insertSheet(name);
  }

  /**
   * Creates or refreshes the Travel Planner sheet from Colleges and profile data.
   * @param {Object=} opts - Optional execution flags
   * @returns {Object} Refresh result with ok and count
   */
  function createOrUpdateTravelPlanner(opts) {
    opts = opts || {};
    var ss = SpreadsheetApp.getActive();
    var colleges = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
    var travel = ensureTravelPlannerSheet_(ss);
    CollegeTools.Utils.setHeaders(travel, CollegeTools.Config.HEADERS.TRAVEL_PLANNER);
    var assumptions = ensureAssumptions_(travel);
    if (!colleges) return {ok: false, count: 0, msg: 'no Colleges sheet'};

    var profile = readProfile_();
    var colName = CollegeTools.Schema.columnIndex('COLLEGES', 'COLLEGE_NAME', colleges);
    var colCity = CollegeTools.Schema.columnIndex('COLLEGES', 'CITY', colleges);
    var colState = CollegeTools.Schema.columnIndex('COLLEGES', 'STATE', colleges);
    var startRow = CollegeTools.Schema.getSheet('COLLEGES').dataStartRow;
    var lastRow = Math.max(startRow, colleges.getLastRow());
    var values = colleges.getRange(startRow, 1, lastRow - startRow + 1, colleges.getLastColumn()).getValues();
    var rows = [];

    values.forEach(function(row) {
      var collegeName = row[colName - 1];
      if (!collegeName) return;
      var collegeCity = row[colCity - 1] || '';
      var collegeState = row[colState - 1] || '';
      var estimate = estimateTravel({
        homeCity: profile.homeCity,
        homeState: profile.homeState,
        collegeCity: collegeCity,
        collegeState: collegeState,
        tripsHomePerYear: profile.tripsHomePerYear,
        assumptions: assumptions,
      });
      rows.push([
        collegeName, collegeCity, collegeState, profile.homeCity, profile.homeState,
        estimate.distanceMiles, estimate.mode, estimate.driveTimeHours,
        estimate.flightTravelTimeHours, estimate.travelCostPerTrip,
        profile.tripsHomePerYear || '', estimate.annualTravelCost, estimate.notes,
      ]);
    });

    if (travel.getLastRow() > 1) {
      travel.getRange(2, 1, travel.getLastRow() - 1, CollegeTools.Config.HEADERS.TRAVEL_PLANNER.length)
        .clearContent();
    }
    if (rows.length) {
      travel.getRange(2, 1, rows.length, CollegeTools.Config.HEADERS.TRAVEL_PLANNER.length).setValues(rows);
    }
    if (!opts.suppressAlert) SpreadsheetApp.getUi().alert('Travel Planner refreshed for ' + rows.length + ' college(s).');
    return {ok: true, count: rows.length};
  }

  return {
    estimateTravel: estimateTravel,
    createOrUpdateTravelPlanner: createOrUpdateTravelPlanner,
  };
})();
