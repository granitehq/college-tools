#!/usr/bin/env node

/**
 * Build script for College Tools website
 * Converts markdown files to HTML and generates website files
 */

const fs = require('fs');
const path = require('path');

// File paths
const DOCS_DIR = path.join(__dirname, '..', 'docs');
const PRIVACY_MD = path.join(__dirname, '..', 'PRIVACY.md');
const TERMS_MD = path.join(__dirname, '..', 'TERMS.md');

// HTML template
const HTML_TEMPLATE = (title, content, currentPage = '') => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="College Tools - Professional college application tracking for Google Sheets">
    <title>${title} - College Tools</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="icon" href="assets/favicon/favicon.svg">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="nav">
                <div class="nav-brand">
                    <img src="assets/images/logo.svg" alt="College Tools" class="logo" width="32" height="32">
                    <span class="brand-text">College Tools</span>
                </div>
                <ul class="nav-menu">
                    <li><a href="index.html" class="${currentPage === 'home' ? 'active' : ''}">Home</a></li>
                    <li><a href="getting-started.html" class="${currentPage === 'guide' ? 'active' : ''}">Get Started</a></li>
                    <li><a href="screenshots.html" class="${currentPage === 'screenshots' ? 'active' : ''}">Features</a></li>
                    <li><a href="https://github.com/granitehq/college-tools" target="_blank">GitHub</a></li>
                </ul>
            </nav>
        </div>
    </header>

    <main class="main">
        ${content}
    </main>

    <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>College Tools</h3>
                    <p>Professional college application tracking for Google Sheets</p>
                </div>
                <div class="footer-section">
                    <h4>Legal</h4>
                    <ul>
                        <li><a href="privacy.html">Privacy Policy</a></li>
                        <li><a href="terms.html">Terms of Service</a></li>
                    </ul>
                </div>
                <div class="footer-section">
                    <h4>Support</h4>
                    <ul>
                        <li><a href="getting-started.html">Getting Started</a></li>
                        <li><a href="https://github.com/granitehq/college-tools/issues">Report Issues</a></li>
                    </ul>
                </div>
            </div>
            <div class="footer-bottom">
                <p>&copy; 2025 Granite HQ, LLC.</p>
            </div>
        </div>
    </footer>

    <!-- Cloudflare Analytics -->
    <script defer src='https://static.cloudflareinsights.com/beacon.min.js' 
            data-cf-beacon='{"token": "YOUR_TOKEN_HERE"}'></script>
</body>
</html>`;

/**
 * Convert markdown to basic HTML
 */
function markdownToHtml(markdown) {
    return markdown
        // Headers
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        // Bold/Italic
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Links
        .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, '<p>$1</p>')
        // Clean up
        .replace(/<p><h([1-6])>/g, '<h$1>')
        .replace(/<\/h([1-6])><\/p>/g, '</h$1>')
        .replace(/<p><\/p>/g, '')
        // Handle standalone bold lines properly
        .replace(/<p>(\*\*[^*]+\*\*:?)\s*<\/p>/g, '<p>$1</p>')
        .replace(/^<p>\*Last Updated:(.+?)<\/p>$/gm, '<p class="last-updated"><em>Last Updated:$1</em></p>')
        // Fix merged paragraph tags with bold headings
        .replace(/(<\/p>)(<p><strong>[^<]+<\/strong><\/p>)/g, '$1\n$2');
}

/**
 * Build the website
 */
function buildWebsite() {
    console.log('🏗️  Building College Tools website...');

    // Ensure docs directory exists
    if (!fs.existsSync(DOCS_DIR)) {
        fs.mkdirSync(DOCS_DIR, { recursive: true });
    }

    // Convert Privacy Policy
    if (fs.existsSync(PRIVACY_MD)) {
        console.log('📝 Converting PRIVACY.md to privacy.html');
        const privacyMd = fs.readFileSync(PRIVACY_MD, 'utf8');
        const privacyHtml = markdownToHtml(privacyMd);
        const privacyPage = HTML_TEMPLATE('Privacy Policy', `<div class="container"><div class="legal-content">${privacyHtml}</div></div>`, 'privacy');
        fs.writeFileSync(path.join(DOCS_DIR, 'privacy.html'), privacyPage);
    }

    // Convert Terms of Service
    if (fs.existsSync(TERMS_MD)) {
        console.log('📝 Converting TERMS.md to terms.html');
        const termsMd = fs.readFileSync(TERMS_MD, 'utf8');
        const termsHtml = markdownToHtml(termsMd);
        const termsPage = HTML_TEMPLATE('Terms of Service', `<div class="container"><div class="legal-content">${termsHtml}</div></div>`, 'terms');
        fs.writeFileSync(path.join(DOCS_DIR, 'terms.html'), termsPage);
    }

    // Create landing page
    console.log('🏠 Creating landing page');
    const landingContent = `
        <section class="hero">
            <div class="container">
                <div class="hero-content">
                    <h1>College Application Tracking Made Simple</h1>
                    <p>Professional tools for managing your college search and application process in Google Sheets</p>
                    <div class="cta-buttons">
                        <a href="https://docs.google.com/spreadsheets/d/1_DI-6_f1jTyqL3QKcWsuyRmgHFjnc6rhkp7Oqz6QqpU/copy" 
                           class="btn btn-primary" target="_blank">Get Started Free</a>
                        <a href="getting-started.html" class="btn btn-secondary">View Guide</a>
                    </div>
                </div>
                <div class="hero-image">
                    <img src="assets/images/screenshots/college-data.png" alt="College Tools - Data Import Feature" class="screenshot">
                </div>
            </div>
        </section>

        <section class="features">
            <div class="container">
                <h2>Everything You Need to Track College Applications</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📊</div>
                        <h3>College Data Import</h3>
                        <p>Automatically fetch college data from the Department of Education's College Scorecard API</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">📋</div>
                        <h3>Application Tracking</h3>
                        <p>Track deadlines, requirements, and application status across all your target schools</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">💰</div>
                        <h3>Financial Comparison</h3>
                        <p>Compare costs, financial aid, and return on investment across colleges</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🎯</div>
                        <h3>Smart Scoring</h3>
                        <p>Weighted scoring system to help evaluate and rank your college choices</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔒</div>
                        <h3>Privacy First</h3>
                        <p>All data stays in your Google Sheets. No data stored on external servers</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🆓</div>
                        <h3>100% Free</h3>
                        <p>Currently free to use. No hidden costs or subscription fees</p>
                    </div>
                </div>
            </div>
        </section>

        <section class="trust-signals">
            <div class="container">
                <div class="trust-content">
                    <h2>Trusted by Students and Families</h2>
                    <div class="trust-badges">
                        <div class="trust-badge">
                            <strong>Community Driven</strong>
                            <p>Built with feedback from real families</p>
                        </div>
                        <div class="trust-badge">
                            <strong>No Data Storage</strong>
                            <p>Your information stays in your Google account</p>
                        </div>
                        <div class="trust-badge">
                            <strong>Official Data</strong>
                            <p>Uses Department of Education APIs</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    `;

    const landingPage = HTML_TEMPLATE('Home', landingContent, 'home');
    fs.writeFileSync(path.join(DOCS_DIR, 'index.html'), landingPage);

    // Create getting started page
    console.log('📖 Creating getting started guide');
    const guideContent = `
        <div class="container">
            <div class="guide-content">
                <h1>Getting Started with College Tools</h1>
                
                <div class="step">
                    <div class="step-number">1</div>
                    <div class="step-content">
                        <h3>Get Your Copy</h3>
                        <p>Click the button below to make a copy of the College Tools spreadsheet template:</p>
                        <a href="https://docs.google.com/spreadsheets/d/1_DI-6_f1jTyqL3QKcWsuyRmgHFjnc6rhkp7Oqz6QqpU/copy" 
                           class="btn btn-primary" target="_blank">Copy Template</a>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">2</div>
                    <div class="step-content">
                        <h3>Get Your API Key</h3>
                        <p>Sign up for a free College Scorecard API key:</p>
                        <ol>
                            <li>Visit <a href="https://api.data.gov/signup/" target="_blank">api.data.gov/signup</a></li>
                            <li>Enter your email and create an account</li>
                            <li>Copy your API key</li>
                        </ol>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">3</div>
                    <div class="step-content">
                        <h3>Setup in Google Sheets</h3>
                        <p>In your spreadsheet:</p>
                        <ol>
                            <li>Go to <strong>College Tools → Quick Start</strong> in the menu</li>
                            <li>Follow the prompts to create the API key sheet</li>
                            <li>Paste your API key in cell A1</li>
                            <li>Run the setup to create all tracker sheets</li>
                        </ol>
                    </div>
                </div>

                <div class="step">
                    <div class="step-number">4</div>
                    <div class="step-content">
                        <h3>Start Adding Colleges</h3>
                        <p>You're ready to go! Add college names to the Colleges sheet and use the menu to:</p>
                        <ul>
                            <li>Fill current row with college data</li>
                            <li>Search for college names</li>
                            <li>Setup tracking sheets for applications, visits, and scholarships</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;

    const guidePage = HTML_TEMPLATE('Getting Started', guideContent, 'guide');
    fs.writeFileSync(path.join(DOCS_DIR, 'getting-started.html'), guidePage);

    // Create screenshots page
    console.log('📸 Creating screenshots gallery');
    const screenshotsContent = `
        <div class="container">
            <div class="screenshots-content">
                <h1>Features & Screenshots</h1>
                <p>See College Tools in action with these feature highlights:</p>
                
                <div class="screenshot-section">
                    <h2>College Data Import</h2>
                    <p>Automatically populate college information from official sources</p>
                    <img src="assets/images/screenshots/college-data.png" alt="College data import" class="screenshot">
                </div>

                <div class="screenshot-section">
                    <h2>Application Timeline Tracker</h2>
                    <p>Never miss a deadline with comprehensive application tracking</p>
                    <img src="assets/images/screenshots/timeline.png" alt="Application timeline" class="screenshot">
                </div>

                <div class="screenshot-section">
                    <h2>Financial Comparison</h2>
                    <p>Compare costs and financial aid across all your target schools</p>
                    <img src="assets/images/screenshots/financial.png" alt="Financial comparison" class="screenshot">
                </div>

                <div class="screenshot-section">
                    <h2>Campus Visit Planner</h2>
                    <p>Plan and track campus visits with integrated scheduling</p>
                    <img src="assets/images/screenshots/visits.png" alt="Campus visits" class="screenshot">
                </div>
            </div>
        </div>
    `;

    const screenshotsPage = HTML_TEMPLATE('Features & Screenshots', screenshotsContent, 'screenshots');
    fs.writeFileSync(path.join(DOCS_DIR, 'screenshots.html'), screenshotsPage);

    console.log('✅ Website build complete!');
    console.log(`📁 Files created in ${DOCS_DIR}/`);
    console.log('🚀 Run "npm run dev" to preview locally');
}

// Run the build
buildWebsite();