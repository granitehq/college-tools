# College Tools 🎓

**A comprehensive Google Sheets-based college selection and tracking system powered by the U.S. Department of Education's College Scorecard API.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](https://github.com/granitehq/college-tools)

## 🌟 Features

### **Core Functionality**
- **College Data Import**: Automatically fetch comprehensive college data including academics, admissions, and financial information
- **Smart Search**: Intelligent college name matching with fallback strategies
- **Data Validation**: Robust error handling and data quality checks

### **Academic Analysis**
- **Admission Chances**: Calculate admission probability based on your academic profile
- **Merit Aid Likelihood**: Predict scholarship opportunities using academic fit analysis
- **Personal Profile Integration**: Centralized academic and financial information

### **Financial Intelligence**
- **Financial Safety Analysis**: Assess affordability with 4-year burden calculations
- **Aid Requirements Tracking**: Monitor FAFSA, CSS Profile, and verification status
- **Cost Comparison**: Compare total cost of attendance across institutions

### **Organization Tools**
- **Tracker Sheets**: Financial Aid, Campus Visits, Application Timeline, Scholarships
- **Weighted Scoring**: Customizable ranking system for decision-making
- **Progress Monitoring**: Visual indicators for application completion status

## 🚀 Quick Start

### Prerequisites
- Google Account with Google Sheets access
- College Scorecard API key (free from [api.data.gov](https://api.data.gov/signup/))
- Node.js 14+ and npm (for developers)

### For End Users

1. **Get the Template**
   - Get the current template from [college-tools.granite-hq.com/getting-started](https://college-tools.granite-hq.com/getting-started) and copy it to your Google Drive
   - The template comes **pre-configured** with all sheets and features ready to use

2. **Run Quick Start**
   - Open your copied sheet and go to **College Tools → 🚀 Quick Start (API Key Check)**
   - This will check your setup status and guide you to the next steps (takes < 5 seconds)

3. **Add Your API Key** (if needed)
   - Get your free API key from [https://api.data.gov/signup/](https://api.data.gov/signup/)
   - Create a sheet named "ScorecardAPIKey"
   - Paste your API key in cell A1
   - Run Quick Start again to confirm

4. **Start Using College Tools**
   - Fill out your Personal Profile for personalized analysis
   - Use **College Tools → 🎓 For Students & Parents → Fill current row** to get college data
   - All tracker sheets, dashboard, and scoring are already set up!

# For Developers wanting to contribute/modify

## Code Quality

- **ESLint Integration** - Automated code style and syntax checking
- **Apps Script Optimized** - Configuration tailored for Google Apps Script
- **Pre-commit Hooks** - Optional git hooks for quality gates
- **Modular Architecture** - Clean separation of concerns

## Project Structure

```
src/
├── config.js       # Configuration and constants
├── utils.js        # Utility functions
├── scorecard.js    # API client with caching/retry logic
├── colleges.js     # Core college data operations
├── trackers.js     # Tracker sheet management
├── formatting.js   # Validation and formatting
├── scoring.js      # Weighted scoring system
├── lookup.js       # College search functionality
└── menu.js         # Menu setup and global adapters
```

## Development Commands

```bash
# Linting
npm run lint          # Check code style
npm run lint:fix      # Auto-fix issues
npm run lint:check    # Zero-tolerance check

# Version Management
npm run version:show  # Display current version
npm run version:patch # Increment patch (5.6.0 → 5.6.1)
npm run version:minor # Increment minor (5.6.0 → 5.7.0)
npm run version:major # Increment major (5.6.0 → 6.0.0)
npm run release       # Alias for release:prepare
npm run release:prepare # Check + patch version bump
npm run release:tag     # Create git tag from package.json version
npm run release:clasp   # Check + clasp push + Apps Script version

# Apps Script
npm run push          # Lint + npx clasp push
npm run pull          # npx clasp pull
npm run clasp:version # Create Apps Script version

# Setup
npm install           # Install dependencies
```

## Release Workflow

GitHub is the durable release record. Prepare and commit the project version first, tag that exact commit, then deploy the same code to Apps Script with clasp.

```bash
npm run release:prepare
git add -A
git commit -m "chore: release v2.6.1"
npm run release:tag
git push origin main --tags
npm run release:clasp
```

Notes:

- Replace `v2.6.1` in the commit message with the version created by `npm run release:prepare`.
- `npm run release:tag` creates `v<package.json version>`, for example `v2.6.1`.
- `npm run release:clasp` pushes to Apps Script and creates an Apps Script version; it does not create a GitHub Release.

### For Developers

1. **Clone and Setup**
   ```bash
   git clone https://github.com/granitehq/college-tools.git
   cd college-tools
   npm install
   ```

2. **Configure clasp**
   ```bash
   npm install -g @google/clasp
   npx clasp login
   npx clasp create --type sheets
   ```

3. **Deploy**
   ```bash
   npm run push
   ```

## 🔒 Security & Privacy

- **API Key Protection**: Keys stored locally in your sheets, never in version control
- **No Data Collection**: All processing happens in your Google Sheets
- **Open Source**: Full transparency with MIT license
- **User-Controlled**: You own all your college data

## 🛠️ Development

### Commands

```bash
npm run lint          # Check code style
npm run lint:fix      # Fix code style issues
npm run push          # Deploy to Google Apps Script
npm run version:patch # Bump patch version
```

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🐛 Support

- **Issues**: [GitHub Issues](https://github.com/granitehq/college-tools/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **U.S. Department of Education** for the College Scorecard API
- **Google Apps Script** platform and community

---

**Made with ❤️ to help students and families navigate college selection**

*College Tools is not affiliated with the U.S. Department of Education or Google.*
