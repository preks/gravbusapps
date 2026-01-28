# FortuneSheet Integration Testing Guide

This document provides comprehensive testing procedures to verify that the FortuneSheet integration maintains 100% of existing features while adding enhanced formula capabilities.

## Prerequisites

1. Start the development server: `npm run dev`
2. Navigate to the Spreadsheet Apps section
3. Have at least one spreadsheet app created for testing
4. (Optional) Have a second browser/incognito window for collaboration testing

## Test Suite Overview

### ✅ Implementation Complete

- FortuneSheet package installed
- Data format converters created
- Operation mappers implemented
- Collaboration hook integrated
- FortuneSheetGrid component created
- SpreadsheetAppViewer updated

### 🧪 Manual Testing Required

The following tests verify that all features work correctly with FortuneSheet.

---

## Test 1: Real-Time Collaboration

**Objective**: Verify that real-time collaboration works with FortuneSheet, including cell editing sync and cursor tracking.

### Steps:

1. **Setup**
   - Open a spreadsheet app in Browser 1 (User 1)
   - Open the same spreadsheet app in Browser 2/Incognito (User 2)
   - Verify both users see the presence indicator with each other's names

2. **Test Cell Editing Sync**
   - User 1: Edit cell A1, type "Test Value 1"
   - User 2: Verify cell A1 updates automatically with "Test Value 1"
   - User 2: Edit cell B2, type "Test Value 2"
   - User 1: Verify cell B2 updates automatically with "Test Value 2"

3. **Test Formula Sync**
   - User 1: In cell C1, enter formula `=SUM(A1:A10)`
   - User 2: Verify cell C1 shows the calculated result
   - User 2: Change a value in range A1:A10
   - User 1: Verify C1 recalculates automatically

4. **Test Cursor Tracking**
   - User 1: Click on cell D5
   - User 2: Verify User 1's cursor/selection appears on cell D5
   - User 2: Click on cell E10
   - User 1: Verify User 2's cursor/selection appears on cell E10

5. **Test Conflict Resolution**
   - User 1 & User 2: Simultaneously edit the same cell
   - Verify last write wins (remote operation takes precedence)
   - Verify no data corruption occurs

### Expected Results:

- ✅ All cell changes sync in real-time
- ✅ Formula results recalculate correctly on all clients
- ✅ Cursor positions are visible for all users
- ✅ No lag or significant delays (< 500ms)
- ✅ No duplicate entries or data loss

---

## Test 2: Versioning Integration

**Objective**: Verify that auto-save, checkpoints, and version restoration work correctly with FortuneSheet data.

### Steps:

1. **Test Auto-Save**
   - Open a spreadsheet app
   - Make several cell changes
   - Wait 30 seconds (auto-save interval)
   - Check version history - verify auto-save version was created
   - Verify version contains the correct data

2. **Test Manual Checkpoint**
   - Make more changes to cells
   - Click "Save Checkpoint" from dropdown menu
   - Enter checkpoint description: "Test checkpoint"
   - Verify checkpoint appears in version history with description
   - Verify checkpoint is marked differently from auto-save versions

3. **Test Version Restoration**
   - Make additional changes to cells
   - Open version history
   - Select a previous version
   - Click "Restore"
   - Verify data reverts to the selected version
   - Verify formulas are preserved and work correctly
   - Verify cell formatting is preserved

4. **Test Version Comparison**
   - Select two different versions
   - Click "Compare"
   - Verify differences are highlighted
   - Verify changed cells are shown correctly

5. **Test Data Extraction**
   - Verify FortuneSheet data is correctly converted back to our format during save
   - Check that formulas are stored correctly
   - Check that calculated values are preserved

### Expected Results:

- ✅ Auto-save triggers every 30 seconds
- ✅ Checkpoints save correctly with descriptions
- ✅ Version restoration loads data into FortuneSheet correctly
- ✅ Formulas work after restoration
- ✅ No data loss during conversion

---

## Test 3: Multi-View Data Consistency

**Objective**: Verify that data remains consistent when switching between Table, Form, Dashboard, Kanban, and Calendar views.

### Steps:

1. **Test Table → Form Switch**
   - Table View: Edit cell A1 to "Form Test"
   - Switch to Form View
   - Verify first record shows "Form Test" in corresponding field
   - Form View: Edit the field to "Form Test Updated"
   - Switch back to Table View
   - Verify cell A1 shows "Form Test Updated"

2. **Test Table → Dashboard Switch**
   - Table View: Change several numeric cells
   - Switch to Dashboard View
   - Verify KPI widgets reflect updated values
   - Verify charts show updated data
   - Switch back to Table View
   - Verify data is unchanged

3. **Test Formula Consistency**
   - Table View: Set cell C1 with formula `=SUM(A1:A10)`
   - Note the calculated value
   - Switch to Form View and back
   - Verify C1 still shows correct calculated value
   - Edit a cell in range A1:A10 from Form View
   - Return to Table View
   - Verify C1 recalculated correctly

4. **Test Kanban View Integration**
   - Table View: Change status column value
   - Switch to Kanban View
   - Verify card moved to correct column
   - Drag card to different column in Kanban
   - Switch to Table View
   - Verify status column updated

5. **Test Calendar View Integration**
   - Table View: Change date column value
   - Switch to Calendar View
   - Verify event appears on correct date
   - In Calendar View, drag event to different date
   - Switch to Table View
   - Verify date column updated

### Expected Results:

- ✅ Data stays consistent across all view types
- ✅ Formulas continue to work after view switches
- ✅ Edits in any view reflect in Table View
- ✅ No data corruption or loss during switches
- ✅ Formula recalculation works correctly

---

## Test 4: New Formula Functions

**Objective**: Verify that FortuneSheet's enhanced formula capabilities work correctly, including functions not available in the custom evaluator.

### Steps:

1. **Test Basic Functions (Backward Compatibility)**
   - Test `=SUM(A1:A10)` - should work
   - Test `=AVERAGE(B1:B10)` - should work
   - Test `=MAX(C1:C10)` - should work
   - Test `=MIN(D1:D10)` - should work
   - Test `=COUNT(E1:E10)` - should work
   - Test `=IF(A1>100, "High", "Low")` - should work

2. **Test New Lookup Functions**
   - Create a lookup table in columns A-B
   - Test `=VLOOKUP(value, A1:B10, 2, FALSE)`
   - Verify correct value is returned
   - Test `=HLOOKUP(value, A1:J2, 2, FALSE)`
   - Verify horizontal lookup works
   - Test `=XLOOKUP(value, A1:A10, B1:B10)`
   - Verify modern lookup function works

3. **Test Date/Time Functions**
   - Test `=TODAY()` - should return current date
   - Test `=NOW()` - should return current date/time
   - Test `=YEAR(date_cell)` - should extract year
   - Test `=MONTH(date_cell)` - should extract month
   - Test `=DAY(date_cell)` - should extract day
   - Test `=DATE(2024, 1, 15)` - should create date
   - Test `=DATEDIF(start_date, end_date, "D")` - should calculate days between dates

4. **Test Text Functions**
   - Test `=CONCATENATE("Hello", " ", "World")` - should combine text
   - Test `=LEFT(text_cell, 5)` - should extract left characters
   - Test `=RIGHT(text_cell, 5)` - should extract right characters
   - Test `=MID(text_cell, 2, 5)` - should extract middle characters
   - Test `=LEN(text_cell)` - should return text length
   - Test `=UPPER(text_cell)` - should convert to uppercase
   - Test `=LOWER(text_cell)` - should convert to lowercase

5. **Test Statistical Functions**
   - Test `=MEDIAN(A1:A10)` - should calculate median
   - Test `=MODE(A1:A10)` - should find mode
   - Test `=STDEV(A1:A10)` - should calculate standard deviation
   - Test `=VAR(A1:A10)` - should calculate variance
   - Test `=CORREL(A1:A10, B1:B10)` - should calculate correlation

6. **Test Financial Functions**
   - Test `=PMT(rate, nper, pv)` - should calculate loan payment
   - Test `=FV(rate, nper, pmt, pv)` - should calculate future value
   - Test `=PV(rate, nper, pmt)` - should calculate present value
   - Test `=IRR(values)` - should calculate internal rate of return
   - Test `=NPV(rate, values)` - should calculate net present value

7. **Test Logical Functions**
   - Test `=AND(A1>10, B1<20)` - should evaluate AND logic
   - Test `=OR(A1>100, B1>100)` - should evaluate OR logic
   - Test `=NOT(A1=0)` - should negate boolean
   - Test `=IFERROR(formula, "Error")` - should handle errors
   - Test `=IFS(A1>90, "A", A1>80, "B", TRUE, "F")` - should handle multiple conditions

8. **Test Error Handling**
   - Test invalid formula syntax - should show error
   - Test circular reference - should detect and prevent
   - Test division by zero - should show appropriate error
   - Test invalid cell references - should handle gracefully

### Expected Results:

- ✅ All basic functions work (backward compatible)
- ✅ New VLOOKUP, HLOOKUP, XLOOKUP functions work correctly
- ✅ Date/time functions return correct values
- ✅ Text manipulation functions work as expected
- ✅ Statistical functions calculate correctly
- ✅ Financial functions produce accurate results
- ✅ Logical functions evaluate correctly
- ✅ Error messages are clear and helpful
- ✅ Formulas recalculate when dependencies change

---

## Test 5: Additional Feature Verification

### Test Entity Data Sources

1. Configure sheet to use entity data source
2. Verify data loads into FortuneSheet correctly
3. Add formula that references entity data
4. Verify formula calculates correctly
5. Refresh entity data, verify formulas recalculate

### Test Process Automation

1. Add automation to a row
2. Run workflow from FortuneSheet table view
3. Verify workflow executes correctly
4. Verify row updates with workflow results
5. Check that formulas referencing workflow results recalculate

### Test Permissions & Sharing

1. Share spreadsheet with "view" permission
2. Verify recipient sees read-only FortuneSheet
3. Verify recipient cannot edit cells
4. Share with "edit" permission
5. Verify recipient can edit cells
6. Verify changes sync via collaboration

### Test File Locking

1. Lock spreadsheet
2. Verify FortuneSheet becomes read-only for others
3. Try editing as non-owner
4. Verify edit is blocked
5. Release lock
6. Verify FortuneSheet becomes editable again

### Test Comments

1. Add comment to spreadsheet (not specific cell)
2. Verify comment appears in comments panel
3. Verify FortuneSheet grid still works
4. Resolve comment
5. Verify resolved state updates

### Test Publishing

1. Publish spreadsheet
2. Verify published version is accessible
3. Verify published version uses FortuneSheet
4. Test published version in different browser
5. Verify formulas work in published version

---

## Test 6: Performance & Edge Cases

### Performance Tests

1. **Large Dataset**
   - Load spreadsheet with 1000+ rows
   - Verify FortuneSheet renders smoothly
   - Test formula recalculation speed
   - Verify scrolling is smooth

2. **Complex Formulas**
   - Create chain of 10+ dependent formulas
   - Edit source cell
   - Verify all formulas recalculate
   - Verify recalculation completes in < 2 seconds

3. **Collaboration Load**
   - Have 3+ users editing simultaneously
   - Verify all changes sync correctly
   - Verify no performance degradation
   - Check network traffic is reasonable

### Edge Cases

1. **Empty Spreadsheet**
   - Create new empty spreadsheet
   - Verify FortuneSheet renders correctly
   - Add first row/cell
   - Verify it works

2. **Formulas with Errors**
   - Enter formula with syntax error
   - Verify error message is shown
   - Fix formula
   - Verify calculation works

3. **Special Characters**
   - Enter cells with unicode, emojis, special chars
   - Verify they display correctly
   - Use in formulas
   - Verify formulas handle them

4. **Copy/Paste**
   - Copy cells from Excel
   - Paste into FortuneSheet
   - Verify format preserved
   - Verify formulas preserved

---

## Regression Testing Checklist

Verify that NO existing features were broken:

- [ ] Excel import still works
- [ ] Excel export still works
- [ ] AI schema generation still works
- [ ] Column type detection still works
- [ ] Data validation still works
- [ ] Cell formatting still works
- [ ] Row operations (add/delete) still work
- [ ] Column operations (add/delete/hide) still work
- [ ] Search functionality still works
- [ ] Filtering still works
- [ ] Sorting still works
- [ ] Keyboard shortcuts still work
- [ ] Context menus still work
- [ ] Undo/redo still works (if implemented)

---

## Bug Report Template

If you encounter any issues during testing, use this template:

```markdown
## Bug Report

**Test**: [Test name and step number]
**Expected**: [What should happen]
**Actual**: [What actually happened]
**Reproducible**: [Yes/No]
**Steps to Reproduce**:

1.
2.
3.

**Browser**: [Chrome/Firefox/Safari + version]
**Console Errors**: [Any errors in browser console]
**Screenshots**: [If applicable]
```

---

## Success Criteria

All tests pass with the following conditions:

- ✅ Zero data loss
- ✅ All collaboration features work
- ✅ Versioning works correctly
- ✅ All views remain consistent
- ✅ New formula functions work
- ✅ No regression in existing features
- ✅ Performance is acceptable (< 2s for operations)
- ✅ UI/UX is smooth and responsive

---

## Next Steps After Testing

1. Fix any bugs found during testing
2. Update documentation with any changes
3. Train users on new formula capabilities
4. Monitor production usage for issues
5. Gather user feedback on formula features
6. Plan for additional formula functions if needed

---

## Support Resources

- FortuneSheet Documentation: https://ruilisi.github.io/fortune-sheet-docs/
- Our Integration Code: `/src/business-apps/platform/apps/spreadsheet-apps/components/FortuneSheetGrid.tsx`
- Conversion Utilities: `/src/business-apps/platform/apps/spreadsheet-apps/utils/fortuneSheetConverter.ts`
- Collaboration Hook: `/src/business-apps/platform/apps/spreadsheet-apps/hooks/useFortuneSheetCollaboration.ts`
