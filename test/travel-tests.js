/**
 * Travel Planner tests.
 */

const {createHarness, TestSuite} = require('./support');

const harness = createHarness([
  'config.js',
  'utils.js',
  'schema.js',
  'formatting.js',
  'formulas.js',
  'travel.js',
  'financial.js',
  'admissions.js',
  'trackers.js',
  'colleges.js',
]);
const {CollegeTools, mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
const suite = new TestSuite();

suite.test('estimateTravel leaves outputs blank when home city or state is missing', () => {
  const estimate = CollegeTools.Travel.estimateTravel({
    homeCity: '',
    homeState: 'TX',
    collegeCity: 'Austin',
    collegeState: 'TX',
    tripsHomePerYear: 4,
  });

  suite.assertEqual(estimate.distanceMiles, '', 'Distance should be blank without home city');
  suite.assertEqual(estimate.mode, '', 'Mode should be blank without home city');
  suite.assertEqual(estimate.annualTravelCost, '', 'Annual cost should be blank without home city');
});

suite.test('estimateTravel computes offline approximate driving estimate', () => {
  const estimate = CollegeTools.Travel.estimateTravel({
    homeCity: 'Dallas',
    homeState: 'TX',
    collegeCity: 'Austin',
    collegeState: 'TX',
    tripsHomePerYear: 4,
  });

  suite.assert(estimate.distanceMiles >= 180 && estimate.distanceMiles <= 220,
    'Dallas to Austin should be roughly 200 miles');
  suite.assertEqual(estimate.mode, 'Drive', 'Short distances should be Drive');
  suite.assert(estimate.driveTimeHours >= 3 && estimate.driveTimeHours <= 4,
    'Drive time should be roughly distance divided by 60 mph');
  suite.assert(estimate.travelCostPerTrip > 0, 'Trip cost should be populated');
  suite.assertEqual(estimate.annualTravelCost, estimate.travelCostPerTrip * 4,
    'Annual cost should multiply by trips home per year');
});

suite.test('estimateTravel uses configurable travel assumptions', () => {
  const estimate = CollegeTools.Travel.estimateTravel({
    homeCity: 'Dallas',
    homeState: 'TX',
    collegeCity: 'Austin',
    collegeState: 'TX',
    tripsHomePerYear: 1,
    assumptions: {
      drivingCostPerMile: 1,
      driveMaxMiles: 250,
      driveOrFlyMaxMiles: 700,
      mediumFlightCost: 450,
      longFlightCost: 800,
      longFlightThresholdMiles: 1500,
    },
  });

  suite.assertEqual(estimate.travelCostPerTrip, estimate.distanceMiles * 2,
    'Driving estimate should use configured cost per mile');
});

suite.test('estimateTravel falls back to state capital when city is unknown', () => {
  const estimate = CollegeTools.Travel.estimateTravel({
    homeCity: 'Unknown City',
    homeState: 'TX',
    collegeCity: 'Berkeley',
    collegeState: 'CA',
    tripsHomePerYear: 2,
  });

  suite.assert(estimate.distanceMiles > 1000, 'State fallback should still produce a long-distance estimate');
  suite.assert(estimate.notes.indexOf('state-level estimate') !== -1,
    'Notes should disclose state-level fallback');
});

suite.test('createOrUpdateTravelPlanner creates headers, assumptions, and estimates linked college rows', () => {
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);

  const profile = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE) ||
    mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
  profile.getRange(13, 2).setValue('TX');
  profile.getRange(14, 2).setValue('Dallas');
  profile.getRange(15, 2).setValue(4);

  colleges.getRange(3, 1).setValue('The University of Texas at Austin');
  colleges.getRange(3, cityCol).setValue('Austin');
  colleges.getRange(3, stateCol).setValue('TX');

  const result = CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
  const travel = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);

  suite.assertEqual(result.ok, true, 'Travel Planner refresh should succeed');
  suite.assertEqual(travel.getRange(1, 1, 1, CollegeTools.Config.HEADERS.TRAVEL_PLANNER.length).getValues()[0].join('|'),
    CollegeTools.Config.HEADERS.TRAVEL_PLANNER.join('|'),
    'Travel Planner headers should be written');
  suite.assertEqual(travel.getRange(1, 15).getValue(), 'Travel Assumptions',
    'Travel assumptions should be visible outside the table');
  suite.assertEqual(travel.getRange(2, 16).getValue(), 0.79,
    'Default driving cost per mile should be seeded');
  suite.assertEqual(travel.getRange(2, 1).getValue(), 'The University of Texas at Austin',
    'Travel row should link college name');
  suite.assertEqual(travel.getRange(2, 4).getValue(), 'Dallas', 'Home City should be copied from profile');
  suite.assertEqual(travel.getRange(2, 5).getValue(), 'TX', 'Home State should be copied from profile');
  suite.assert(travel.getRange(2, 6).getValue() > 0, 'Distance should be estimated');
  suite.assert(travel.getRange(2, 12).getValue() > 0, 'Annual travel cost should be estimated');
});

suite.test('createOrUpdateTravelPlanner keeps estimates blank when profile home city is blank', () => {
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);

  const profile = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE) ||
    mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
  profile.getRange(13, 2).setValue('TX');
  profile.getRange(15, 2).setValue(4);

  colleges.getRange(3, 1).setValue('The University of Texas at Austin');
  colleges.getRange(3, cityCol).setValue('Austin');
  colleges.getRange(3, stateCol).setValue('TX');

  CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
  const travel = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
  suite.assertEqual(travel.getRange(2, 6).getValue(), '',
    'Distance should stay blank when optional Home City is blank');
  suite.assertEqual(travel.getRange(2, 12).getValue(), '',
    'Annual travel cost should stay blank when optional Home City is blank');
});


suite.test('Financial Aid Travel Costs row pulls annual estimate from Travel Planner when available', () => {
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);
  colleges.getRange(3, 1).setValue('The University of Texas at Austin');
  colleges.getRange(3, cityCol).setValue('Austin');
  colleges.getRange(3, stateCol).setValue('TX');

  const profile = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE) ||
    mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
  profile.getRange(13, 2).setValue('TX');
  profile.getRange(14, 2).setValue('Dallas');
  profile.getRange(15, 2).setValue(4);

  CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
  CollegeTools.Trackers.setupAllTrackers();

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const travelCol = CollegeTools.Utils.colIndex(fa, 'Travel Costs');
  suite.assert(fa.getRange(2, travelCol).getFormula().indexOf('Travel Planner') !== -1,
    'Travel Costs should reference the Travel Planner annual estimate');
});

suite.test('Travel Planner does not add travel estimate columns to Colleges', () => {
  const {colleges} = setupWorkbook();
  CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
  const headers = colleges.getRange(2, 1, 1, colleges.getLastColumn()).getValues()[0];

  suite.assertEqual(headers.indexOf('Distance from Home (mi)'), -1,
    'Distance should live on Travel Planner, not Colleges');
  suite.assertEqual(headers.indexOf('Annual Travel Cost'), -1,
    'Annual Travel Cost should live on Travel Planner, not Colleges');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
