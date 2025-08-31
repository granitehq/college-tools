
9. **First commit**
\`\`\`bash
git add .
git commit -m "Initial import from Apps Script"
\`\`\`

---

## B. Daily workflow

- **Pull latest from Apps Script:**  
\`\`\`bash
clasp pull
\`\`\`

- **Edit locally → commit:**  
\`\`\`bash
git add -A
git commit -m "Change X"
\`\`\`

- **Push to Apps Script:**  
\`\`\`bash
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

---

## F. Recommended repo structure
college-tools/
.clasp.json # points to bound script + rootDir
appsscript.json # manifest (scopes, timezone, etc.)
.gitignore
README.md
src/
menu.js
config.js
utils.js
scorecard.js
colleges.js
trackers.js
formatting.js
scoring.js
lookup.js


## G. Workflow summary

1. `clasp pull` to sync down any changes.  
2. Edit locally in your editor, commit with Git.  
3. `clasp push` to sync back to Apps Script.  
4. Tag versions with `clasp version` as milestones.  
5. Roll back with Git or clasp versions if needed.