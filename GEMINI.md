# Project: College Tools 🎓

## Project Overview

This project is a comprehensive Google Sheets-based college selection and tracking system. It leverages the U.S. Department of Education's College Scorecard API to automatically fetch and integrate college data into Google Sheets, providing users with tools for academic analysis, financial intelligence, and organizational tracking during the college application process.

The core logic is implemented using Google Apps Script (JavaScript) files located in the `src/` directory, which are deployed to a Google Sheet. Development tooling relies on Node.js and npm for tasks like linting, version management, and deployment.

**Key Features:**
*   **College Data Import**: Fetches comprehensive college data using the College Scorecard API.
*   **Academic Analysis**: Calculates admission probability and merit aid likelihood.
*   **Financial Intelligence**: Assesses affordability and tracks aid requirements.
*   **Organization Tools**: Provides tracker sheets (Financial Aid, Campus Visits, Application Timeline, Scholarships) and a weighted scoring system.

**Technologies Used:**
*   **Frontend/Logic**: Google Sheets, Google Apps Script (JavaScript)
*   **API Integration**: U.S. Department of Education's College Scorecard API
*   **Development Tools**: Node.js, npm, `@google/clasp`, ESLint

## Building and Running

This project is primarily deployed and run within Google Sheets. For development, the following commands are used:

### Prerequisites
*   Google Account with Google Sheets access
*   College Scorecard API key (obtained from api.data.gov)
*   Node.js 14+ and npm (for developers)
*   `@google/clasp` globally installed (`npm install -g @google/clasp`)

### For End Users
1.  **Get the Template**: Copy the [College Tools Template Sheet](https://docs.google.com/spreadsheets/d/1_DI-6_f1jTyqL3QKcWsuyRmgHFjnc6rhkp7Oqz6QqpU/copy) to your Google Drive.
2.  **Run Quick Start**: Open the copied sheet and navigate to `College Tools → 🚀 Quick Start (API Key Check)`.
3.  **Add Your API Key**: Create a sheet named "ScorecardAPIKey" and paste your API key into cell A1. Run Quick Start again to confirm.
4.  **Start Using**: Fill out your Personal Profile and use `College Tools → 🎓 For Students & Parents → Fill current row` to get college data.

### For Developers

1.  **Clone and Setup**:
    ```bash
    git clone https://github.com/granitehq/college-tools.git
    cd college-tools
    npm install
    ```
2.  **Configure clasp**:
    ```bash
    clasp login
    clasp create --type sheets # Link to an existing Google Sheet or create a new one
    ```
3.  **Deploy**:
    ```bash
    npm run push # Lints and deploys the Apps Script code to the linked Google Sheet
    ```

### Key Development Commands:

*   **Linting**:
    *   `npm run lint`: Check code style.
    *   `npm run lint:fix`: Auto-fix code style issues.
    *   `npm run lint:check`: Zero-tolerance linting check.
*   **Deployment**:
    *   `npm run push`: Lints and deploys the `src/` code to Google Apps Script.
    *   `npm run pull`: Pulls the Apps Script code from Google to the local `src/` directory.
    *   `npm run clasp:version`: Creates an Apps Script version.
*   **Version Management**:
    *   `npm run version:show`: Displays the current project version.
    *   `npm run version:patch`: Increments the patch version.
    *   `npm run version:minor`: Increments the minor version.
    *   `npm run version:major`: Increments the major version.
    *   `npm run release`: Increments the patch version, lints, and deploys.

## Development Conventions

*   **Code Style**: Enforced using ESLint with a configuration tailored for Google Apps Script. `npm run lint:check` is used for pre-commit and pre-push hooks to maintain code quality.
*   **Modular Architecture**: The `src/` directory is organized into modules with clear separation of concerns (e.g., `scorecard.js` for API client, `colleges.js` for data operations, `menu.js` for UI integration).
*   **API Key Protection**: API keys are stored locally in Google Sheets by the user and are not committed to version control.
*   **Testing**: The `test/` directory contains various tests including `basic-functionality-tests.js`, `functionality-tests.js`, `regression-tests.js`, and `syntax-tests.js`.
*   **Contribution**: Contributions follow a standard GitHub flow (fork, feature branch, commit, push, pull request).
