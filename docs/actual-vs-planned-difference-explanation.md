# Actual vs Planned Calculation Differences

## Issue

The "Actual vs Planned" metric shows different values in two tabs:

- **Dashboard Tab**: 84.5% (October 2025)
- **Plan vs Request Tab**: 80.4% (October 2025)

## Root Cause: Different Date Filtering Approaches

### Dashboard Tab Approach

**File**: `src/business-apps/fin/expenses/apps/backoffice-expenses/queries/combinedDashboard.queries.ts`

```graphql
plannedExpenses: ExpensePlanAggregate(
  where: {
    _and: [
      { status: { _nin: ["CREATED", "REJECTED", "DISCARDED"] } },
      { currencyRef: { _eq: $selectedCurrency } },
      { isDeleted: { _eq: false } },
      { _or: [
        { _and: [
          { requestTypeRef: { _eq: "ExpenseRequestType:v1:EXPENSES" } },
          # 👉 FILTERS BY ITEM-LEVEL DATES
          { expensePlanItem: { expenseDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd }, isDeleted: { _eq: false } } }
        ] },
        { _and: [
          { requestTypeRef: { _eq: "ExpenseRequestType:v1:TRIP" } },
          { startDate: { _gte: $currentMonthStart, _lt: $currentMonthEnd } }
        ] }
      ] }
    ]
  }
)
```

**Key**: Filters plans by **ExpensePlanItem.expenseDate** (individual item dates)

### Plan vs Request Tab Approach

**File**: `src/business-apps/fin/expenses/apps/backoffice-expenses/components/tabs/plan-vs-request-tab/plan-vs-request/queries/getCombinedPlanVsRequestData.ts`

```graphql
planTotal: ExpensePlanAggregate(
  where: {
    _and: [
      { status: { _nin: ["CREATED", "DISCARDED"] } },
      { currencyRef: { _eq: $currency } },
      { isDeleted: { _eq: false } },
      # 👉 FILTERS BY PLAN-LEVEL DATE
      { startDate: { _gte: $startDate, _lte: $endDate } }
    ]
  }
)
```

**Key**: Filters plans by **ExpensePlan.startDate** (plan start date)

## Impact Example

Consider an expense plan:

- **Plan Start Date**: September 1, 2025
- **Plan End Date**: November 30, 2025
- **Total Amount**: €1,000
- **Items**:
  - September item: €300 (expenseDate: Sept 15)
  - October item: €400 (expenseDate: Oct 15)
  - November item: €300 (expenseDate: Nov 15)

**For October 2025:**

| Tab                 | What's Counted                | Amount                       |
| ------------------- | ----------------------------- | ---------------------------- |
| **Dashboard**       | Only October items (€400)     | €400                         |
| **Plan vs Request** | Entire plan (started in Sept) | €0 (plan started before Oct) |

## Other Differences

### 1. Status Filtering

- **Dashboard**: Excludes `["CREATED", "REJECTED", "DISCARDED"]`
- **Plan vs Request**: Excludes `["CREATED", "DISCARDED"]` (includes REJECTED)

### 2. Request Type Filtering

- **Dashboard**: Explicitly filters by `requestTypeRef`
- **Plan vs Request**: No specific request type filter

### 3. Date Boundary Handling

- **Dashboard**: `_gte: $currentMonthStart, _lt: $currentMonthEnd`
- **Plan vs Request**: `_gte: $startDate, _lte: $endDate`

## Recommendations

### Option 1: Align Both Tabs (Item-Level Dates)

Make Plan vs Request use item-level dates like Dashboard:

```graphql
{ expensePlanItem: { expenseDate: { _gte: $startDate, _lte: $endDate }, isDeleted: { _eq: false } } }
```

**Pros:**

- More accurate for period-based analysis
- Matches expense items to their actual occurrence date
- Consistent with Dashboard

**Cons:**

- More complex query
- May be slower

### Option 2: Align Both Tabs (Plan-Level Dates)

Make Dashboard use plan-level dates like Plan vs Request:

```graphql
{ startDate: { _gte: $startDate, _lte: $endDate } }
```

**Pros:**

- Simpler query
- Faster performance
- Easier to understand

**Cons:**

- Less accurate for period analysis
- Plans spanning multiple periods counted in one period only

### Option 3: Document the Difference

Keep both approaches but:

1. Add tooltips explaining the difference
2. Rename metrics to clarify:
   - Dashboard: "Actual vs Planned (by item date)"
   - Plan vs Request: "Actual vs Planned (by plan start date)"

## Calculation Formula

Both tabs use the same formula once data is fetched:

```typescript
const percent = Math.abs(((actual - planned) / planned) * 100)
```

But they get different `actual` and `planned` values due to the date filtering differences above.

## Files to Review

1. **Dashboard Query**: `src/business-apps/fin/expenses/apps/backoffice-expenses/queries/combinedDashboard.queries.ts` (lines 270-285)
2. **Plan vs Request Query**: `src/business-apps/fin/expenses/apps/backoffice-expenses/components/tabs/plan-vs-request-tab/plan-vs-request/queries/getCombinedPlanVsRequestData.ts` (lines 112-122)
3. **Dashboard Display**: `src/business-apps/fin/expenses/apps/backoffice-expenses/components/tabs/expense-dashboard-tab/ExpenseDashboardTab.tsx` (lines 199-206)
4. **Plan vs Request Display**: `src/business-apps/fin/expenses/apps/backoffice-expenses/components/tabs/plan-vs-request-tab/plan-vs-request/components/PlanVsRequestKpiCards.tsx` (lines 45-57)
