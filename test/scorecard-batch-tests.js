/**
 * Concurrent College Scorecard batch fetch tests.
 */
const {createHarness, TestSuite} = require('./support');

const harness = createHarness(['config.js', 'utils.js', 'scorecard.js']);
const {CollegeTools, mockSpreadsheet} = harness;
const suite = new TestSuite();

function response(results, statusCode) {
  return {
    getResponseCode() {
      return statusCode || 200;
    },
    getContentText() {
      return JSON.stringify({results});
    },
  };
}

suite.test('fetchCollegeDataBatch runs exact and fallback requests in concurrent waves', () => {
  const keySheet = mockSpreadsheet.insertSheet(CollegeTools.Config.SHEET_NAMES.API_KEY);
  keySheet.getRange('A1').setValue('valid-api-key-123');
  const waves = [];

  global.UrlFetchApp = {
    fetch() {
      throw new Error('Healthy batch should not use serial fetch');
    },
    fetchAll(requests) {
      waves.push(requests);
      return requests.map((request) => {
        const url = decodeURIComponent(request.url);
        if (url.includes('Alpha College')) {
          return response([{'school.name': 'Alpha College'}]);
        }
        if (url.includes('~.*Beta College.*')) {
          return response([{'school.name': 'Beta College'}]);
        }
        if (url.includes('school.search=MIT')) {
          return response([{'school.name': 'Massachusetts Institute of Technology'}]);
        }
        return response([]);
      });
    },
  };

  const results = CollegeTools.Scorecard.fetchCollegeDataBatch(
    ['Alpha College', 'Beta College', 'MIT'],
    {executionBudget: {canContinue() { return true; }}},
  );

  suite.assertEqual(waves.length, 3, 'Exact, regex, and fuzzy fallback waves should run');
  suite.assertEqual(waves[0].length, 3, 'Exact wave should contain every college');
  suite.assertEqual(waves[1].length, 2, 'Regex wave should contain only exact misses');
  suite.assertEqual(waves[2].length, 1, 'Fuzzy wave should contain only regex misses');
  suite.assertEqual(results[0].data['school.name'], 'Alpha College', 'Exact result should be retained');
  suite.assertEqual(results[1].data['school.name'], 'Beta College', 'Fallback result should be retained');
  suite.assertEqual(results[2].data['school.name'], 'Massachusetts Institute of Technology',
    'Fuzzy fallback should resolve a common abbreviation');
});

suite.test('fetchCollegeDataBatch limits each concurrent wave to the configured safe size', () => {
  const keySheet = mockSpreadsheet.getSheetByName(CollegeTools.Config.SHEET_NAMES.API_KEY);
  keySheet.getRange('A1').setValue('valid-api-key-123');
  const waveSizes = [];
  const originalSize = CollegeTools.Config.API_CONFIG.BATCH_FETCH_SIZE;
  CollegeTools.Config.API_CONFIG.BATCH_FETCH_SIZE = 2;

  global.UrlFetchApp = {
    fetch() {
      throw new Error('Healthy batch should not use serial fetch');
    },
    fetchAll(requests) {
      waveSizes.push(requests.length);
      return requests.map((request) => response([{
        'school.name': decodeURIComponent(request.url),
      }]));
    },
  };

  CollegeTools.Scorecard.fetchCollegeDataBatch(
    ['One', 'Two', 'Three', 'Four', 'Five'],
    {executionBudget: {canContinue() { return true; }}},
  );
  CollegeTools.Config.API_CONFIG.BATCH_FETCH_SIZE = originalSize;

  suite.assert(waveSizes.every((size) => size <= 2),
    'No fetchAll wave should exceed the configured concurrency limit');
});

process.exit(suite.summary() ? 0 : 1);
