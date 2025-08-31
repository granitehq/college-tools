# College Scorecard Import (Google Sheets)

This adds a **select-and-import** flow so you can choose which colleges to add.

## Files
- **College_Selection_with_Scorecard.xlsx** — updated workbook with a new **Scorecard Import** sheet and **Mappings** sheet.
- **scorecard_import.gs** — Apps Script to paste into Google Sheets.
- (Optional) Upload the .xlsx to Google Drive and open with Google Sheets.

## Setup (one-time)
1. Get a free API key at https://api.data.gov/ (choose College Scorecard).
2. Upload **College_Selection_with_Scorecard.xlsx** to Google Drive → Open with **Google Sheets**.
3. In Sheets, go to **Extensions → Apps Script**. Create a new script and paste the contents of **scorecard_import.gs**. Save.
4. Reload your sheet so the **Scorecard** menu appears.

## Use
1. Open the **Scorecard Import** sheet.
2. Put your API Key in **B3**.
3. In **B9:B** add one college name per row (e.g., “Boston College”). Optionally set **B5=state** (MA) and **B6=city** filters.
4. **Scorecard → Search**. Results fill rows starting at 13 with columns: Select, ID, Name, City, State, Ownership, Admission Rate, SAT Avg, Cost of Attendance, Avg Net Price, Retention, Grad Rate, Website.
5. Mark **TRUE** in the **Select** column for the rows you want to import.
6. **Scorecard → Import Selected**. The script appends those schools into the **Colleges** sheet, mapping fields to the right columns.
7. Add or adjust any subjective 1–5 scores and weights; Weighted/Value Scores calculate automatically.

## Notes
- Ownership maps 1→Public, 2→Private (nonprofit), 3→Private (for‑profit).
- Scorecard fields used (see Mappings sheet) include:
  - `latest.admissions.admission_rate.overall` (Acceptance Rate)
  - `latest.student.retention_rate.four_year.full_time` (First‑Year Retention)
  - `latest.completion.rate_suppressed.overall` (Grad Rate)
  - `latest.earnings.10_yrs_after_entry.median` (Median Earnings, 10y)
  - `latest.cost.attendance.academic_year` (Total Cost)
  - `latest.cost.avg_net_price.overall` (Avg Net Price)
- Some columns in your **Colleges** sheet (e.g., Program Fit, Culture Fit) remain human‑scored (1–5).
- You can safely re-run **Search** and **Import Selected** as you refine picks.

## Privacy & Limits
- Your API key is stored in cell **B3** only. Keep the sheet private.
- The API returns up to `per_page=100`; if you add many names, we search each name separately to stay precise.
- Data definitions change occasionally—verify important numbers on the school’s website.

