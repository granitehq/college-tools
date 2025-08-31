# Security Policy

## Supported Versions

Security updates are provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | ✅ Yes             |
| 1.x     | ⚠️ Critical only   |
| < 1.0   | ❌ No              |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly:

### 🔒 For Security Issues

**DO NOT** create a public GitHub issue for security vulnerabilities.

**DO** report privately by:
1. Creating a [Security Advisory](https://github.com/your-username/college-tools/security/advisories/new)
2. Or emailing: security@your-domain.com

### 📝 What to Include

- Description of the vulnerability
- Steps to reproduce the issue  
- Potential impact assessment
- Suggested fix (if known)

### ⏰ Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies by severity

## Security Measures

### 🔐 API Key Protection
- API keys are stored locally in user's Google Sheets
- Never transmitted to external servers (except Google's APIs)
- Excluded from version control via `.gitignore`
- Validation prevents placeholder/demo keys

### 🛡️ Data Privacy
- No user data collection or tracking
- All processing happens in user's Google environment
- No external dependencies beyond Google APIs
- User maintains full data ownership

### 🏗️ Code Security
- Regular dependency updates
- ESLint security rules enabled
- Input validation and sanitization
- Error handling prevents information disclosure

### 🔄 Google Apps Script Security
- Runs in Google's sandboxed environment
- Limited to Google Workspace APIs
- No file system or network access beyond APIs
- User authorization required for all operations

## Best Practices for Users

### 🔑 API Key Management
- Keep your College Scorecard API key private
- Don't share sheets containing API keys
- Use unique API keys per installation
- Regenerate keys if compromised

### 📊 Sheet Sharing
- Be cautious when sharing sheets publicly
- Remove personal/sensitive data before sharing
- Use "View Only" permissions for templates
- Make copies rather than sharing originals

### 🔒 Apps Script Security
- Only install from trusted sources
- Review permissions before authorizing
- Regularly audit installed scripts
- Remove unused scripts and permissions

## Scope

This security policy covers:
- ✅ College Tools source code
- ✅ Google Apps Script implementation
- ✅ API integrations
- ❌ Google Sheets platform itself
- ❌ Third-party dependencies (report to respective projects)
- ❌ User's Google account security

## Contact

For security concerns: security@your-domain.com
For general issues: [GitHub Issues](https://github.com/your-username/college-tools/issues)