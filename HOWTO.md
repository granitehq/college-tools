
## A2. Setup ESLint (one-time)

1. **Install dependencies:**  
\`\`\`bash
npm install
\`\`\`

2. **Verify ESLint setup:**  
\`\`\`bash
npm run lint          # Should run without errors
\`\`\`

3. **Install pre-commit hook (optional):**  
\`\`\`bash
ln -s ../../.githooks/pre-commit .git/hooks/pre-commit
\`\`\`
This will automatically run linting before each commit.

## B. Daily workflow

- **Pull latest from Apps Script:**  
\`\`\`bash
clasp pull
\`\`\`

- **Edit locally → lint → commit:**  
\`\`\`bash
npm run lint          # Check for style/syntax issues
npm run lint:fix       # Auto-fix fixable issues
git add -A
git commit -m "Change X"
\`\`\`

- **Push to Apps Script (with linting):**  
\`\`\`bash
npm run push           # Runs lint check + clasp push
# OR manually:
npm run lint:check     # Ensures no linting errors/warnings
clasp push
\`\`\`

- **Tag a version (optional):**  
\`\`\`bash
clasp version "v5.3 – add batch fill"
\`\`\`

---

## C. Safe rollback

- **With Git:**  
\`\`\`bash
git log
git checkout <good_commit>
clasp push
\`\`\`

- **With clasp versions:**  
\`\`\`bash
clasp versions
# checkout commit from that version, then clasp push
\`\`\`

---

## D. Multiple machines / team use

- Run `clasp login` once per machine.
- Clone the same Script ID.
- Use Git branches/PRs as usual.
- Only `clasp push` from the branch you want live.

---

## E. Troubleshooting cheatsheet

- **403 / 404 on push/pull** → Wrong Google account. Run `clasp login --status`. Logout/login again.  
- **API disabled** → Toggle ON at [user settings](https://script.google.com/home/usersettings).  
- **Mixed accounts** → Use Incognito for `clasp login`.  
- **No update after push** → Refresh the spreadsheet.  
- **Root directory confusion** → Check `.clasp.json` has `"rootDir": "src"` if using subfolder.

## G. Workflow summary

1. `clasp pull` to sync down any changes.  
2. Edit locally in your editor.
3. `npm run lint:fix` to auto-fix style issues.
4. `git add -A && git commit -m "message"` to commit changes.
5. `npm run push` to lint check + sync back to Apps Script.  
6. Tag versions with `clasp version` as milestones.  
7. Roll back with Git or clasp versions if needed.

## H. ESLint commands

- `npm run lint` - Check code style and syntax
- `npm run lint:fix` - Auto-fix fixable issues  
- `npm run lint:check` - Lint with zero tolerance (used in CI)
- `npm run push` - Lint + clasp push in one command

## I. Version management

- `npm run version:show` - Display current version
- `npm run version:patch` - Increment patch version (5.6.0 → 5.6.1)
- `npm run version:minor` - Increment minor version (5.6.0 → 5.7.0)  
- `npm run version:major` - Increment major version (5.6.0 → 6.0.0)
- `npm run version:update 5.7.0` - Set specific version
- `npm run release` - Patch version + lint + push to Apps Script
- `npm run clasp:version "description"` - Create Apps Script version