# Print Button Visibility Comparison: Personal vs Manager Expenses

## Issue Summary

The print button is **not showing** in manager expenses expense requests action button dropdown because of a **missing status condition**.

## Root Cause: Status Condition Mismatch

### ✅ **Personal Expenses** (Print Button Shows)

**File**: `src/business-apps/fin/expenses/apps/personal-expenses/components/tabs/expense-requests-tab/ExpenseRequestsTable.tsx` (Line 460)

```typescript
...((record.status === "APPROVED" ||
    record.status === "VERIFIED" ||
    record.status === "BOOKED" ||
    record.status === "TRANSFERRED" ||
    record.status === "PAID") &&
   (record.employeeDocument &&
    record.employeeDocument?.file &&
    record.employeeDocument.file.trim() !== '')) ? [
  {
    category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
    key: 'print',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_flows.print','Print'),
    onClick: (e?: React.MouseEvent) => {
      e?.stopPropagation();
      handlePrintRequest(record);
    }
  }
]: []
```

**Conditions**:

1. ✅ **Status must be**: `APPROVED`, `VERIFIED`, `BOOKED`, `TRANSFERRED`, or `PAID`
2. ✅ **Document must exist**: `employeeDocument` exists
3. ✅ **File must exist**: `file` field exists and is not empty

### ❌ **Manager Expenses** (Print Button Hidden)

**File**: `src/business-apps/fin/expenses/apps/manager-expenses/components/tabs/expense-requests-tab/ExpenseRequestsTable.tsx` (Line 470)

```typescript
...(record.employeeDocument?.file ? [
  {
    category: getTranslationFromI18nKeyAndLabel(
      "lowcoder:employee_list.flows_button.actions",
      "Actions",
    ),
    key: "print",
    label: getTranslationFromI18nKeyAndLabel(
      "lowcoder:expense_plan_list.expense_plan_flows.print",
      "Print",
    ),
    onClick: () => {
      handlePrintRequest(record);
    },
  },
] : [])
```

**Conditions**:

1. ❌ **No status check!** - Missing the status condition
2. ✅ **Document must exist**: `employeeDocument?.file` exists

## Why This Matters

### Business Logic

The print button should **only show** for expense requests that are:

- In a "final" or "processed" state (APPROVED, VERIFIED, BOOKED, TRANSFERRED, PAID)
- Have an associated document that can be printed

### Current Behavior in Manager Expenses

- Print button shows for **ANY** status (CREATED, PENDING, REJECTED, etc.)
- This is incorrect business logic
- However, if all your requests are in draft status, the button might not show because they don't have documents yet

## The Complete Fix

### Step 1: Fix Status Condition

Update `ExpenseRequestsTable.tsx` in manager expenses (around line 470):

```typescript
// BEFORE (incorrect):
...(record.employeeDocument?.file ? [
  {
    category: getTranslationFromI18nKeyAndLabel(
      "lowcoder:employee_list.flows_button.actions",
      "Actions",
    ),
    key: "print",
    label: getTranslationFromI18nKeyAndLabel(
      "lowcoder:expense_plan_list.expense_plan_flows.print",
      "Print",
    ),
    onClick: () => {
      handlePrintRequest(record);
    },
  },
] : [])

// AFTER (correct):
...((record.status === "APPROVED" ||
    record.status === "VERIFIED" ||
    record.status === "BOOKED" ||
    record.status === "TRANSFERRED" ||
    record.status === "PAID") &&
   record.employeeDocument?.file?.trim() ? [
  {
    category: getTranslationFromI18nKeyAndLabel(
      "lowcoder:employee_list.flows_button.actions",
      "Actions",
    ),
    key: "print",
    label: getTranslationFromI18nKeyAndLabel(
      "lowcoder:expense_plan_list.expense_plan_flows.print",
      "Print",
    ),
    onClick: () => {
      handlePrintRequest(record);
    },
  },
] : [])
```

### Step 2: Ensure GraphQL Has Required Fields

Make sure the expense requests query includes `employeeDocument`:

**File**: `src/business-apps/fin/expenses/apps/manager-expenses/queries/expenseRequests.ts`

- ✅ Already has it (Lines 33-36)

```graphql
employeeDocument {
  file
  fileSize
}
```

## Additional Findings

### Edit Button Condition

Personal expenses also has an edit button that only shows for certain statuses:

```typescript
...(record.status === 'CREATED' || record.status === 'REJECTED') ? [
{
  category: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.actions','Actions'),
  key: 'edit-expense-request',
  label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.modal_list_or_flow_button.update_request_btn','Update Request'),
  onClick: (e?: React.MouseEvent) => {
    e?.stopPropagation();
    handleEditExpenseRequest(record);
  }
}]: []
```

Manager expenses **doesn't have** an edit button at all - this might be intentional (managers can't edit employee requests).

## Testing Checklist

After implementing the fix:

### Test Print Button Visibility

- [ ] **APPROVED** request with document → Print button **should show** ✅
- [ ] **VERIFIED** request with document → Print button **should show** ✅
- [ ] **BOOKED** request with document → Print button **should show** ✅
- [ ] **TRANSFERRED** request with document → Print button **should show** ✅
- [ ] **PAID** request with document → Print button **should show** ✅
- [ ] **CREATED** request with document → Print button **should NOT show** ❌
- [ ] **PENDING** request with document → Print button **should NOT show** ❌
- [ ] **REJECTED** request with document → Print button **should NOT show** ❌
- [ ] Any status without document → Print button **should NOT show** ❌

### Test Print Functionality

- [ ] Click print button → Modal opens
- [ ] PDF loads in iframe
- [ ] PDF displays correctly
- [ ] Can close modal and reopen

## Files to Modify

1. **AppActionButton Config**: `src/business-apps/fin/expenses/apps/manager-expenses/components/tabs/expense-requests-tab/ExpenseRequestsTable.tsx`
   - Line ~470: Add status condition to print button
   - Add `.trim()` check for file field

## Summary

| Aspect             | Personal Expenses   | Manager Expenses (Current) | Manager Expenses (Should Be) |
| ------------------ | ------------------- | -------------------------- | ---------------------------- |
| **Status Check**   | ✅ Yes (5 statuses) | ❌ No                      | ✅ Yes (5 statuses)          |
| **Document Check** | ✅ Yes + trim()     | ✅ Yes                     | ✅ Yes + trim()              |
| **Edit Button**    | ✅ Yes (2 statuses) | ❌ No                      | ❌ No (intentional)          |
| **View Button**    | ✅ Yes (always)     | ✅ Yes (always)            | ✅ Yes (always)              |

The key issue is the **missing status condition** that determines when printing is appropriate.
