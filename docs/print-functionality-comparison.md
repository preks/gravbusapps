# Print Functionality Comparison: Personal vs Manager Expenses

## Issue Summary

The print button in manager expenses tables doesn't work because the `employeeDocument` field is **missing from the GraphQL queries**.

## Root Cause Analysis

### ✅ Personal Expenses (WORKING)

The GraphQL queries in personal expenses include the `employeeDocument` field with all necessary data:

**File**: `src/business-apps/fin/expenses/apps/personal-expenses/queries/expensePlans.ts`

```graphql
ExpensePlan(...) {
  id
  code
  title
  # ... other fields ...
  employeeDocument {
    id
    file
    fileSize
    fileName
    mimeType
  }
  employee { ... }
}
```

### ❌ Manager Expenses (BROKEN)

The GraphQL queries in manager expenses **DO NOT** include the `employeeDocument` field:

**File**: `src/business-apps/fin/expenses/apps/manager-expenses/queries/expensePlans.ts` (Lines 46-74)

```graphql
ExpensePlan(...) {
  id
  code
  title
  expenseRequest { id code }
  startDate
  endDate
  status
  # ... other fields ...
  # ❌ MISSING: employeeDocument field!
  employee { ... }
}
```

**File**: `src/business-apps/fin/expenses/apps/manager-expenses/queries/expenseRequests.ts`

- ✅ `GET_EXPENSE_REQUESTS_BY_MANAGER` **HAS** `employeeDocument` (Lines 33-36)
- ✅ `GET_EXPENSE_REQUEST_DETAIL` **HAS** `employeeDocument` (Lines 125-128)
- This means print works for expense **requests** but not expense **plans**!

## Print Service Behavior

### How Print Works

Both personal and manager expenses use the **same** print service:

- **File**: `src/business-apps/fin/expenses/apps/personal-expenses/utils/expensePlanFileService.ts`
- **Key Line 34**: `if (!record.employeeDocument?.file) { return { success: false, error: 'No employee document file ID available for printing' }; }`

The service requires `employeeDocument.file` to fetch the PDF from the file storage.

### Manager Expenses Mapping

Manager expenses tries to map its data to the personal expenses format:

- **ExpensePlansTable.tsx** (Lines 152-176): Maps `plan.employeeDocument` to `mappedPlan.employeeDocument`
- **ExpenseRequestsTable.tsx** (Lines 188-225): Maps `request.employeeDocument` to `mappedPlan.employeeDocument`

However, since `employeeDocument` is **not fetched** in the expense plans query, the mapping results in `employeeDocument: null` or `employeeDocument: undefined`.

## Required Fix

### Step 1: Update `expensePlans.ts` Query

Add `employeeDocument` field to the `GET_EXPENSE_PLANS_BY_MANAGER` query:

```graphql
ExpensePlan(...) {
  id
  code
  title
  expenseRequest { id code }
  startDate
  endDate
  status
  activeFrom
  activeTo
  totalAmount
  currencyRef
  createdAt
  updatedAt
  decisionDate
  planDate
  # ✅ ADD THIS:
  employeeDocument {
    id
    file
    fileSize
    fileName
    mimeType
  }
  employee {
    id
    displayName
    fullName
    pictureThumbnail
    employeePosition {
      organizationalUnit {
        id
        name
      }
    }
  }
}
```

### Step 2: Update TypeScript Interface

Update the `ExpensePlan` interface in `useGetExpensePlans.ts` to include:

```typescript
export interface ExpensePlan {
  id: string
  code: string
  title: string
  // ... other fields ...
  employeeDocument?: {
    id: string
    file: string
    fileSize?: number
    fileName?: string
    mimeType?: string
  } | null
  // ... rest of interface
}
```

### Step 3: Update Statistics Query (Optional)

If statistics or other queries also need print support, add `employeeDocument` there too:

**File**: `src/business-apps/fin/expenses/apps/manager-expenses/queries/mainViewExpensePlans.ts`

- Already has `employeeDocument` (Lines 33-36) ✅

## Testing Checklist

After implementing the fix:

- [ ] Manager Expenses → Expense Plans Tab → Click print icon on any plan
- [ ] Verify Modal opens with "Print Preview" title
- [ ] Verify PDF iframe loads (not "No document available")
- [ ] Verify PDF displays correctly
- [ ] Test with plans that have documents
- [ ] Test with plans that **don't** have documents (should show appropriate message)
- [ ] Verify Expense Requests print still works (already has `employeeDocument`)
- [ ] Verify Personal Expenses print still works (reference implementation)

## Files to Modify

1. **GraphQL Query**: `src/business-apps/fin/expenses/apps/manager-expenses/queries/expensePlans.ts`
   - Add `employeeDocument` field to query

2. **TypeScript Interface**: `src/business-apps/fin/expenses/apps/manager-expenses/hooks/useGetExpensePlans.ts`
   - Add `employeeDocument` to `ExpensePlan` interface

3. **No changes needed**:
   - Print modal UI (already correct)
   - Print service (already correct)
   - File client (already correct)
   - Expense requests query (already has field)

## Impact

- **Low risk**: Adding a field to the query won't break existing functionality
- **High value**: Enables print functionality for expense plans in manager view
- **Consistent**: Aligns manager expenses with personal expenses pattern
- **No breaking changes**: TypeScript interfaces already accept optional `employeeDocument`
