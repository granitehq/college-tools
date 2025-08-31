/**
 * Instructions and Help System
 * @version 1.2.1
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

  /**
   * Creates or updates the Instructions sheet with comprehensive user guide.
   */
  function createInstructionsSheet() {
    var ss = SpreadsheetApp.getActive();
    var sheet = CollegeTools.Utils.ensureSheet(ss, CollegeTools.Config.SHEET_NAMES.INSTRUCTIONS);
    sheet.clear();

    var row = 1;
    var col = 1;

    // Title Section
    sheet.getRange(row, col).setValue('🎓 College Tools - Complete User Guide');
    sheet.getRange(row, col).setFontSize(20).setFontWeight('bold').setBackground('#4285f4').setFontColor('white');
    sheet.getRange(row, col, 1, 6).merge();
    row += 2;

    sheet.getRange(row, col).setValue('Welcome to College Tools! This comprehensive system helps you research, compare, and track your college applications.');
    sheet.getRange(row, col).setFontSize(12).setBackground('#e8f0fe');
    sheet.getRange(row, col, 1, 6).merge();
    row += 3;

    // Quick Start Section
    addSectionHeader(sheet, row, '🚀 Quick Start (First Time Setup)');
    row += 2;

    var quickStartSteps = [
      '1. Get your FREE College Scorecard API key (see API Setup section below)',
      '2. Run "📋 Complete Setup (One-Time)" from the College Tools menu',
      '3. Fill out your Personal Profile sheet with your academic info',
      '4. Start adding colleges to research using "Fill current row"',
      '5. Use the trackers to manage your applications and deadlines',
    ];

    quickStartSteps.forEach(function(step) {
      sheet.getRange(row, col).setValue(step);
      sheet.getRange(row, col).setFontSize(11);
      row++;
    });
    row += 2;

    // API Key Section
    addSectionHeader(sheet, row, '🔑 College Scorecard API Setup');
    row += 2;

    var apiInstructions = [
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
    ];

    apiInstructions.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.startsWith('📍')) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#fff3cd');
      } else if (instruction.startsWith('⚠️')) {
        sheet.getRange(row, col).setBackground('#f8d7da').setFontColor('#721c24');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Personal Profile Section
    addSectionHeader(sheet, row, '📊 Your Personal Profile');
    row += 2;

    var profileInstructions = [
      'The Personal Profile sheet is your central hub for academic and financial information.',
      '',
      '📝 Fill out these key sections:',
      '   • SAT Score: Your highest composite score',
      '   • ACT Score: Your highest composite (optional if you have SAT)',
      '   • GPA: Your cumulative unweighted GPA on 4.0 scale',
      '   • Family Income: Annual household income (for financial analysis)',
      '   • State Residency: Your state (for in-state tuition calculations)',
      '',
      '💡 Pro Tip: This data feeds into ALL your college analysis automatically!',
    ];

    profileInstructions.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.startsWith('📝') || instruction.startsWith('💡')) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#d1ecf1');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // College Research Section
    addSectionHeader(sheet, row, '🏛️ Researching Colleges');
    row += 2;

    var researchInstructions = [
      '1. Adding Colleges:',
      '   • Type college name in Column A of Colleges sheet',
      '   • Click "Fill current row" to fetch official data',
      '   • Use "Fill current row (fast)" for bulk additions',
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
      '   • Admission Chances based on your test scores',
      '   • Academic Index Match score (competitiveness)',
      '   • Merit Aid Likelihood predictions',
      '   • Financial Safety analysis',
    ];

    researchInstructions.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.match(/^\d+\./)) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#e8f0fe');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Menu Guide Section
    addSectionHeader(sheet, row, '📋 Menu Guide');
    row += 2;

    var menuGuide = [
      '🎓 FOR STUDENTS & PARENTS:',
      '   • Fill current row: Get data for one college (clean, no setup)',
      '   • Fill current row (fast): Quick data fetch with optimizations',
      '   • Fill selected rows: Get data for multiple colleges (batch)',
      '   • Search College Names: Find colleges by name',
      '',
      '🔧 SETUP & CUSTOMIZATION (Run separately as needed):',
      '   • Complete Setup (One-Time): Sets up everything you need',
      '   • Add/Update Trackers: Create/update all tracking sheets',
      '   • Setup Dashboard: Create summary dashboard',
      '   • Setup Financial Intelligence: Advanced financial analysis',
      '   • Ensure Scoring Formulas: Add/update college scoring',
      '   • Enhance: Formats & Dropdowns: Improve sheet appearance',
      '',
      '⚡ PERFORMANCE & MAINTENANCE:',
      '   • Optimize Performance: Clean up and speed up sheets',
      '   • Refresh Dashboard Data: Update dashboard calculations',
      '   • Fill Regions (all rows): Auto-populate US regions',
      '',
      '🛠️ DEVELOPER & DEBUG:',
      '   • DEBUG: Fill row (verbose): Detailed diagnostic information',
      '   • Show API Quota Status: Check your API usage',
      '   • Clear API Cache: Reset cached responses',
      '   • Test College Name Validation: Check name matching',
      '   • Show version: Current College Tools version',
    ];

    menuGuide.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.startsWith('🎓') || instruction.startsWith('🔧') ||
          instruction.startsWith('⚡') || instruction.startsWith('🛠️')) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#d4edda');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Workflow Clarity Section
    addSectionHeader(sheet, row, '⚡ Workflow: Setup vs Fill Operations');
    row += 2;

    var workflowGuide = [
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
    ];

    workflowGuide.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.startsWith('🔄') || instruction.startsWith('1️⃣') ||
          instruction.startsWith('2️⃣') || instruction.startsWith('💡')) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#fff3cd');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Tracker Sheets Guide
    addSectionHeader(sheet, row, '📊 Understanding Your Tracker Sheets');
    row += 2;

    var trackerGuide = [
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
      '',
      '✅ APPLICATION STATUS TRACKER:',
      '   • Track your application progress',
      '   • Document requirements completion',
      '   • Record decisions and outcomes',
    ];

    trackerGuide.forEach(function(instruction) {
      if (instruction === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(instruction);
      if (instruction.match(/^[📈💰🏫📅🎓✅]/)) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#e8f0fe');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Tips and Best Practices
    addSectionHeader(sheet, row, '💡 Tips & Best Practices');
    row += 2;

    var tips = [
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
      '   • Use "Clear API Cache" if you get stale data',
      '   • Check "Show API Quota Status" if having issues',
      '   • Use "DEBUG: Fill row" for detailed error information',
      '',
      '🎓 APPLICATION STRATEGY:',
      '   • Aim for a balanced list: reach, match, and safety schools',
      '   • Use the Academic Index Match to gauge competitiveness',
      '   • Pay attention to Financial Safety warnings',
      '   • Track all deadlines in the Application Timeline',
    ];

    tips.forEach(function(tip) {
      if (tip === '') {
        row++;
        return;
      }
      sheet.getRange(row, col).setValue(tip);
      if (tip.match(/^[🎯📊⚠️🎓]/)) {
        sheet.getRange(row, col).setFontWeight('bold').setBackground('#fff3cd');
      }
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });
    row += 2;

    // Support Section
    addSectionHeader(sheet, row, '🆘 Getting Help');
    row += 2;

    var supportInfo = [
      '📝 Documentation: This Instructions sheet covers most common questions',
      '🐛 Bug Reports: Report issues at github.com/anthropics/claude-code/issues',
      '💡 Feature Requests: Suggest improvements in the same GitHub repository',
      '📊 Data Questions: College Scorecard data comes from the U.S. Department of Education',
      '🔄 Updates: Check "Show version" in the menu for your current version',
    ];

    supportInfo.forEach(function(info) {
      sheet.getRange(row, col).setValue(info);
      sheet.getRange(row, col, 1, 6).merge();
      row++;
    });

    // Format the sheet
    sheet.setColumnWidths(1, 6, 150);
    sheet.getRange(1, 1, row, 6).setWrap(true);
    sheet.getRange(1, 1, row, 6).setVerticalAlignment('top');

    // Move Instructions sheet to be first tab
    ss.setActiveSheet(sheet);
    ss.moveActiveSheet(1);

    SpreadsheetApp.getUi().alert('Instructions sheet created! It\'s now your first tab.');
  }

  /**
   * Helper function to add formatted section headers.
   * @param {Sheet} sheet - The sheet to add to
   * @param {number} row - The row number
   * @param {string} title - The section title
   * @private
   */
  function addSectionHeader(sheet, row, title) {
    sheet.getRange(row, 1).setValue(title);
    sheet.getRange(row, 1).setFontSize(14).setFontWeight('bold').setBackground('#34a853').setFontColor('white');
    sheet.getRange(row, 1, 1, 6).merge();
  }

  // Public API
  return {
    createInstructionsSheet: createInstructionsSheet,
  };
})();
