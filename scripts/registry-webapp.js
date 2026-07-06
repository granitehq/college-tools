/**
 * Standalone Apps Script Web App for the College Tools copy registry.
 *
 * TRUST MODEL: the shared secret ships inside every distributed copy's script
 * properties, which a copy owner can read in the Apps Script editor. It is
 * therefore a low-friction gate against casual/anonymous posts, NOT a real
 * authenticator — treat every row as untrusted, self-asserted telemetry. The
 * bounds below (payload size, field length, row cap) limit the blast radius if
 * the secret leaks; they are not a substitute for per-copy authentication.
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

// Input bounds — keep a leaked secret from ballooning the registry.
var MAX_PAYLOAD_BYTES = 8192;
var MAX_FIELD_LENGTH = 2048;
var MAX_REGISTRY_ROWS = 100000;

/**
 * Receives copy registration posts and upserts them by script ID.
 *
 * @param {GoogleAppsScript.Events.DoPost} e Apps Script post event.
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    if (raw.length > MAX_PAYLOAD_BYTES) {
      return jsonResponse({status: 'rejected', message: 'payload too large'}, 413);
    }

    var data = JSON.parse(raw || '{}');
    if (!constantTimeEquals(data.secret, getRequiredScriptProperty(SHARED_SECRET_PROPERTY))) {
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
 * Compares two strings without early-exit timing leaks. Not a strong guarantee
 * in a GC'd runtime, but avoids the trivial length/prefix side channel of !==.
 *
 * @param {*} a First value.
 * @param {*} b Second value.
 * @return {boolean}
 */
function constantTimeEquals(a, b) {
  a = String(a == null ? '' : a);
  b = String(b == null ? '' : b);
  var max = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * Truncates a payload field to a bounded length string.
 *
 * @param {*} value Raw field value.
 * @return {string}
 */
function boundedField(value) {
  var s = String(value == null ? '' : value);
  return s.length > MAX_FIELD_LENGTH ? s.slice(0, MAX_FIELD_LENGTH) : s;
}

/**
 * Inserts or updates one registration row.
 *
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet Registry sheet.
 * @param {Object} data Registration payload.
 */
function upsertRegistration(sheet, data) {
  var scriptId = boundedField(requiredPayloadValue(data, 'scriptId'));
  var rowData = [
    scriptId,
    boundedField(requiredPayloadValue(data, 'spreadsheetId')),
    boundedField(data.spreadsheetUrl || ''),
    boundedField(data.ownerEmail || ''),
    boundedField(requiredPayloadValue(data, 'version')),
    boundedField(data.timestamp || new Date().toISOString()),
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
    // Cap total registrations so a leaked secret can't grow the sheet without
    // bound. Existing copies (updates) are always allowed through above.
    if (rows.length - 1 >= MAX_REGISTRY_ROWS) {
      throw new Error('registry row cap reached');
    }
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
