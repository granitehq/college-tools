# Legal Documents Customization Guide

## What You MUST Change

### 🔴 REQUIRED Changes in PRIVACY.md

1. **Line 3: Last Updated Date**
   ```markdown
   *Last Updated: [Date]*
   ```
   → Change to: `*Last Updated: January 1, 2025*` (or current date)

2. **Line 62: GitHub Repository**
   ```markdown
   - GitHub Issues: https://github.com/[your-username]/college-tools/issues
   ```
   → Change to your actual GitHub username, e.g.:
   - `https://github.com/scottsmith/college-tools/issues`
   - Or remove if not using GitHub for support

3. **Line 63: Contact Email**
   ```markdown
   - Email: [your-email]
   ```
   → Change to your actual email or support email:
   - `Email: support@yourwebsite.com`
   - `Email: yourname@gmail.com`
   - Or remove if only using GitHub for support

### 🔴 REQUIRED Changes in TERMS.md

1. **Line 3: Last Updated Date**
   ```markdown
   *Last Updated: [Date]*
   ```
   → Change to: `*Last Updated: January 1, 2025*` (or current date)

2. **Line 85: Support GitHub**
   ```markdown
   - GitHub Issues: https://github.com/[your-username]/college-tools/issues
   ```
   → Change to your actual GitHub username

3. **Line 86: Support Email**
   ```markdown
   - Email: [your-email]
   ```
   → Change to your actual email

4. **Line 93: Governing Law**
   ```markdown
   These Terms shall be governed by the laws of [Your State/Country]
   ```
   → Change to your location, examples:
   - `the State of California, United States`
   - `the United States`
   - `England and Wales`

5. **Line 100: Contact GitHub**
   ```markdown
   - GitHub Issues: https://github.com/[your-username]/college-tools/issues
   ```
   → Change to your actual GitHub username

6. **Line 101: Contact Email**
   ```markdown
   - Email: [your-email]
   ```
   → Change to your actual email

## 🟡 OPTIONAL Changes to Consider

### In PRIVACY.md

1. **Data Retention Period** (Add if desired)
   After line 32, you might add:
   ```markdown
   ## Data Retention
   - We do not retain any user data
   - All data remains in your Google Sheets
   - Uninstalling the add-on immediately removes all access
   ```

2. **Geographic Scope** (Add if needed)
   ```markdown
   ## Geographic Scope
   This privacy policy applies to users worldwide. College data is specific to U.S. institutions.
   ```

3. **Update Notification Method**
   Line 53 - Consider adding how users will be notified:
   ```markdown
   Changes will be posted in this document with an updated revision date and announced via [your notification method].
   ```

### In TERMS.md

1. **Version Number**
   Consider adding after the date:
   ```markdown
   *Last Updated: January 1, 2025*
   *Version: 1.0*
   ```

2. **Specific Prohibited Uses**
   After line 26, you might add specific examples:
   ```markdown
   - Scraping or mass downloading college data
   - Using the tool for commercial purposes without permission
   - Attempting to overload the College Scorecard API
   ```

3. **Age Restrictions**
   Consider adding:
   ```markdown
   ## Age Restrictions
   This service is intended for users 13 years and older. Users under 18 should have parental consent.
   ```

## 📝 Quick Checklist

Before publishing, ensure you've updated:

- [ ] All dates to current date
- [ ] All email addresses to your actual email
- [ ] All GitHub URLs to your repository
- [ ] Governing law to your jurisdiction
- [ ] Any website URLs if you have them

## 💡 Tips

1. **Email Address**: Consider creating a dedicated support email like:
   - `collegetools@yourdomain.com`
   - `support@yourdomain.com`
   - Or use a Gmail with a '+' filter: `youremail+collegetools@gmail.com`

2. **GitHub Repository**: If you don't have one yet:
   - Create at github.com/new
   - Name it `college-tools`
   - Make it public for open source benefits

3. **Hosting These Documents**:
   - Option 1: GitHub Pages (free) - enable in repo settings
   - Option 2: Include direct links to GitHub markdown files
   - Option 3: Your personal website
   - Option 4: Google Sites (free)

4. **Updates**: When you update these documents:
   - Always update the "Last Updated" date
   - Consider keeping a changelog
   - If published on Marketplace, update the links there too

## 🔗 Where These URLs Will Be Used

Your privacy policy and terms URLs will be needed in:
1. Google Workspace Marketplace SDK configuration
2. OAuth consent screen setup (if needed)
3. Your add-on's help menu (optional but recommended)
4. Google Sheets add-on listing page

## Example Final Contact Section

Here's what a completed contact section might look like:

```markdown
## Contact Information
For questions about this privacy policy or College Tools:
- GitHub Issues: https://github.com/johndoe/college-tools/issues
- Email: john@collegetoolsapp.com
- Website: https://collegetoolsapp.com/support
```

Remember: These documents are legally binding once published, so review them carefully and consider having a legal professional review them if you plan significant distribution.