# Investment isDeleted Filter Fix

## Issue

The equity investment rounds and investment reports were being queried without filtering out soft-deleted records (`isDeleted = true`). This meant that deleted rounds and reports could appear in the UI.

## Root Cause

The GraphQL fragments in `src/common/data/investment/queries/fragments/investmentFragments.ts` were querying nested relationships without applying `where` clauses to filter out deleted records.

### Before (Problematic Queries)

```graphql
equityInvestmentRound {
    id
    name
    year
    # ... other fields
}
```

This would return ALL rounds, including soft-deleted ones.

## Solution Implemented

### Changes Made

Updated the following fragments in `investmentFragments.ts` to include `isDeleted` filters:

#### 1. Equity Investment Rounds

```graphql
equityInvestmentRound(where: { isDeleted: { _eq: false } }, orderBy: { year: DESC_NULLS_LAST }) {
    id
    name
    year
    preValue
    investmentVolume
    # ... other fields
}
```

#### 2. Equity Investment Reports

```graphql
equityInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
    id
    date
    marketValue
    additionalProperties
}
```

#### 3. Real Estate Investment Reports

```graphql
realEstateInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
    id
    date
    actualAnnualExpenses
    # ... other fields
}
```

#### 4. Liquid Fund Investment Reports

```graphql
liquidFundInvestmentReport(where: { isDeleted: { _eq: false } }, orderBy: { date: DESC_NULLS_LAST }) {
    id
    date
    interestRate
    # ... other fields
}
```

## Benefits

### 1. Data Integrity

- Only active (non-deleted) records are displayed in the UI
- Prevents confusion from seeing "deleted" data
- Consistent with soft-delete pattern used throughout the application

### 2. Improved Ordering

- Added `orderBy` clauses for better data presentation:
  - Rounds: Ordered by year (most recent first)
  - Reports: Ordered by date (most recent first)

### 3. Performance

- Filtering at the database/GraphQL layer is more efficient
- Reduces data transfer and processing in the frontend
- Prevents unnecessary rendering of deleted records

### 4. Consistency

- All investment-related nested queries now follow the same pattern
- Matches the filtering applied to main entity queries (e.g., `Investment`, `InvestmentDocument`)

## Impact

### Components Affected

These changes automatically apply to all components that query investment data, including:

1. **Investment Record** (`InvestmentRecord.tsx`)
   - Displays equity investment rounds
   - Shows investment reports

2. **Equity Investment Rounds** (`EquityInvestmentRounds.tsx`)
   - Table display of rounds
   - Already consumes filtered data from GraphQL

3. **Investment Reports** (various report components)
   - All report views now show only active reports

### No Component Changes Required

Since the filtering happens at the GraphQL fragment level, no component code changes are needed. The components already consume the data from GraphQL and will automatically receive only non-deleted records.

## Testing Recommendations

### Manual Testing

1. **View Investment Record**: Verify only active rounds are displayed
2. **Delete a Round**: Soft-delete a round via the delete action
3. **Refresh View**: Confirm the deleted round no longer appears
4. **Check Reports**: Verify only active reports are shown

### Test Cases

```typescript
// Test: Deleted rounds should not appear
1. Create an equity investment round
2. Verify it appears in the rounds table
3. Delete the round (soft delete)
4. Refresh the investment record
5. Verify the round no longer appears

// Test: Multiple rounds with different states
1. Create 3 equity investment rounds
2. Delete 1 round (soft delete)
3. Verify only 2 active rounds appear
4. Verify they are ordered by year (descending)

// Test: Reports filtering
1. Create investment reports
2. Delete some reports
3. Verify only active reports appear
4. Verify they are ordered by date (descending)
```

## Related Issues

### Equity Investment Round Update Issue

This fix also helps with the equity investment round update issue:

- Ensures form only loads active (non-deleted) rounds
- Prevents attempts to update rounds that have been soft-deleted
- Reduces validation errors from stale data

### Data Consistency

The backend validation error you encountered might have been related to:

- Attempting to update a soft-deleted round
- Version conflicts from deleted/recreated records
- Stale cache data showing deleted records

With this fix, the UI will never attempt to interact with deleted records.

## Files Changed

- `src/common/data/investment/queries/fragments/investmentFragments.ts`

## Additional Notes

### GraphQL Fragment Pattern

The pattern used for filtering is consistent with other queries in the codebase:

```graphql
# Standard pattern for nested relationships
relationshipName(where: { isDeleted: { _eq: false } }, orderBy: { field: DESC_NULLS_LAST }) {
    # fields
}
```

This pattern should be used for any nested relationships that support soft-delete.

### Future Improvements

Consider applying this pattern to other nested relationships:

- Investment roles
- Investment documents (may already be filtered)
- Investment activities
- Investment tasks
- Investment notes

Review and update as needed for consistency.
