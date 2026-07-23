/**
 * Copy registration for direct push updates
 * @version 2.6.6
 * @author College Tools
 * @description Registers copied spreadsheets with the internal update registry once per version
 */

/**
 * CollegeTools.Registration - Phone-home registration module
 * Registers each copied spreadsheet/script project with an internal registry so
 * release pushes can update known copies via the Apps Script API.
 *
 * The shared secret below lives in this copy's script properties, which the
 * copy owner can read. It is a casual-abuse gate, not a security boundary — the
 * registry treats every entry as self-asserted telemetry. See scripts/
 * registry-webapp.js for the server-side trust model and input bounds.
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Registration = (function() {
  'use strict';

  var DOCUMENT_VERSION_PROPERTY = 'lastRegisteredVersion';
  var SECRET_PROPERTY = 'COLLEGE_TOOLS_REGISTRY_SECRET';

  /**
   * Registers this script project with the central registry if this version has
   * not already been reported.
   *
   * The registry endpoint and shared secret intentionally live outside source
   * control. Set them in CollegeTools.Config.REGISTRATION_CONFIG before
   * deployment, and set the shared secret in script properties under
   * COLLEGE_TOOLS_REGISTRY_SECRET.
   *
   * @return {{ok: boolean, skipped: boolean, reason: string}}
   */
  function registerIfNeeded() {
    var config = CollegeTools.Config.REGISTRATION_CONFIG || {};
    var endpoint = config.ENDPOINT_URL;
    var version = CollegeTools.Config.VERSION;

    if (!endpoint) {
      return {ok: true, skipped: true, reason: 'registration endpoint not configured'};
    }

    var documentProperties = PropertiesService.getDocumentProperties();
    if (documentProperties.getProperty(DOCUMENT_VERSION_PROPERTY) === version) {
      return {ok: true, skipped: true, reason: 'version already registered'};
    }

    var sharedSecret = PropertiesService.getScriptProperties().getProperty(SECRET_PROPERTY);
    if (!sharedSecret) {
      Logger.log('Registration skipped: missing script property ' + SECRET_PROPERTY);
      return {ok: false, skipped: true, reason: 'shared secret not configured'};
    }

    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    var payload = {
      scriptId: ScriptApp.getScriptId(),
      spreadsheetId: spreadsheet.getId(),
      spreadsheetUrl: spreadsheet.getUrl(),
      ownerEmail: Session.getEffectiveUser().getEmail(),
      version: version,
      timestamp: new Date().toISOString(),
      secret: sharedSecret,
    };

    try {
      var response = UrlFetchApp.fetch(endpoint, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });
      var responseCode = response.getResponseCode();
      var responseText = response.getContentText();
      var registryResponse = parseRegistryResponse(responseText);

      if (responseCode >= 200 && responseCode < 300 && isRegistrySuccess(registryResponse)) {
        documentProperties.setProperty(DOCUMENT_VERSION_PROPERTY, version);
        return {ok: true, skipped: false, reason: 'registered'};
      }

      Logger.log('Registration failed with HTTP ' + responseCode + ': ' + responseText);
      return {
        ok: false,
        skipped: false,
        reason: registryFailureReason(responseCode, registryResponse),
      };
    } catch (err) {
      Logger.log('Registration failed: ' + err);
      return {ok: false, skipped: false, reason: String(err)};
    }
  }


  /**
   * Parses the registry JSON response body.
   *
   * @param {string} responseText Registry response body.
   * @return {Object}
   */
  function parseRegistryResponse(responseText) {
    try {
      return JSON.parse(responseText || '{}');
    } catch (err) {
      return {status: 'error', message: 'invalid registry response JSON'};
    }
  }

  /**
   * Checks whether the registry body confirms a successful upsert.
   *
   * @param {Object} body Parsed registry response.
   * @return {boolean}
   */
  function isRegistrySuccess(body) {
    var bodyCode = Number(body.code || 200);
    return body.status === 'ok' && bodyCode >= 200 && bodyCode < 300;
  }

  /**
   * Builds a diagnostic failure reason from the registry response.
   *
   * @param {number} httpCode UrlFetch HTTP status.
   * @param {Object} body Parsed registry response.
   * @return {string}
   */
  function registryFailureReason(httpCode, body) {
    if (body && body.message) {
      return String(body.message);
    }
    if (body && body.status) {
      return 'registry returned status ' + body.status;
    }
    return 'registry returned HTTP ' + httpCode;
  }

  /**
   * Runs registration from an explicit menu action and reports the result.
   *
   * @return {{ok: boolean, skipped: boolean, reason: string}}
   */
  function registerCurrentCopy() {
    var result = registerIfNeeded();
    var ui = SpreadsheetApp.getUi();
    var title = result.ok ? 'Registration Complete' : 'Registration Not Complete';
    ui.alert(title, result.reason, ui.ButtonSet.OK);
    return result;
  }

  return {
    registerIfNeeded: registerIfNeeded,
    registerCurrentCopy: registerCurrentCopy,
  };
})();
