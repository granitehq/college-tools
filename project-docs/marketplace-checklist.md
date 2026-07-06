# Google Workspace Marketplace Publishing Checklist

## Pre-Submission Requirements

### ✅ Manifest Configuration (appsscript.json)
- [x] Updated to use `urlFetchAllowlist` instead of deprecated `urlFetchWhitelist`
- [x] Added `webapp` configuration for security
- [x] Added `addOns` section with common and sheets-specific configuration
- [x] Specified minimal OAuth scopes (`spreadsheets.currentonly`, `script.external_request`)

### ✅ Legal Documents
- [x] Privacy Policy created (PRIVACY.md)
- [x] Terms of Service created (TERMS.md)
- [ ] Host these documents on a public website
- [ ] Update contact information in both documents

### 📋 OAuth & Permissions
- [x] Using non-sensitive scopes (no verification needed for < 100 users)
- [ ] If planning for 100+ users: Prepare for OAuth verification
- [ ] Set up Google Cloud Project (if needed for verification)

### 📋 Marketplace Assets Needed
- [ ] App logo (required, recommended: 128x128px PNG)
- [ ] Banner image (optional but recommended: 1400x460px)
- [ ] Screenshots (at least 1, recommended: 3-5)
- [ ] Detailed description (what it does, key features)
- [ ] Short description (max 80 characters)
- [ ] Support URL/website

### 📋 Technical Requirements
- [x] URL allowlisting configured for api.data.gov
- [x] Proper error handling for API calls
- [ ] Test with multiple users to ensure stability
- [ ] Ensure all menu functions work correctly

### 📋 Store Listing Information
- [ ] App name: College Tools
- [ ] Category: Education or Productivity
- [ ] Pricing: Free
- [ ] Language: English
- [ ] Target audience: Students and Parents
- [ ] Tags: college, admissions, education, planning

## Submission Process

### 1. Google Cloud Console Setup
- [ ] Create or select a Google Cloud Project
- [ ] Enable Google Workspace Marketplace SDK
- [ ] Configure OAuth consent screen
- [ ] Add authorized domains

### 2. Marketplace SDK Configuration
- [ ] Add app configuration
- [ ] Upload logo and screenshots
- [ ] Add privacy policy URL
- [ ] Add terms of service URL
- [ ] Add support URL
- [ ] Configure OAuth scopes to match manifest

### 3. Testing
- [ ] Test with personal account
- [ ] Test with domain install (if applicable)
- [ ] Verify all features work
- [ ] Check for console errors

### 4. Submission
- [ ] Review all information for accuracy
- [ ] Submit for review
- [ ] Monitor email for review feedback

## Post-Submission

### Review Process Timeline
- Initial review: 3-7 business days
- If changes requested: Resubmit and wait another 3-7 days
- Total time to approval: 1-3 weeks typically

### Common Rejection Reasons to Avoid
- Missing or inadequate privacy policy
- Overly broad OAuth scopes
- Poor user experience or bugs
- Misleading description
- Missing support information
- Logo/branding issues

### After Approval
- [ ] Announce to users
- [ ] Monitor reviews and feedback
- [ ] Set up support process
- [ ] Plan for regular updates

## Important Notes

1. **Current Scope Status**: Your scopes are non-sensitive, so OAuth verification is not required unless you:
   - Plan to have 100+ users
   - Want to list publicly on Marketplace

2. **API Key Management**: Current setup requires users to provide their own API key, which is good for:
   - Avoiding rate limits
   - Reducing liability
   - Simplifying compliance

3. **Free vs Paid**: As a free add-on, you have fewer compliance requirements but still need:
   - Privacy policy
   - Terms of service
   - Support contact

4. **Testing Recommendation**: Before submitting, test with at least 5-10 different users to ensure stability

## Resources
- [Google Workspace Marketplace Documentation](https://developers.google.com/workspace/marketplace)
- [App Review Process](https://developers.google.com/workspace/marketplace/about-app-review)
- [Program Policies](https://developers.google.com/workspace/marketplace/terms/policies)
- [OAuth Verification FAQ](https://support.google.com/cloud/answer/13463073)