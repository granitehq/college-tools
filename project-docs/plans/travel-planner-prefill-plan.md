# Travel Planner Prefill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional home-location profile fields and an offline approximate Travel Planner sheet that pre-fills distance, travel mode, time, and travel cost estimates without bloating the Colleges sheet.

**Architecture:** Keep `Colleges` focused on college research data and add a separate `Travel Planner` sheet linked by college row/name. `Personal Profile` exposes `Home City`, `Home State`, and `Trips Home Per Year`; the existing `State_Residency` named range is preserved behind the visible `Home State` label so current tuition formulas keep working. Travel estimates are offline and approximate, using a curated coordinate table plus formulas/helpers; blank profile fields leave travel outputs blank instead of failing. Travel cost assumptions are editable on the Travel Planner sheet and seeded with defaults when blank.

**Tech Stack:** Google Apps Script V8, current `CollegeTools.*` namespace modules, Node regression harness in `test/`, no live network calls or external maps APIs.

---

## Product Decisions

- Keep `Region` as a low-stakes Colleges field for now: plain value/dropdown, derived when possible, manual if needed, never a setup blocker.
- Do not add six travel columns to `Colleges`. Put travel outputs in a new `Travel Planner` sheet.
- If an existing live workbook already has travel columns on `Colleges`, the script must not delete them. The user will manually delete old `Colleges` travel columns after verifying `Travel Planner`.
- `Home State` replaces the visible `State Residency` label in `Personal Profile`, but the named range remains `State_Residency` for compatibility.
- The three optional profile fields are:
  - `Home City`
  - `Home State`
  - `Trips Home Per Year`
- If `Home City` or `Home State` is blank or cannot be matched offline, travel estimate cells stay blank.
- If `Trips Home Per Year` is blank, annual travel cost stays blank; the field note suggests `4` as a common default.
- Travel cost assumptions live on `Travel Planner` in columns O:P and are editable: driving cost per mile, drive threshold, drive-or-fly threshold, medium flight cost, long flight cost, and long-flight mileage threshold.
- No additional profile fields are justified right now. I reviewed current sheet fields, and no other three profile fields can reliably prefill six or more useful downstream fields without creating stale/speculative defaults.

## File Structure

- Modify `src/config.js`: add `TRAVEL_PLANNER` sheet name and `HEADERS.TRAVEL_PLANNER`.
- Modify `src/schema.js`: add Travel Planner metadata and column keys.
- Create `src/travel.js`: own offline coordinate lookup, distance/time/cost helpers, Travel Planner sheet creation, sync, and formula/value refresh.
- Modify `src/financial.js`: relabel profile field, add `Home_City`, `Home_State`, and `Trips_Home_Per_Year` named ranges, preserve `State_Residency` pointing to Home State.
- Modify `src/trackers.js`: call Travel Planner setup/sync after tracker setup, and make Financial Aid `Travel Costs` optionally pull from Travel Planner annual cost.
- Modify `src/colleges.js`: sync Travel Planner when a college row is filled or no-match tracker sync occurs.
- Do not add or remove any `Colleges` travel columns; `Colleges` remains the source for college name, city, and state only.
- Modify `src/setup.js`: include Travel Planner refresh in repair/setup flow.
- Modify `src/formatting.js`: add Travel Planner number/dropdown formats, including currency/number formats for the editable assumptions in columns O:P.
- Modify `src/menu.js`: add global adapter and menu item for refreshing Travel Planner estimates.
- Modify `src/instructions.js`: update Personal Profile and travel guidance.
- Modify `.clasp.json`: include `src/travel.js` in `filePushOrder` after `src/formulas.js` and before modules that call it.
- Modify `scripts/update-version.js`: include `src/travel.js` in source header updates.
- Add tests in `test/travel-tests.js` and update existing regression/schema/menu/syntax tests.

## Travel Planner Sheet Columns

Header row 1, data starts row 2:

1. `College Name`
2. `College City`
3. `College State`
4. `Home City`
5. `Home State`
6. `Distance from Home (mi)`
7. `Likely Travel Mode`
8. `Estimated Drive Time`
9. `Estimated Flight/Travel Time`
10. `Travel Cost per Trip`
11. `Trips Home Per Year`
12. `Annual Travel Cost`
13. `Notes`

Editable settings live outside the table in `O1:P7`:

- `Travel Assumptions`
- `Driving Cost per Mile`: default `0.79`
- `Drive Max Miles`: default `250`
- `Drive-or-Fly Max Miles`: default `700`
- `Medium Flight Cost`: default `450`
- `Long Flight Cost`: default `800`
- `Long Flight Threshold Miles`: default `1500`

Rows align with Colleges rows using the existing offset convention: Colleges row 3 maps to Travel Planner row 2.

## Estimation Rules

- Coordinates are approximate city centroids. Start with a small curated table for common home/college cities and all state capitals; city table can grow over time.
- If city is unknown but state is known, fall back to the state capital coordinate and put a note such as `Used state-level estimate`.
- Distance uses haversine miles rounded to the nearest 10 miles.
- Likely mode:
  - `< 250 mi`: `Drive`
  - `250-700 mi`: `Drive or Fly`
  - `> 700 mi`: `Fly`
- Drive time: distance / 60 mph, rounded to nearest 0.5 hours, blank if distance blank.
- Flight/travel time: `2 + distance / 500`, rounded to nearest 0.5 hours, blank if distance blank.
- Travel cost per trip:
  - Drive: distance * 2 * configured `Driving Cost per Mile`
  - Drive or Fly: max of drive estimate and configured `Medium Flight Cost`
  - Fly: configured `Medium Flight Cost` under the long-flight threshold, configured `Long Flight Cost` at/above that threshold
- Annual travel cost: `Travel Cost per Trip * Trips Home Per Year`, blank if trips blank.

---

### Task 1: Add Travel Planner Config And Schema

**Files:**
- Modify: `src/config.js`
- Modify: `src/schema.js`
- Test: `test/config-schema-tests.js`
- Test: `test/schema-metadata-tests.js`

- [ ] **Step 1: Write failing config tests**

Add assertions in `test/config-schema-tests.js`:

```js
suite.test('travel planner sheet and headers are configured', () => {
  suite.assertEqual(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER, 'Travel Planner',
    'Travel Planner sheet name should be configured');
  suite.assertEqual(CollegeTools.Config.HEADERS.TRAVEL_PLANNER.join('|'),
    [
      'College Name', 'College City', 'College State', 'Home City', 'Home State',
      'Distance from Home (mi)', 'Likely Travel Mode', 'Estimated Drive Time',
      'Estimated Flight/Travel Time', 'Travel Cost per Trip', 'Trips Home Per Year',
      'Annual Travel Cost', 'Notes',
    ].join('|'),
  'Travel Planner headers should stay stable');
});
```

Add assertions in `test/schema-metadata-tests.js`:

```js
suite.test('schema declares Travel Planner row convention and key columns', () => {
  const sheet = CollegeTools.Schema.getSheet('TRAVEL_PLANNER');
  suite.assertEqual(sheet.sheetName, CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER,
    'Travel Planner schema should use configured sheet name');
  suite.assertEqual(sheet.headerRow, 1, 'Travel Planner headers should be on row 1');
  suite.assertEqual(sheet.dataStartRow, 2, 'Travel Planner data should start on row 2');
  suite.assertEqual(sheet.columns.COLLEGE_NAME, 'College Name', 'College Name key should exist');
  suite.assertEqual(sheet.columns.ANNUAL_TRAVEL_COST, 'Annual Travel Cost',
    'Annual Travel Cost key should exist');
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm run test:schema
node test/schema-metadata-tests.js
```

Expected: failures because `TRAVEL_PLANNER` is not configured and schema does not declare it.

- [ ] **Step 3: Implement config**

In `src/config.js`, add to `SHEET_NAMES`:

```js
TRAVEL_PLANNER: 'Travel Planner',
```

Add to `HEADERS`:

```js
TRAVEL_PLANNER: [
  'College Name', 'College City', 'College State', 'Home City', 'Home State',
  'Distance from Home (mi)', 'Likely Travel Mode', 'Estimated Drive Time',
  'Estimated Flight/Travel Time', 'Travel Cost per Trip', 'Trips Home Per Year',
  'Annual Travel Cost', 'Notes',
],
```

- [ ] **Step 4: Implement schema metadata**

In `src/schema.js`, add a `TRAVEL_PLANNER` entry:

```js
TRAVEL_PLANNER: {
  sheetName: CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER,
  headerRow: 1,
  dataStartRow: 2,
  headers: CollegeTools.Config.HEADERS.TRAVEL_PLANNER,
  columns: keyMap(CollegeTools.Config.HEADERS.TRAVEL_PLANNER, [
    ['COLLEGE_NAME', 'College Name'],
    ['COLLEGE_CITY', 'College City'],
    ['COLLEGE_STATE', 'College State'],
    ['HOME_CITY', 'Home City'],
    ['HOME_STATE', 'Home State'],
    ['DISTANCE_MILES', 'Distance from Home (mi)'],
    ['LIKELY_TRAVEL_MODE', 'Likely Travel Mode'],
    ['ESTIMATED_DRIVE_TIME', 'Estimated Drive Time'],
    ['ESTIMATED_FLIGHT_TIME', 'Estimated Flight/Travel Time'],
    ['TRAVEL_COST_PER_TRIP', 'Travel Cost per Trip'],
    ['TRIPS_HOME_PER_YEAR', 'Trips Home Per Year'],
    ['ANNUAL_TRAVEL_COST', 'Annual Travel Cost'],
    ['NOTES', 'Notes'],
  ]),
  apiColumns: {},
  userColumns: setFromKeys(['NOTES']),
  formulaColumns: {},
  linkedColumns: setFromKeys([
    'COLLEGE_NAME', 'COLLEGE_CITY', 'COLLEGE_STATE', 'HOME_CITY', 'HOME_STATE',
    'DISTANCE_MILES', 'LIKELY_TRAVEL_MODE', 'ESTIMATED_DRIVE_TIME',
    'ESTIMATED_FLIGHT_TIME', 'TRAVEL_COST_PER_TRIP', 'TRIPS_HOME_PER_YEAR',
    'ANNUAL_TRAVEL_COST',
  ]),
},
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
npm run test:schema
node test/schema-metadata-tests.js
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/config.js src/schema.js test/config-schema-tests.js test/schema-metadata-tests.js
git commit -m "Add travel planner schema"
```

---

### Task 2: Add Optional Home Profile Fields

**Files:**
- Modify: `src/financial.js`
- Modify: `src/instructions.js`
- Test: `test/financial-profile-tests.js` or existing financial/setup test file if one already covers profile creation

- [ ] **Step 1: Write failing profile test**

Create `test/financial-profile-tests.js` with harness modules `config.js`, `utils.js`, `financial.js` and assertions:

```js
const {createHarness, TestSuite} = require('./support');

const harness = createHarness(['config.js', 'utils.js', 'financial.js']);
const {CollegeTools, mockSpreadsheet} = harness;
const suite = new TestSuite();

suite.test('Personal Profile exposes optional home fields and preserves State_Residency', () => {
  CollegeTools.Financial.runFinancialSetup_();
  const profile = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);

  suite.assertEqual(profile.getRange(13, 1).getValue(), 'Home State:',
    'Visible residency label should be Home State');
  suite.assertEqual(profile.getRange(14, 1).getValue(), 'Home City:',
    'Home City should be present');
  suite.assertEqual(profile.getRange(15, 1).getValue(), 'Trips Home Per Year:',
    'Trips Home Per Year should be present');
});

const success = suite.summary();
process.exit(success ? 0 : 1);
```

If the harness does not expose named ranges, extend `MockSpreadsheet.setNamedRange()` to record them and assert:

```js
suite.assertEqual(mockSpreadsheet.namedRanges.State_Residency.a1, 'B13',
  'State_Residency should continue pointing at Home State');
suite.assertEqual(mockSpreadsheet.namedRanges.Home_State.a1, 'B13',
  'Home_State should point at the same cell');
suite.assertEqual(mockSpreadsheet.namedRanges.Home_City.a1, 'B14',
  'Home_City should point at the Home City cell');
suite.assertEqual(mockSpreadsheet.namedRanges.Trips_Home_Per_Year.a1, 'B15',
  'Trips_Home_Per_Year should point at the trips cell');
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node test/financial-profile-tests.js
```

Expected: fails because profile fields are not present.

- [ ] **Step 3: Implement profile fields**

In `src/financial.js`, change profile creation rows:

```js
sheet.getRange(13, 1).setValue('Home State:');
sheet.getRange(14, 1).setValue('Home City:');
sheet.getRange(15, 1).setValue('Trips Home Per Year:');

ss.setNamedRange('State_Residency', sheet.getRange(13, 2));
ss.setNamedRange('Home_State', sheet.getRange(13, 2));
ss.setNamedRange('Home_City', sheet.getRange(14, 2));
ss.setNamedRange('Trips_Home_Per_Year', sheet.getRange(15, 2));
```

Update formatting:

```js
sheet.getRange(13, 2).setNote('Two-letter home/residency state code (e.g., CA, NY, TX)');
sheet.getRange(13, 3).setValue('Used for in-state tuition and travel estimates');
sheet.getRange(14, 2).setBackground('#d1ecf1').setBorder(true, true, true, true, false, false);
sheet.getRange(14, 2).setNote('Optional home city for approximate travel estimates');
sheet.getRange(14, 3).setValue('Optional');
sheet.getRange(15, 2).setBackground('#d1ecf1').setBorder(true, true, true, true, false, false);
sheet.getRange(15, 2).setNote('Optional number of round trips home per year; use 4 if unsure');
sheet.getRange(15, 3).setValue('Optional');
```

Add `sheet.getRange(14, 2)` and `sheet.getRange(15, 2)` to the unprotected ranges.

- [ ] **Step 4: Update instructions text**

In `src/instructions.js`, replace the State Residency bullet with:

```js
'   • Home State: Your home/residency state for tuition and travel estimates',
'   • Home City: Optional, used for approximate travel distance',
'   • Trips Home Per Year: Optional, used for annual travel cost estimates',
```

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
node test/financial-profile-tests.js
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/financial.js src/instructions.js test/financial-profile-tests.js test/support.js
git commit -m "Add optional home profile fields"
```

---

### Task 3: Build Offline Travel Estimation Module

**Files:**
- Create: `src/travel.js`
- Modify: `.clasp.json`
- Modify: `scripts/update-version.js`
- Test: `test/travel-tests.js`
- Test: `test/syntax-tests.js`

- [ ] **Step 1: Write failing helper tests**

Add `test/travel-tests.js`:

```js
const {createHarness, TestSuite} = require('./support');

const harness = createHarness(['config.js', 'utils.js', 'schema.js', 'travel.js']);
const {CollegeTools} = harness;
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

const success = suite.summary();
process.exit(success ? 0 : 1);
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
node test/travel-tests.js
```

Expected: fails because `src/travel.js` does not exist.

- [ ] **Step 3: Implement `src/travel.js` public API**

Create module skeleton:

```js
/**
 * Offline travel estimate helpers and Travel Planner sheet maintenance.
 * @version 2.6.5
 * @author College Tools
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Travel = (function() {
  'use strict';

  var CITY_COORDS = {
    'TX|AUSTIN': {lat: 30.2672, lon: -97.7431},
    'TX|DALLAS': {lat: 32.7767, lon: -96.7970},
    'CA|BERKELEY': {lat: 37.8715, lon: -122.2730},
    'CA|SACRAMENTO': {lat: 38.5816, lon: -121.4944},
    'NY|NEW YORK': {lat: 40.7128, lon: -74.0060},
    'MA|BOSTON': {lat: 42.3601, lon: -71.0589},
  };

  var STATE_CAPITAL_CITY = {
    TX: 'Austin', CA: 'Sacramento', NY: 'Albany', MA: 'Boston', FL: 'Tallahassee',
    GA: 'Atlanta', IL: 'Springfield', PA: 'Harrisburg', VA: 'Richmond', NC: 'Raleigh',
  };

  function normalizeState_(state) {
    return (state || '').toString().trim().toUpperCase();
  }

  function normalizeCity_(city) {
    return (city || '').toString().trim().toUpperCase();
  }

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

  function roundToNearest_(value, increment) {
    return Math.round(value / increment) * increment;
  }

  function estimateTravel(input) {
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
    var assumptions = input.assumptions || defaultAssumptions_();
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

  return {
    estimateTravel: estimateTravel,
  };
})();
```

- [ ] **Step 4: Add Apps Script file order**

In `.clasp.json`, add:

```json
"src/travel.js"
```

after `src/formulas.js` and before `src/trackers.js`.

In `scripts/update-version.js`, add `src/travel.js` to the `SOURCE_FILES` list.

- [ ] **Step 5: Run tests and verify pass**

Run:

```bash
node test/travel-tests.js
npm run test:syntax
```

Expected: all tests pass and syntax test confirms `src/travel.js` is included in `filePushOrder`.

- [ ] **Step 6: Commit**

```bash
git add src/travel.js .clasp.json scripts/update-version.js test/travel-tests.js test/syntax-tests.js
git commit -m "Add offline travel estimator"
```

---

### Task 4: Create And Sync Travel Planner Sheet

**Files:**
- Modify: `src/travel.js`
- Modify: `src/trackers.js`
- Modify: `src/colleges.js`
- Test: `test/travel-tests.js`
- Test: `test/regression-tests.js`

- [ ] **Step 1: Write failing sheet sync tests**

Add to `test/travel-tests.js`:

```js
suite.test('createOrUpdateTravelPlanner creates headers and estimates linked college rows', () => {
  const {mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);

  const profile = mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
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
  suite.assertEqual(travel.getRange(2, 1).getValue(), 'The University of Texas at Austin',
    'Travel row should link college name');
  suite.assertEqual(travel.getRange(2, 4).getValue(), 'Dallas', 'Home City should be copied from profile');
  suite.assertEqual(travel.getRange(2, 5).getValue(), 'TX', 'Home State should be copied from profile');
  suite.assert(travel.getRange(2, 6).getValue() > 0, 'Distance should be estimated');
  suite.assert(travel.getRange(2, 12).getValue() > 0, 'Annual travel cost should be estimated');
});

suite.test('createOrUpdateTravelPlanner keeps estimates blank when profile home city is blank', () => {
  const {mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);

  const profile = mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
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
```

- [ ] **Step 2: Run test and verify fail**

Run:

```bash
node test/travel-tests.js
```

Expected: fails because `createOrUpdateTravelPlanner` is not implemented.

- [ ] **Step 3: Implement profile read helper**

In `src/travel.js`, add:

```js
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
```

- [ ] **Step 4: Implement Travel Planner refresh**

In `src/travel.js`, add:

```js
function createOrUpdateTravelPlanner(opts) {
  opts = opts || {};
  var ss = SpreadsheetApp.getActive();
  var colleges = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.COLLEGES);
  var travel = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
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
    travel.getRange(2, 1, travel.getLastRow() - 1, CollegeTools.Config.HEADERS.TRAVEL_PLANNER.length).clearContent();
  }
  if (rows.length) {
    travel.getRange(2, 1, rows.length, CollegeTools.Config.HEADERS.TRAVEL_PLANNER.length).setValues(rows);
  }
  if (!opts.suppressAlert) SpreadsheetApp.getUi().alert('Travel Planner refreshed for ' + rows.length + ' college(s).');
  return {ok: true, count: rows.length};
}
```

Expose it:

```js
return {
  estimateTravel: estimateTravel,
  createOrUpdateTravelPlanner: createOrUpdateTravelPlanner,
};
```

- [ ] **Step 5: Wire tracker setup and college fill**

In `src/trackers.js`, after tracker sheet creation in `setupAllTrackers`, call:

```js
if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
  CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
}
```

In `src/colleges.js`, after successful `syncCollegeToTrackers`, call the same suppressed refresh. Also call it in the no-match path after syncing the typed name so the Travel Planner row appears with blanks if city/state are unavailable.

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
node test/travel-tests.js
npm run test:regression
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/travel.js src/trackers.js src/colleges.js test/travel-tests.js test/regression-tests.js
git commit -m "Create travel planner refresh"
```

---

### Task 5: Pull Travel Estimate Into Financial Aid Tracker

**Files:**
- Modify: `src/trackers.js`
- Modify: `src/formulas.js` if a helper is preferred
- Test: `test/travel-tests.js`
- Test: `test/college-scorecard-fields-tests.js` if affected by tracker cost behavior

- [ ] **Step 1: Write failing Financial Aid prefill test**

Add to `test/travel-tests.js`:

```js
suite.test('Financial Aid Travel Costs row pulls annual estimate from Travel Planner when available', () => {
  const {mockSpreadsheet, setupWorkbook, getCollegeColumn} = harness;
  const {colleges} = setupWorkbook();
  const cityCol = getCollegeColumn('City', colleges);
  const stateCol = getCollegeColumn('State', colleges);
  colleges.getRange(3, 1).setValue('The University of Texas at Austin');
  colleges.getRange(3, cityCol).setValue('Austin');
  colleges.getRange(3, stateCol).setValue('TX');

  const profile = mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.PERSONAL_PROFILE);
  profile.getRange(13, 2).setValue('TX');
  profile.getRange(14, 2).setValue('Dallas');
  profile.getRange(15, 2).setValue(4);

  CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
  CollegeTools.Trackers.setupAllTrackers({suppressAlert: true});

  const fa = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.FINANCIAL_AID);
  const travelCol = CollegeTools.Utils.colIndex(fa, 'Travel Costs');
  suite.assert(fa.getRange(2, travelCol).getFormula().indexOf('Travel Planner') !== -1,
    'Travel Costs should reference the Travel Planner annual estimate');
});
```

- [ ] **Step 2: Run test and verify fail**

Run:

```bash
node test/travel-tests.js
```

Expected: fails because Financial Aid `Travel Costs` has no Travel Planner formula.

- [ ] **Step 3: Implement formula in Financial Aid setup**

In `src/trackers.js`, inside `createOrUpdateFinAid`, locate `Travel Costs` column:

```js
var travelCostsCol = CollegeTools.Utils.colIndex(sh, 'Travel Costs');
if (travelCostsCol) {
  sh.getRange(r2, travelCostsCol).setFormula(
    '=IFERROR(INDEX('Travel Planner'!L:L,MATCH(A2,'Travel Planner'!A:A,0)), "")');
}
```

This formula stays blank if Travel Planner has no row or no estimate, and the family can overwrite specific rows after setup.

- [ ] **Step 4: Run tests and verify pass**

Run:

```bash
node test/travel-tests.js
npm run test:regression
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/trackers.js test/travel-tests.js
git commit -m "Prefill financial aid travel costs"
```

---

### Task 6: Add Menu, Formatting, And Instructions

**Files:**
- Modify: `src/menu.js`
- Modify: `src/formatting.js`
- Modify: `src/instructions.js`
- Test: `test/menu-wiring-tests.js`
- Test: `test/validation-coverage-tests.js`
- Test: `test/instructions-tests.js`

- [ ] **Step 1: Write failing menu test**

In `test/menu-wiring-tests.js`, add expectation that `refreshTravelPlanner` exists as a global adapter and is referenced by a menu item.

```js
suite.test('travel planner refresh menu item is present', () => {
  suite.assert(menuSource.includes('Refresh Travel Planner'),
    'Menu should expose Refresh Travel Planner');
  suite.assert(menuSource.includes('refreshTravelPlanner'),
    'Menu should wire Refresh Travel Planner to a global adapter');
});
```

- [ ] **Step 2: Run menu test and verify fail**

Run:

```bash
npm run test:menu
```

Expected: fails because menu item and adapter do not exist.

- [ ] **Step 3: Implement menu adapter**

In `src/menu.js`, add under setup/repair-related items:

```js
.addItem('Refresh Travel Planner', 'refreshTravelPlanner')
```

Add global adapter:

```js
function refreshTravelPlanner() {
  return CollegeTools.Travel.createOrUpdateTravelPlanner();
}
```

- [ ] **Step 4: Add formatting**

In `src/formatting.js`, add Travel Planner formatting block:

```js
var travel = ss.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
if (travel) {
  sectionsApplied.push(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
  var travelFormats = fmts(['Distance from Home (mi)'], '0')
    .concat(fmts(['Estimated Drive Time', 'Estimated Flight/Travel Time'], '0.0'))
    .concat(fmts(['Travel Cost per Trip', 'Annual Travel Cost'], '$#,##0'))
    .concat(fmts(['Trips Home Per Year'], '0'));
  var travelValidations = [
    {header: 'Likely Travel Mode', rule: listRule_(['Drive', 'Drive or Fly', 'Fly'])},
  ];
  applyColumnFormatsAndValidations_(travel, 1, travelFormats, travelValidations, true);
}
```

- [ ] **Step 5: Update instructions**

In `src/instructions.js`, add concise guidance:

```js
'   • Travel Planner: Uses optional Home City, Home State, and Trips Home Per Year',
'   • Estimates are offline approximations and can be overwritten manually',
'   • If Home City is blank, travel fields stay blank',
```

- [ ] **Step 6: Run tests and verify pass**

Run:

```bash
npm run test:menu
npm run test:validation
node test/instructions-tests.js
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/menu.js src/formatting.js src/instructions.js test/menu-wiring-tests.js test/validation-coverage-tests.js test/instructions-tests.js
git commit -m "Add travel planner menu and guidance"
```

---

### Task 7: Setup And Repair Integration

**Files:**
- Modify: `src/setup.js`
- Modify: `src/trackers.js`
- Test: `test/workbook-repair-tests.js`
- Test: `test/template-integrity-tests.js`

- [ ] **Step 1: Write failing repair integration test**

In `test/workbook-repair-tests.js`, add assertion to existing repair test:

```js
const travel = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.TRAVEL_PLANNER);
suite.assert(travel, 'Workbook repair should create or refresh Travel Planner');
suite.assertEqual(travel.getRange(2, 1).getValue(), 'Sample College',
  'Travel Planner should stay aligned with Colleges rows during repair');
```

Use the actual college name present in that test fixture.

- [ ] **Step 2: Run repair test and verify fail**

Run:

```bash
npm run test:repair
```

Expected: fails because repair does not create/refresh Travel Planner.

- [ ] **Step 3: Integrate setup repair**

In `src/setup.js`, inside `repairEntireWorkbook`, after region refresh and before dashboard refresh:

```js
var travelResult = {ok: true, count: 0};
if (CollegeTools.Travel && CollegeTools.Travel.createOrUpdateTravelPlanner) {
  travelResult = CollegeTools.Travel.createOrUpdateTravelPlanner({suppressAlert: true});
}
```

Include it in the completion message:

```js
'Travel rows refreshed: ' + travelResult.count + '
' +
```

- [ ] **Step 4: Run repair test and verify pass**

Run:

```bash
npm run test:repair
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/setup.js test/workbook-repair-tests.js test/template-integrity-tests.js
git commit -m "Refresh travel planner during repair"
```

---

### Task 8: Full Verification And Release Branch Hygiene

**Files:**
- All modified files

- [ ] **Step 1: Run focused travel tests**

Run:

```bash
node test/travel-tests.js
```

Expected: all travel tests pass with 0 failures.

- [ ] **Step 2: Run full gate**

Run:

```bash
npm run check
```

Expected: ESLint passes and every Node harness test passes.

- [ ] **Step 3: Run whitespace check**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git status --short --branch
git diff --stat
```

Expected: only travel/profile/planner implementation files are modified.

- [ ] **Step 5: Commit final cleanup if needed**

If formatting or test updates remain after prior task commits:

```bash
git add src test .clasp.json scripts/update-version.js project-docs/travel-planner-prefill-plan.md
git commit -m "Finalize travel planner prefill"
```

- [ ] **Step 6: Merge through required branch flow**

After review, merge the feature branch into `development`, then merge `development` into `main` before versioning/deploying. Do not commit this feature directly to `main`.

## Self-Review

- Spec coverage: The plan covers optional profile fields, `Home State` replacing visible `State Residency`, a separate Travel Planner sheet, offline estimates, no failures when profile fields are blank, Financial Aid travel prefill, menu/repair/setup integration, and full verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: The plan consistently uses `TRAVEL_PLANNER`, `Travel Planner`, `Home_City`, `Home_State`, `Trips_Home_Per_Year`, and `Annual Travel Cost`.
