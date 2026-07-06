/**
 * Copy registration for direct push updates
 * @version 2.6.3
 * @author College Tools
 * @description Registers copied spreadsheets with the internal update registry once per version
 */

/**
 * CollegeTools.Registration - Phone-home registration module
 * Registers each copied spreadsheet/script project with an internal registry so
 * release pushes can update known copies via the Apps Script API.
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

      if (responseCode >= 200 && responseCode < 300) {
        documentProperties.setProperty(DOCUMENT_VERSION_PROPERTY, version);
        return {ok: true, skipped: false, reason: 'registered'};
      }

      Logger.log('Registration failed with HTTP ' + responseCode + ': ' + response.getContentText());
      return {ok: false, skipped: false, reason: 'registry returned HTTP ' + responseCode};
    } catch (err) {
      Logger.log('Registration failed: ' + err);
      return {ok: false, skipped: false, reason: String(err)};
    }
  }

  return {
    registerIfNeeded: registerIfNeeded,
  };
})();
