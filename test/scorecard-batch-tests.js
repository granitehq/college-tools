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
        return response([]);
      });
    },
  };

  const results = CollegeTools.Scorecard.fetchCollegeDataBatch(
    ['Alpha College', 'Beta College'],
    {executionBudget: {canContinue() { return true; }}},
  );

  suite.assertEqual(waves.length, 2, 'One exact wave and one fallback wave should run');
  suite.assertEqual(waves[0].length, 2, 'Exact wave should contain both colleges');
  suite.assertEqual(waves[1].length, 1, 'Fallback wave should contain only the unmatched college');
  suite.assertEqual(results[0].data['school.name'], 'Alpha College', 'Exact result should be retained');
  suite.assertEqual(results[1].data['school.name'], 'Beta College', 'Fallback result should be retained');
});

process.exit(suite.summary() ? 0 : 1);
