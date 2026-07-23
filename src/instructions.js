/**
 * Instructions and Help System
 * @version 2.6.6
 * @author College Tools
 * @description Creates comprehensive user instructions and help documentation
 */

/**
 * CollegeTools.Instructions - Instructions and help module
 * Creates and manages the Instructions sheet with comprehensive user guide
 */
var CollegeTools = CollegeTools || {};
CollegeTools.Instructions = (function() {
  'use strict';

  var MERGE_COLS = 6;

  /**
   * Writes one merged instruction line with optional styling.
   * @param {Sheet} sheet - Target sheet
   * @param {number} row - 1-based row number
   * @param {string} text - Line text
   * @param {Object=} style - Optional style map
   * @private
   */
  function writeMergedLine_(sheet, row, text, style) {
    var r = sheet.getRange(row, 1);
    r.setValue(text);
    if (style) {
      if (style.fontSize) r.setFontSize(style.fontSize);
      if (style.bold) r.setFontWeight('bold');
      if (style.background) r.setBackground(style.background);
      if (style.fontColor) r.setFontColor(style.fontColor);
      if (style.italic) r.setFontStyle('italic');
    }
    sheet.getRange(row, 1, 1, MERGE_COLS).merge();
  }

  /**
   * Adds a formatted section header.
   * @param {Sheet} sheet - Target sheet
   * @param {number} row - Header row
   * @param {string} title - Section title
   * @private
   */
  function addSectionHeader_(sheet, row, title) {
    writeMergedLine_(sheet, row, title, {
      fontSize: 14,
      bold: true,
      background: '#34a853',
      fontColor: 'white',
    });
  }

  /**
   * Returns per-line style based on section rules.
   * @param {string} line - Instruction line
   * @param {Object} section - Section descriptor
   * @returns {Object} Style object
   * @private
   */
  function styleForLine_(line, section) {
    var style = {fontSize: 11};
    var rules = section.highlightRules || [];
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].test(line)) {
        if (rules[i].bold) style.bold = true;
        if (rules[i].background) style.background = rules[i].background;
        if (rules[i].fontColor) style.fontColor = rules[i].fontColor;
        if (rules[i].italic) style.italic = true;
      }
    }
    return style;
  }

  /**
   * Renders one section from declarative data.
   * @param {Sheet} sheet - Target sheet
   * @param {number} row - Starting row
   * @param {Object} section - Section descriptor
   * @returns {number} Next available row
   * @private
   */
  function renderSection_(sheet, row, section) {
    addSectionHeader_(sheet, row, section.title);
    row += 2;

    var lines = section.lines || [];
    for (var i = 0; i < lines.length; i++) {
      if (lines[i] === '') {
        row++;
        continue;
      }
      writeMergedLine_(sheet, row, lines[i], styleForLine_(lines[i], section));
      row++;
    }

    return row + 2;
  }

  /**
   * Creates or updates the Instructions sheet with comprehensive user guide.
   */
  function createInstructionsSheet() {
    var ss = SpreadsheetApp.getActive();
    var sheet = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.INSTRUCTIONS);
    sheet.clear();

    var row = 1;

    writeMergedLine_(sheet, row, '🎓 College Tools - Complete User Guide', {
      fontSize: 20,
      bold: true,
      background: '#4285f4',
      fontColor: 'white',
    });
    row += 2;

    writeMergedLine_(sheet, row,
      'Welcome to College Tools! This comprehensive system helps you research, compare, and track your college applications.',
      {fontSize: 12, background: '#e8f0fe'});
    row += 2;

    writeMergedLine_(sheet, row,
      '🔗 Get the latest template: https://college-tools.granite-hq.com/getting-started',
      {fontSize: 10, background: '#f8f9fa', fontColor: '#6c757d'});
    row += 2;

    var sections = [
      {
        title: '🚀 Quick Start (New User Setup)',
        highlightRules: [
          {test: function(line) {
            return line.indexOf('✅') === 0;
          }, bold: true, background: '#d4edda'},
        ],
        lines: [
          '1. Run "🚀 Quick Start (API Key Check)" from the College Tools menu (takes < 5 seconds)',
          '2. If needed, get your FREE API key from https://api.data.gov/signup/',
          '3. Create "ScorecardAPIKey" sheet and paste your key in cell A1',
          '4. Run Quick Start again to confirm - you\'re ready to go!',
          '5. Fill out your Personal Profile sheet with your academic info',
          '6. Start researching colleges using "Fill current row"',
          '',
          '✅ This spreadsheet comes PRE-CONFIGURED with all features ready!',
          '✅ No need to run the long "Complete Setup" unless troubleshooting',
        ],
      },
      {
        title: '🔑 College Scorecard API Setup',
        highlightRules: [
          {test: function(line) {
            return line.indexOf('📍') === 0;
          }, bold: true, background: '#fff3cd'},
          {test: function(line) {
            return line.indexOf('⚠️') === 0;
          }, background: '#f8d7da', fontColor: '#721c24'},
        ],
        lines: [
          '📍 What is this? The College Scorecard API provides official government data about colleges.',
          '',
          '📍 How to get your FREE API key:',
          '   1. Visit: https://api.data.gov/signup/',
          '   2. Fill out the simple form (takes 30 seconds)',
          '   3. Check your email for the API key',
          '   4. Copy the key to the "ScorecardAPIKey" sheet',
          '',
          '📍 Where to store it:',
          '   • Go to the "ScorecardAPIKey" sheet (tab at bottom)',
          '   • Put your API key in cell A1',
          '   • Keep this sheet - your key is saved automatically',
          '',
          '⚠️  Important: Without an API key, you cannot fetch college data!',
        ],
      },
      {
        title: '📊 Your Personal Profile',
        highlightRules: [
          {test: function(line) {
            return line.indexOf('📝') === 0 || line.indexOf('💡') === 0;
          }, bold: true, background: '#d1ecf1'},
        ],
        lines: [
          'The Personal Profile sheet is your central hub for academic and financial information.',
          '',
          '📝 Fill out these key sections:',
          '   • SAT Score: Your highest composite score',
          '   • ACT Score: Your highest composite (optional if you have SAT)',
          '   • GPA: Your cumulative unweighted GPA on 4.0 scale',
          '   • Family Income: Annual household income (for financial analysis)',
          '   • Home State: Your home/residency state for tuition and travel estimates',
          '   • Home City: Optional, used for approximate travel distance',
          '   • Trips Home Per Year: Optional, used for annual travel cost estimates',
          '',
          '💡 Pro Tip: This data feeds into ALL your college analysis automatically!',
        ],
      },
      {
        title: '🏛️ Researching Colleges',
        highlightRules: [
          {test: function(line) {
            return /^\d+\./.test(line);
          }, bold: true, background: '#e8f0fe'},
        ],
        lines: [
          '1. Adding Colleges:',
          '   • Type college name in Column A of Colleges sheet',
          '   • Click "Fill current row" to fetch official data',
          '   • Use "Fill selected rows" for bulk additions',
          '',
          '2. Available Data:',
          '   • Admission rates, costs, graduation rates',
          '   • SAT/ACT score ranges',
          '   • Earnings after graduation',
          '   • Financial aid information',
          '',
          '3. Your Custom Ratings:',
          '   • Rate each college 1-5 on factors important to you',
          '   • Program Fit, Campus Culture, Research Opportunities, etc.',
          '   • Weighted scores calculated automatically',
          '',
          '4. Smart Analysis:',
          '   • Admission Fit (Reach/Match/Likely) based on your test scores and GPA',
          '   • Financial Safety analysis',
        ],
      },
      {
        title: '📋 Menu Guide',
        highlightRules: [
          {
            test: function(line) {
              return line.indexOf('🎓') === 0 || line.indexOf('🛠️') === 0 ||
                line.indexOf('ℹ️') === 0;
            },
            bold: true,
            background: '#d4edda',
          },
        ],
        lines: [
          '🎓 FOR STUDENTS & PARENTS:',
          '   • Fill current row: Get data for one college',
          '   • Fill selected rows: Get data for multiple colleges (batch)',
          '   • Search College Names: Find colleges by name',
          '',
          '🛠️ ADVANCED / SETUP (rarely needed day-to-day; mostly used when',
          '   customizing features or troubleshooting):',
          '   • Add/Update Trackers: Create/update all tracking sheets',
          '   • Setup Dashboard: Create summary dashboard',
          '   • Setup Financial Intelligence: Advanced financial analysis',
          '   • Ensure Scoring Formulas: Add/update college scoring',
          '   • Enhance: Formats & Dropdowns: Improve sheet appearance',
          '   • Optimize Performance: Clean up and speed up sheets',
          '   • Refresh Dashboard Data: Update dashboard calculations',
          '   • Refresh Travel Planner: Recalculate travel estimates',
          '   • Repair Validations & Dropdowns: Reapply formatting and dropdown rules',
          '   • Repair College Sync Across Tabs: Re-sync tracker college names',
          '   • Repair Entire Workbook: Run all major repair steps in one pass',
          '   • Fill Regions (all rows): Auto-populate US regions',
          '   • Complete Setup (Re-run): Re-run full setup if troubleshooting',
          '   • Register for Updates, DEBUG: Fill row (verbose), Clear API Cache:',
          '     developer/diagnostic tools, safe to ignore otherwise',
          '',
          '   Travel Planner notes: uses optional Home City, Home State, and',
          '   Trips Home Per Year. Travel estimates are offline approximations',
          '   and can be overwritten manually. If Home City is blank, travel',
          '   fields stay blank.',
          '',
          'ℹ️ ABOUT:',
          '   • Show version: Current College Tools version',
        ],
      },
      {
        title: '⚡ Workflow: Setup vs Fill Operations',
        highlightRules: [
          {
            test: function(line) {
              return line.indexOf('🔄') === 0 || line.indexOf('1️⃣') === 0 ||
                line.indexOf('2️⃣') === 0 || line.indexOf('💡') === 0;
            },
            bold: true,
            background: '#fff3cd',
          },
        ],
        lines: [
          '🔄 CLEAN SEPARATION FOR BETTER PERFORMANCE:',
          '',
          '1️⃣ INITIAL SETUP (Run once or as needed):',
          '   • Complete Setup (One-Time) - Creates all sheets and features',
          '   • Add/Update Trackers - Updates tracking sheets only',
          '   • Setup specific features (Dashboard, Financial, etc.)',
          '',
          '2️⃣ DAILY COLLEGE RESEARCH (Fast & clean):',
          '   • Fill current row - Pure data fetching, no setup overhead',
          '   • Fill selected rows - Batch data fetching, no setup dialogs',
          '   • These operations are now optimized for speed!',
          '',
          '💡 Key Change: Fill operations no longer run tracker setup automatically.',
          '   This eliminates setup dialogs and makes research much faster.',
        ],
      },
      {
        title: '📊 Understanding Your Tracker Sheets',
        highlightRules: [
          {test: function(line) {
            return /^[📈💰🏫📅🎓✅]/.test(line);
          }, bold: true, background: '#e8f0fe'},
        ],
        lines: [
          '📈 DASHBOARD:',
          '   Your command center with key metrics and progress tracking',
          '',
          '💰 FINANCIAL AID TRACKER:',
          '   • Track FAFSA, CSS Profile, and scholarship deadlines',
          '   • Compare financial aid packages',
          '   • Calculate your actual costs and family burden',
          '',
          '🏫 CAMPUS VISIT TRACKER:',
          '   • Plan and record campus visits',
          '   • Rate your impressions and experiences',
          '   • Track follow-up actions',
          '',
          '📅 APPLICATION TIMELINE:',
          '   • All your deadlines in one place',
          '   • Automatic countdown warnings',
          '   • Priority levels and completion tracking',
          '',
          '🎓 SCHOLARSHIP TRACKER:',
          '   • External scholarship opportunities',
          '   • Requirements and deadlines',
          '   • Application status and awards',
          '   Where to find scholarships: Fastweb (fastweb.com), Scholarships.com,',
          '   Going Merry (goingmerry.com), your state\'s 529/scholarship portal,',
          '   and your school counselor\'s local scholarship list.',
          '',
          '✅ APPLICATION STATUS TRACKER:',
          '   • Track your application progress',
          '   • Document requirements completion',
          '   • Record decisions and outcomes',
        ],
      },
      {
        title: '💡 Tips & Best Practices',
        highlightRules: [
          {test: function(line) {
            return /^[🎯📊⚠️🎓]/.test(line);
          }, bold: true, background: '#fff3cd'},
        ],
        lines: [
          '🎯 EFFICIENCY TIPS:',
          '   • Use "Fill selected rows" to batch process multiple colleges',
          '   • Run "Optimize Performance" monthly to keep sheets fast',
          '   • Use the Dashboard for quick overview of your progress',
          '',
          '📊 DATA MANAGEMENT:',
          '   • Keep your Personal Profile updated - it affects all calculations',
          '   • Regularly backup your spreadsheet',
          '   • Use consistent college names for best API matching',
          '',
          '⚠️ TROUBLESHOOTING:',
          '   • If data won\'t load, check your API key in ScorecardAPIKey sheet',
          '   • Use "Repair Entire Workbook" if a downloaded copy has stale sample data or broken dropdowns',
          '   • Use "Clear API Cache" if you get stale data',
          '   • Use "DEBUG: Fill row" for detailed error information',
          '',
          '🎓 APPLICATION STRATEGY:',
          '   • Aim for a balanced list: reach, match, and safety schools',
          '   • Use the Admission Fit column to gauge competitiveness',
          '   • Pay attention to Financial Safety warnings',
          '   • Track all deadlines in the Application Timeline',
        ],
      },
      {
        title: '🆘 Getting Help',
        lines: [
          '📝 Documentation: This Instructions sheet covers most common questions',
          '🐛 Bug Reports: Report issues at github.com/granitehq/college-tools/issues',
          '💡 Feature Requests: Suggest improvements in the same GitHub repository',
          '📊 Data Questions: College Scorecard data comes from the U.S. Department of Education',
          '🔄 Updates: Check "Show version" in the menu for your current version',
        ],
      },
    ];

    for (var s = 0; s < sections.length; s++) {
      row = renderSection_(sheet, row, sections[s]);
    }

    sheet.setColumnWidths(1, MERGE_COLS, 150);
    sheet.getRange(1, 1, row, MERGE_COLS).setWrap(true);
    sheet.getRange(1, 1, row, MERGE_COLS).setVerticalAlignment('top');

    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);

    SpreadsheetApp.getUi().alert('Instructions sheet created! It\'s now your first tab.');
  }

  return {
    createInstructionsSheet: createInstructionsSheet,
  };
})();
