
# Roadmap Items

## Now ✅

- ✅ Production release ready  
- ✅ Enhanced version dialog for developer menu
- ✅ Input sanitization and validation system

## Next

### Security Enhancements (High Priority)
- **Enhanced Error Handling**: Sanitize error messages to prevent information disclosure
- **Cache Security Hardening**: 
  - Upgrade from MD5 to SHA-256 for cache keys
  - Implement cache expiration policies  
  - Add cache invalidation mechanisms
- **Rate Limiting Enhancements**:
  - Per-user rate limiting for shared spreadsheets
  - Enhanced quota management with user identification

### Development Quality
- **Unit Testing Framework**: Add comprehensive test coverage for critical functions
- **TypeScript Migration**: Better type safety and development experience
- **Audit Logging**: Add structured logging for security events



## Future







4. Deadline reminders

For Application Timeline, add a script that emails you (or posts to a Google Chat/Slack webhook) when a deadline is within X days. This means you don’t have to stare at the sheet to know you’re in trouble.

5. Campus visit calendar export

Push confirmed Visit Date entries to Google Calendar with a script, so you get them alongside your regular schedule. Bonus: include address from Scorecard’s location if available.


7. Scholarship import

There’s no Scorecard-style API for scholarships, but you could make a form for your family to fill in scholarships as they find them. Responses drop straight into the Scholarship Tracker, already in the right column format.


Other ideas:

# Top 10 College Spreadsheet Features - Implementation Guide







## 7. Auto-Calculate Travel Time/Cost
**Value: 8/10 | Ease: 8/10**

**What it is:** Estimates travel costs based on distance.

**Location:** New columns in Master Sheet

**Implementation:**
```
Column 1: "Travel Time (hours)"
=IF(Distance<200,Distance/60,IF(Distance<1000,2+Distance/500,4+Distance/500))

Column 2: "Travel Cost per Trip"
=IF(Distance<200,Distance*0.65,IF(Distance<1000,250,400))

Column 3: "Annual Travel Cost" 
=Travel_Cost_Per_Trip*4
```

---


## 9. Side-by-Side Comparison Tool
**Value: 8/10 | Ease: 6/10**

**What it is:** Compare 3-4 schools directly on key metrics.

**Location:** New sheet called "Quick Compare"

**Implementation:**
```
Layout:
        School 1    School 2    School 3    School 4
Metric  [Dropdown]  [Dropdown]  [Dropdown]  [Dropdown]

Rows (using VLOOKUP or INDEX/MATCH):
- Net Price
- Admission Rate
- Your Chances
- Distance
- Size
- Graduation Rate
- Job Placement
- Marketing Rank
- Value Score
- Academic Index
- Merit Aid Likely
- Setting
- Weather Score
- Your Overall Score

Formula example for each cell:
=IFERROR(INDEX(Master_Sheet_Data,MATCH($A2,Master_Sheet_Metrics,0),
MATCH(B$1,Master_Sheet_Colleges,0)),"N/A")
```

---


## Quick Setup Tips

2. **Use Named Ranges** for easier formula creation:
   - Select your data ranges and name them (e.g., "School_Names", "Net_Prices")
   - Makes formulas more readable

3. **Set up Data Validation** for Y/N columns:
   - Select columns → Data → Data Validation
   - List: Y,N
   - This creates dropdowns for consistent entry

4. **Apply Conditional Formatting** in bulk:
   - Select all relevant columns
   - Apply rules based on cell values
   - Use color scales for numeric scores

5. **Test formulas** with 2-3 schools first before copying down