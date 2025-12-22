# Refactoring Functionality Checklist - Code Smell Fixes

## Overview

This checklist ensures all functionalities remain intact while fixing cognitive complexity and nesting issues identified in SonarQube.

---

## 1. AllowanceCodeTab.tsx (Complexity: 53 → 15)

### Core CRUD Operations

- [ ] **Fetch Allowance Codes**: Load all allowance codes for a rule with GraphQL query
- [ ] **Create New Allowance Code**: Open modal with empty form, save via Kogito process
- [ ] **Edit Existing Allowance Code**:
  - [ ] Normal Edit: All fields editable
  - [ ] Restricted Edit: Only dates, percentage, and wage codes editable (if used in transactions)
- [ ] **Delete Allowance Code**:
  - [ ] Check if used in ExpensePlanItem, ExpenseItem, ExpensePosition, or ExpenseRuleAllowanceSetup
  - [ ] Show delete button (disabled with tooltip) if in use
  - [ ] Hard delete if not in use

### Data Loading & Display

- [ ] **Load Travel Region Sets**: Fetch unique region sets from allowance region rules
- [ ] **Load Allowance Region Rules**: Filter by selected region set, display code and name
- [ ] **Load Calculation Methods**: Fetch from CatalogEntry for "Calculation" catalog
- [ ] **Load Expense Groups**: Always "ALLOWANCE" for allowance codes
- [ ] **Display Table with Columns**:
  - [ ] Code
  - [ ] Name
  - [ ] Reimbursable (Yes/No badge)
  - [ ] Amount (formatted currency or "N/A")
  - [ ] Calculation method
  - [ ] Valid From (DD.MM.YYYY format)
  - [ ] Valid To (DD.MM.YYYY format or "Unlimited")
  - [ ] Actions dropdown (Edit/Delete)

### Validation Rules

- [ ] **Amount vs Percentage Mutual Exclusivity**:
  - [ ] Cannot have both Amount > 0 AND Percentage ≠ 0
  - [ ] Show error on both fields if violated
  - [ ] Show hint: "Use either Amount or Percentage (not both)"
- [ ] **Date Validation**:
  - [ ] Valid From must be ≥ rule's Valid From
  - [ ] Valid From must be ≤ rule's Valid To (if rule has Valid To)
  - [ ] Valid To must be ≤ rule's Valid To (if rule has Valid To)
  - [ ] Valid To must be ≥ Valid From
  - [ ] Show specific error messages with dates
- [ ] **Required Fields**:
  - [ ] Code (mandatory)
  - [ ] Name (mandatory)
  - [ ] Valid From (mandatory)
- [ ] **Travel Region Set Selection**:
  - [ ] Required if First Allowance Region Rule is selected
  - [ ] Show error if missing
- [ ] **First Allowance Region Rule**:
  - [ ] Filter rules by selected travel region set
  - [ ] Required if First Percentage is entered

### UI Behavior

- [ ] **Modal Open/Close**: Proper dialog state management with cleanup
- [ ] **Form Reset**: Clear form when modal closes (unless restricted edit)
- [ ] **Loading States**: Show spinner while fetching data
- [ ] **Error Handling**: Display GraphQL errors in alerts with retry button
- [ ] **Success Toast**: Show confirmation after successful save/delete
- [ ] **Restricted Edit Mode**:
  - [ ] Detect if code is used in transactions
  - [ ] Disable non-editable fields
  - [ ] Show info message about restrictions
- [ ] **Amount Input**:
  - [ ] Type: text (allow complete deletion of digits)
  - [ ] Placeholder: "e.g. 57.50"
  - [ ] Parse as float, fallback to 0 if empty
  - [ ] No negative values allowed
- [ ] **Percentage Input**:
  - [ ] Type: text (allow negative values)
  - [ ] Placeholder: "e.g. 100"
  - [ ] Parse as float, fallback to 0 if empty
  - [ ] Allow range: -100 to 200
- [ ] **Reimbursable Toggle**: Switch component with proper state binding

### Data Transformation

- [ ] **Save Data Preparation**:
  - [ ] Convert form values to backend format
  - [ ] Handle null vs undefined properly
  - [ ] Include all new fields: businessKey, additionalProperties, codeOrder, travelLocation, secondWageCode
  - [ ] Convert activeFrom/activeTo to ISO 8601 format with timezone
- [ ] **Load Data Transformation**:
  - [ ] Map GraphQL response to table display format
  - [ ] Extract currency code from "Currency:v1:EUR" format
  - [ ] Handle optional fields (amount, calculation, dates)
  - [ ] Map nested objects (expenseGroup, allowanceRegionRules)

### Integration Points

- [ ] **Kogito Process**: `saveExpenseRuleAllowanceCode` endpoint
- [ ] **GraphQL Queries**: Fetch codes, rules, calculations, catalogs
- [ ] **Usage Check Query**: `CheckAllAllowanceCodeUsage` (4 entities checked)
- [ ] **Catalog Manager**: Fetch calculation methods and expense groups
- [ ] **Expense Settings Client**: Save and delete operations

---

## 2. AllowanceSetupTab.tsx (Complexity: 23 → 15)

### Core CRUD Operations

- [ ] **Fetch Allowance Setups**: Load all setups for a rule (exclude isDeleted=true)
- [ ] **Create New Setup**: Open modal with empty form, save via Kogito process
- [ ] **Edit Existing Setup**:
  - [ ] Normal Edit: All fields editable
  - [ ] Restricted Edit: Only dates editable (if used in transactions)
- [ ] **Delete Setup**:
  - [ ] Use `deleteExpenseRuleAllowanceSetup` endpoint
  - [ ] Wait 500ms before refresh (backend processing delay)
  - [ ] Show success toast

### Data Loading & Display

- [ ] **Load Allowance Codes**: Fetch from rule's allowance codes
- [ ] **Load Allowance Periods**: Fetch from rule's allowance periods
- [ ] **Display Table with Columns**:
  - [ ] Name (auto-populated from selected code)
  - [ ] Allowance Code (code - name)
  - [ ] Allowance Period (code - name)
  - [ ] Issue type
  - [ ] Only Tax (Yes/No badge)
  - [ ] Valid From (DD.MM.YYYY format)
  - [ ] Valid To (DD.MM.YYYY format or "Unlimited")
  - [ ] Actions dropdown (Edit/Delete)

### Validation Rules

- [ ] **Date Validation**:
  - [ ] Valid From must be ≥ rule's Valid From (day precision)
  - [ ] Valid To must be ≤ rule's Valid To (day precision, if rule has Valid To)
  - [ ] Valid From must be ≤ Valid To (day precision)
  - [ ] Show specific error messages with formatted dates
- [ ] **Required Fields**:
  - [ ] Allowance Code (mandatory)
  - [ ] Allowance Period (mandatory)
  - [ ] Issue (mandatory)
  - [ ] Valid From (mandatory)
- [ ] **Name Field**:
  - [ ] Placeholder: "there is no name to be entered"
  - [ ] Auto-populated when code is selected (create mode only)
  - [ ] Read-only in edit mode

### UI Behavior

- [ ] **Modal Open/Close**: Proper dialog state management
- [ ] **Form Reset**: Clear form when modal closes
- [ ] **Loading States**: Show spinner while fetching data
- [ ] **Error Handling**: Display GraphQL errors in alerts with retry button
- [ ] **Success Toast**: Show confirmation after successful save/delete
- [ ] **Restricted Edit Mode**:
  - [ ] Detect if setup is used in transactions
  - [ ] Disable non-editable fields
  - [ ] Show info message about restrictions
- [ ] **Auto-populate Name**: When code is selected, copy code's name to setup name (create mode)
- [ ] **Only Tax Checkbox**: Proper boolean state binding
- [ ] **Delete Confirmation Dialog**: Show warning before deletion

### Data Transformation

- [ ] **Save Data Preparation**:
  - [ ] Build mutation based on create vs update mode
  - [ ] Convert dates to ISO 8601 format with timezone
  - [ ] Handle allowanceCodeId vs allowanceCodeRef properly
  - [ ] Include version for updates
- [ ] **Load Data Transformation**:
  - [ ] Map GraphQL response to table display format
  - [ ] Extract nested objects (allowanceCode, allowancePeriod)
  - [ ] Handle optional fields (validTo)

### Integration Points

- [ ] **Kogito Process**: `saveExpenseRuleAllowanceSetup` endpoint
- [ ] **Deletion Endpoint**: `deleteExpenseRuleAllowanceSetup`
- [ ] **GraphQL Query**: Fetch setups with related codes and periods
- [ ] **Usage Check**: Verify if setup is used before allowing edit

---

## 3. TravelRegionMatrixView.tsx (Nesting: 4 → 3)

### Core CRUD Operations

- [ ] **Load Matrix Data**:
  - [ ] Load all travel regions for selected region set
  - [ ] Load all allowance region rules
  - [ ] Load region rule details (cells)
  - [ ] Load available currencies
  - [ ] Transform into editable cells with validity periods
- [ ] **Create New Rule**:
  - [ ] Open modal with TravelRegionRuleForm
  - [ ] Save via Kogito process
  - [ ] Reload matrix after save
- [ ] **Edit Existing Rule**:
  - [ ] Open modal with pre-filled form
  - [ ] Update via Kogito process
  - [ ] Reload matrix after update
- [ ] **Delete Rule**:
  - [ ] Check if rule has details
  - [ ] Hard delete if no details
  - [ ] Show error if has details
- [ ] **Create New Region**:
  - [ ] Open modal with TravelRegionForm
  - [ ] Save via catalog mutation
  - [ ] Reload regions after save
- [ ] **Delete Region**:
  - [ ] Check if region has saved details
  - [ ] Hard delete if no details
  - [ ] Show error with count if has details
- [ ] **Edit Cell (Allowance Detail)**:
  - [ ] Click cell to open edit modal
  - [ ] Edit amount, dates, currency
  - [ ] Add/delete validity periods
  - [ ] Save all periods for cell at once
  - [ ] Check if used in transactions (show warning if editing used cell)
- [ ] **Delete Cell Detail**:
  - [ ] Check if detail is used in transactions
  - [ ] Show delete button only if not used
  - [ ] Hard delete if confirmed

### Data Loading & Display

- [ ] **Matrix Table Structure**:
  - [ ] Header row with sortable rule columns (drag-and-drop)
  - [ ] Left column: Travel regions sorted alphabetically
  - [ ] Cell intersections: Amount and period info
  - [ ] Display "Regions with Details" first, then "Regions without Details"
  - [ ] No duplication of regions between groups
- [ ] **Cell Display Formats**:
  - [ ] Empty cell: Gray background, "+ Add" on hover
  - [ ] Single period: Amount + currency + period short format
  - [ ] Multiple periods: "Multiple" badge with count
  - [ ] Hover: Show full details tooltip
- [ ] **Rule Column Header**:
  - [ ] Drag handle for reordering
  - [ ] Rule code and name
  - [ ] "Add Detail" button
  - [ ] "Delete Rule" button (if no details)
  - [ ] Valid From and Valid To dates
- [ ] **Region Row**:
  - [ ] Region code and name
  - [ ] "Delete Region" button (if no saved details)

### Pagination & Search

- [ ] **Pagination**:
  - [ ] 25 regions per page
  - [ ] Page controls: Previous, page numbers, Next
  - [ ] Total count display
  - [ ] Persist current page in URL query parameter (`matrixPage`)
  - [ ] Clear pagination when switching views
- [ ] **Search**:
  - [ ] Debounced search input (300ms delay)
  - [ ] Search by region code or name
  - [ ] Load search results from API
  - [ ] Show all results when searching (bypass pagination)
  - [ ] Clear button to reset search
  - [ ] Reload all data when clearing search
- [ ] **Sorting**:
  - [ ] "With Details First" toggle
  - [ ] Sort regions alphabetically by value
  - [ ] Separate into two groups: with/without details
  - [ ] No duplication between groups (use Set to track processed IDs)
  - [ ] Maintain sort order after search clear

### Drag-and-Drop

- [ ] **Rule Column Reordering**:
  - [ ] Grab handle on each rule column
  - [ ] Drag to reorder columns
  - [ ] Update editableRules array order
  - [ ] Visual feedback during drag (opacity change)
  - [ ] Persist order in state

### Validation Rules

- [ ] **Cell Date Validation**:
  - [ ] Active From must be ≥ rule's Valid From
  - [ ] Active To must be ≤ rule's Valid To (if rule has Valid To)
  - [ ] Active To must be ≥ Active From
  - [ ] Highlight conflicts with red border
- [ ] **Currency Validation**:
  - [ ] Check if currency exists in system
  - [ ] Show warning if invalid currency
- [ ] **Period Overlap Detection**:
  - [ ] Check for overlapping date ranges within same cell
  - [ ] Mark conflicting periods
- [ ] **Usage Validation**:
  - [ ] Check if detail is used in ExpensePlanItem or ExpenseItem
  - [ ] Show warning when editing used detail
  - [ ] Disable delete button if used

### UI Behavior

- [ ] **Cell Editing Modal**:
  - [ ] Open on cell click
  - [ ] Show all validity periods for cell
  - [ ] Editable fields: Amount, Active From, Active To, Currency
  - [ ] Add new period button
  - [ ] Delete period button (only if not used)
  - [ ] Save button (saves all periods)
  - [ ] Cancel button (discards changes)
  - [ ] Stop propagation on inputs to prevent modal close
- [ ] **Add Detail for Region**:
  - [ ] Click "+ Add" in empty cell
  - [ ] Create new cell with default values
  - [ ] Inherit dates from existing cells in same rule (if any)
  - [ ] Default to rule dates if no existing cells
  - [ ] Default currency: EUR
  - [ ] Mark as "new" and "modified"
  - [ ] Open edit modal immediately
- [ ] **New Cell Date Inheritance**:
  - [ ] If existing cells for rule: Use dates from most recent cell
  - [ ] Prefer cells with both activeFrom and activeTo set
  - [ ] If no existing cells: Use rule's activeFrom and activeTo
  - [ ] Format dates properly (YYYY-MM-DD)
- [ ] **Loading States**: Show spinner while fetching data
- [ ] **Error Handling**: Display errors in alerts with retry button
- [ ] **Success Toast**: Show confirmation after successful save/delete
- [ ] **Delete Confirmation Dialogs**: For rules, regions, and details
- [ ] **Back Navigation**: Return to region set list

### Data Transformation

- [ ] **Convert to Editable Cells**:
  - [ ] Group details by rule and region
  - [ ] Create ValidityPeriod objects for each detail
  - [ ] Calculate hasConflict for overlapping periods
  - [ ] Extract currency code from "Currency:v1:EUR" format
  - [ ] Mark cells as new/modified/unchanged
- [ ] **Save Cell Preparation**:
  - [ ] Collect all periods for cell
  - [ ] Filter out deleted periods
  - [ ] Convert dates to ISO 8601 format
  - [ ] Prepare multiple save calls (one per period)
  - [ ] Call Kogito process for each period
- [ ] **Date Formatting**:
  - [ ] Display: DD.MM.YYYY
  - [ ] Short period: "01.01 - 31.12" or "01.01 -"
  - [ ] Full period: "From DD.MM.YYYY" + "To DD.MM.YYYY" or "Unlimited"
  - [ ] Save: YYYY-MM-DDTHH:mm:ss+00:00

### Integration Points

- [ ] **GraphQL Queries**:
  - [ ] GET_ALLOWANCE_REGION_RULES_WITH_DETAILS
  - [ ] GET_TRAVEL_REGIONS_WITH_SEARCH
  - [ ] CheckAllowanceRegionRuleDetailUsage
- [ ] **Kogito Processes**:
  - [ ] saveAllowanceRegionRule (create/update rule)
  - [ ] saveAllowanceRegionRuleDetail (save cell details)
  - [ ] deleteAllowanceRegionRule (delete rule)
- [ ] **Catalog Manager**:
  - [ ] getCatalogEntriesList (load regions)
  - [ ] mutations for region CRUD
- [ ] **Custom Hooks**:
  - [ ] useMatrixDataLoaders
  - [ ] useMatrixCellEditing
  - [ ] useMatrixSaveHandlers
  - [ ] useMatrixPagination
  - [ ] useMatrixSearch
  - [ ] useMatrixSorting
  - [ ] useMatrixModals
  - [ ] useDetailUsageValidation

### URL State Management

- [ ] **Persist View State**:
  - [ ] viewMode: 'sets' | 'matrix' | 'unassigned'
  - [ ] setId: Selected region set ID
  - [ ] setName: Selected region set name
  - [ ] matrixPage: Current pagination page
- [ ] **URL Parameters**:
  - [ ] Read on component mount
  - [ ] Update when view changes
  - [ ] Clear matrixPage when returning to sets view

---

## 4. TravelRegionMatrixView_NEW.tsx (Nesting: 4 → 3)

**NOTE**: This appears to be a copy/new version of TravelRegionMatrixView.tsx with similar issues.

### Verify Same Functionalities As Above

- [ ] All functionalities from TravelRegionMatrixView.tsx apply
- [ ] Check for any differences between the two files
- [ ] Consolidate if they're meant to be the same
- [ ] Or document what makes \_NEW version different

---

## Refactoring Strategy

### For AllowanceCodeTab.tsx (Complexity: 53)

**Extract into smaller functions/hooks:**

1. [ ] `useAllowanceCodeForm` - Form state management
2. [ ] `useAllowanceCodeValidation` - All validation logic
3. [ ] `useAllowanceCodeUsageCheck` - Usage detection
4. [ ] `useAllowanceCodeDataLoaders` - GraphQL data fetching
5. [ ] `validateAllowanceCodeDates()` - Date validation utility
6. [ ] `validateAmountAndPercentage()` - Mutual exclusivity check
7. [ ] `transformAllowanceCodeForSave()` - Data transformation utility
8. [ ] `transformAllowanceCodeFromAPI()` - API response mapping

### For AllowanceSetupTab.tsx (Complexity: 23)

**Extract into smaller functions/hooks:**

1. [ ] `useAllowanceSetupForm` - Form state management
2. [ ] `useAllowanceSetupValidation` - Date validation logic
3. [ ] `useAllowanceSetupDataLoaders` - GraphQL data fetching
4. [ ] `validateAllowanceSetupDates()` - Date validation utility
5. [ ] `transformAllowanceSetupForSave()` - Data transformation utility

### For TravelRegionMatrixView.tsx (Nesting: 4)

**Reduce nesting by:**

1. [ ] Extract nested conditions into named functions
2. [ ] Use early returns to reduce if-else depth
3. [ ] Move complex cell rendering into sub-components:
   - [ ] `MatrixCellContent` - Cell display logic
   - [ ] `MatrixCellEditModal` - Cell editing modal
   - [ ] `ValidityPeriodEditor` - Period editing component
4. [ ] Extract complex map/filter chains into useMemo hooks
5. [ ] Move inline arrow functions to named functions

---

## Testing Checklist

### Critical User Flows

- [ ] **Create Allowance Code** → Verify saved in DB → Shows in table
- [ ] **Edit Allowance Code (unused)** → All fields editable → Saves correctly
- [ ] **Edit Allowance Code (used)** → Only dates/percentage editable → Restricted mode works
- [ ] **Delete Allowance Code (unused)** → Hard deleted → Removed from table
- [ ] **Delete Allowance Code (used)** → Button disabled → Tooltip explains why
- [ ] **Amount/Percentage Validation** → Both entered → Shows error on both fields
- [ ] **Date Validation** → Invalid dates → Shows specific error messages
- [ ] **Create Allowance Setup** → Auto-populate name → Saves correctly
- [ ] **Delete Allowance Setup** → Deleted → Removed after 500ms
- [ ] **Matrix: Add Detail** → Click empty cell → Inherits correct dates → Saves
- [ ] **Matrix: Edit Cell** → Multiple periods → All editable → Saves all periods
- [ ] **Matrix: Delete Detail (unused)** → Button visible → Hard deleted
- [ ] **Matrix: Delete Detail (used)** → Button hidden → Cannot delete
- [ ] **Matrix: Search** → Find region → Shows all results → Clear restores all
- [ ] **Matrix: Pagination** → Navigate pages → State persists in URL → Refresh keeps page
- [ ] **Matrix: Sorting** → Toggle "With Details First" → Correct grouping → No duplicates
- [ ] **Matrix: Drag Rules** → Reorder columns → Order persists → Visual feedback works

### Error Scenarios

- [ ] **Network Error** → Shows alert → Retry button works
- [ ] **Save Failure** → Shows error toast → Data not corrupted
- [ ] **Validation Error** → Form shows errors → Cannot submit → Clear error on fix
- [ ] **Usage Check Failure** → Shows warning → Restricted edit activates

---

## Code Quality Goals

### Cognitive Complexity Targets

- [ ] **AllowanceCodeTab**: 53 → ≤ 15
- [ ] **AllowanceSetupTab**: 23 → ≤ 15

### Nesting Level Targets

- [ ] **TravelRegionMatrixView**: 4 → ≤ 3
- [ ] **TravelRegionMatrixView_NEW**: 4 → ≤ 3

### Maintainability Improvements

- [ ] No function exceeds 50 lines
- [ ] No file exceeds 300 lines
- [ ] All complex logic has JSDoc comments
- [ ] All extracted hooks are unit testable
- [ ] All utility functions are pure functions
- [ ] No duplicate code between files
- [ ] Consistent error handling patterns
- [ ] Consistent validation patterns

---

## Sign-off

### Before Refactoring

- [ ] All functionalities documented
- [ ] All integration points identified
- [ ] All validation rules listed
- [ ] All UI behaviors described
- [ ] Test scenarios defined

### After Refactoring

- [ ] All checkboxes above are tested and verified
- [ ] Code complexity meets targets
- [ ] No functionality regressions
- [ ] All tests pass
- [ ] Code review completed
- [ ] Documentation updated
