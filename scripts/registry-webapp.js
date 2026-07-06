/**
 * Standalone Apps Script Web App for the College Tools copy registry.
 *
 * Deployment notes:
 * 1. Create a standalone Apps Script project.
 * 2. Set script properties:
 *    - COLLEGE_TOOLS_REGISTRY_SECRET: shared secret matching template copies.
 *    - COLLEGE_TOOLS_REGISTRY_SHEET_ID: backing spreadsheet ID.
 * 3. Create a sheet named "Registry" with this header row:
 *    scriptId | spreadsheetId | spreadsheetUrl | ownerEmail | lastSeenVersion | lastSeenTimestamp
 * 4. Deploy as a Web App executing as you and accessible by Anyone.
 */

var SHARED_SECRET_PROPERTY = 'COLLEGE_TOOLS_REGISTRY_SECRET';
var REGISTRY_SHEET_ID_PROPERTY = 'COLLEGE_TOOLS_REGISTRY_SHEET_ID';
var REGISTRY_SHEET_NAME = 'Registry';
var REGISTRY_HEADERS = [
  'scriptId',
  'spreadsheetId',
  'spreadsheetUrl',
  'ownerEmail',
  'lastSeenVersion',
  'lastSeenTimestamp',
];

/**
 * Receives copy registration posts and upserts them by script ID.
 *
 * @param {GoogleAppsScript.Events.DoPost} e Apps Script post event.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents || '{}');
    if (data.secret !== getRequiredScriptProperty(SHARED_SECRET_PROPERTY)) {
      return jsonResponse({status: 'rejected'}, 403);
    }

    var sheet = getRegistrySheet();
    ensureHeaderRow(sheet);
    upsertRegistration(sheet, data);

    return jsonResponse({status: 'ok'}, 200);
  } catch (err) {
    console.error('Registry post failed', err);
    return jsonResponse({status: 'error', message: String(err)}, 500);
  }
}

/**
 * Inserts or updates one registration row.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Registry sheet.
 * @param {Object} data Registration payload.
 */
function upsertRegistration(sheet, data) {
  var scriptId = requiredPayloadValue(data, 'scriptId');
  var rowData = [
    scriptId,
    requiredPayloadValue(data, 'spreadsheetId'),
    data.spreadsheetUrl || '',
    data.ownerEmail || '',
    requiredPayloadValue(data, 'version'),
    data.timestamp || new Date().toISOString(),
  ];
  var rows = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] === scriptId) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

/**
 * Gets the configured registry sheet.
 *
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getRegistrySheet() {
  var spreadsheetId = getRequiredScriptProperty(REGISTRY_SHEET_ID_PROPERTY);
  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(REGISTRY_SHEET_NAME);
  if (!sheet) {
    throw new Error('Missing sheet named ' + REGISTRY_SHEET_NAME);
  }
  return sheet;
}

/**
 * Creates the expected header row when the sheet is empty.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Registry sheet.
 */
function ensureHeaderRow(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REGISTRY_HEADERS);
  }
}

/**
 * Reads a required script property.
 *
 * @param {string} key Property key.
 * @return {string}
 */
function getRequiredScriptProperty(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error('Missing script property ' + key);
  }
  return value;
}

/**
 * Reads a required payload value.
 *
 * @param {Object} data Payload object.
 * @param {string} key Payload key.
 * @return {string}
 */
function requiredPayloadValue(data, key) {
  if (!data[key]) {
    throw new Error('Missing payload field ' + key);
  }
  return data[key];
}

/**
 * Builds a JSON response. Apps Script Web Apps ignore custom HTTP status codes,
 * so the code is included in the body for diagnostics.
 *
 * @param {Object} body Response body.
 * @param {number} code Diagnostic status code.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(body, code) {
  body.code = code;
  return ContentService.createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
