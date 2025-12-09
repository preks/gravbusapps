---
name: IRM Account Junction Migration
overview: Migrate IRM codebase from direct account relationships to many-to-many junction tables (investment_investment_account and investment_opportunity_account), updating types, forms, queries, payloads, and views throughout the entire IRM module.
todos:
  - id: update-types
    content: Update TypeScript types for Investment, InvestmentOpportunity, and create junction table types
    status: completed
  - id: update-form-schemas
    content: Update form validation schemas to handle account arrays instead of single account
    status: completed
  - id: update-form-components
    content: Update form field components to support multi-account selection with association metadata
    status: completed
  - id: update-payload-builders
    content: Update payload builders to send junction table associations instead of direct IDs
    status: completed
  - id: update-graphql-queries
    content: Update all GraphQL queries to use junction table relationships instead of direct account fields
    status: completed
  - id: update-table-views
    content: Update table columns and data accessors to handle account arrays with proper display logic
    status: completed
  - id: update-record-views
    content: Update record detail views to display and manage multiple account associations
    status: completed
  - id: update-analytics
    content: Update analytics, KPI queries, and statistics calculations for junction table structure
    status: completed
  - id: update-mappers
    content: Update data mappers and transformers for opportunity-investment conversions
    status: completed
  - id: update-integration-hooks
    content: Update AI autofill, summary hooks, and data integration hooks for account arrays
    status: completed
  - id: testing
    content: Test all forms, views, queries, and integrations with new account association structure
    status: completed
---

# IRM Account Association Migration Plan

## Confirmed Schema Changes

**GraphQL Schema Verified:**

- ✅ `InvestmentInvestmentAccount` junction table exists with fields:
  - `investmentId`, `investmentAccountId`, `investmentAccountTypeRef`
  - Relationships: `investment`, `investmentAccount`, `investmentAccountType`

- ✅ `InvestmentOpportunityAccount` junction table exists with fields:
  - `opportunityId`, `accountId`, `accountTypeRef`
  - Relationships: `opportunity`, `account`, `accountType`

**Migration Goal:** Remove all direct account references and use ONLY junction tables for many-to-many relationships.

---

## Phase 1: Type System Updates

### 1.1 Investment Types

**File:** `src/common/data/investment/types/investmentTypes.new.ts`

**Changes:**

- **Remove** (lines 71-72, 77-78):
  - `investmentAccount?: InvestmentAccount`
  - `investmentAccountId?: string`

- **Add** new junction table relationship:

  ```typescript
  investmentInvestmentAccounts?: InvestmentInvestmentAccount[]
  ```

- **Update** `InvestmentFields` mapping:
  - Remove: `investmentAccount`, `investmentAccountId`
  - Add: `investmentInvestmentAccounts: 'investmentInvestmentAccounts'`

- **Update** `InvestmentFormFields` mapping:
  - Remove: `investmentAccount: 'investmentAccount'`
  - Add: `investmentInvestmentAccounts: 'investmentInvestmentAccounts'`

### 1.2 Investment Opportunity Types

**File:** `src/common/data/investment/types/investmentOpportunityTypes.ts`

**Changes:**

- **Remove** (line 31):
  - `account?: InvestmentAccount`

- **Add** new junction table relationship:

  ```typescript
  investmentOpportunityAccounts?: InvestmentOpportunityAccount[]
  ```

- **Update** descriptors:
  - Remove account descriptor
  - Add investmentOpportunityAccounts array relationship descriptor

### 1.3 Create Junction Table Types

**New File:** `src/common/data/investment/types/investmentAccountAssociationTypes.ts`

**Content:**

```typescript
export interface InvestmentInvestmentAccount extends BaseEntity {
  id: string
  investmentId: string
  investmentAccountId: string
  investmentAccountTypeRef?: string

  // Relationships
  investment?: Investment
  investmentAccount?: InvestmentAccount
  investmentAccountType?: CatalogEntry
}

export interface InvestmentOpportunityAccount extends BaseEntity {
  id: string
  opportunityId: string
  accountId: string
  accountTypeRef?: string

  // Relationships
  opportunity?: InvestmentOpportunity
  account?: InvestmentAccount
  accountType?: CatalogEntry
}
```

---

## Phase 2: Form Schema and Validation

### 2.1 Investment Form Schema

**File:** `src/business-apps/irm/investments/forms/investment-form/utils/investmentFormSchema.ts`

**Changes:**

- **Remove** `accountRefSchema` (lines 18-28) - no longer needed for single account
- **Update** baseInvestmentSchema (line 49-51):

  ```typescript
  // OLD (remove):
  investmentAccount: accountRefSchema.optional().refine(...)

  // NEW (add):
  investmentInvestmentAccounts: z.array(z.object({
    id: z.string().optional(),
    investmentAccountId: z.string().min(1, 'Account is required'),
    investmentAccountTypeRef: z.string().optional()
  })).min(1, 'At least one account is required')
  ```

- **Update** dynamic field handling for `REF_InvestmentAccount` (lines 189-198, 280-291):
  - Change from single reference to array of associations

### 2.2 Opportunity Form Schema

**File:** `src/business-apps/irm/core/forms/opportunity-form/OpportunityForm.tsx`

**Changes:**

- Update schema to use `investmentOpportunityAccounts` array instead of single `accountId`
- Similar pattern to investment form - array of associations with `accountId` and `accountTypeRef`

---

## Phase 3: Form Components and Fields

### 3.1 Investment Account Field Component

**File:** `src/business-apps/irm/investments/forms/investment-form/components/investment-field-types/InvestmentAccountField.tsx`

**Changes:**

- **Rename** to `InvestmentAccountsField.tsx` (plural)
- **Convert** from single select to multi-select with association metadata
- **Update** to handle array of associations:

  ```typescript
  // Store as array of association objects
  onChange: selectedAccounts => {
    formField.onChange(
      selectedAccounts.map(accountId => ({
        investmentAccountId: accountId,
        investmentAccountTypeRef: accountType // from user selection
      }))
    )
  }
  ```

- **Add** account type selector (optional) for each association
- **Add** ability to add/remove multiple accounts

### 3.2 Investment Form Component

**File:** `src/business-apps/irm/investments/forms/investment-form/components/InvestmentFormComponent.tsx`

**Changes:**

- **Update** AI autofill logic (line 412):
  - Change from `watchedInvestmentAccount` to `watchedInvestmentAccounts` (array)
  - Extract first account for AI context: `watchedInvestmentAccounts?.[0]?.investmentAccountId`

- **Update** AI autofill hook call (line 551):
  ```typescript
  // OLD: investmentAccountId: investmentAccountIdForAi
  // NEW: investmentAccountIds: watchedInvestmentAccounts?.map(a => a.investmentAccountId)
  ```

### 3.3 Investment Segment Component

**File:** `src/business-apps/irm/investments/forms/investment-form/components/segments/InvestmentSegment.tsx`

**Changes:**

- Update any direct account field references to use array structure
- Update field name from `investment.investmentAccount` to `investment.investmentInvestmentAccounts`

---

## Phase 4: Payload Builders

### 4.1 Investment Payload

**File:** `src/common/data/investment/payloads/investmentPayloads.ts`

**Changes:**

- **Remove** interface field (line 64):

  ```typescript
  // OLD: investmentAccount?: InvestmentAccount
  ```

- **Add** to `InvestmentData` interface:

  ```typescript
  investmentInvestmentAccounts?: Array<{
    id?: string
    investmentAccountId: string
    investmentAccountTypeRef?: string
  }>
  ```

- **Update** payload builder (lines 266-267):

  ```typescript
  // OLD (remove):
  ...(investment.investmentAccount?.id && {
    investmentAccount: investment.investmentAccount.id
  }),

  // NEW (add after line 274):
  ...(investment.investmentInvestmentAccounts?.length && {
    investmentInvestmentAccounts: investment.investmentInvestmentAccounts.map(assoc => ({
      ...(assoc.id && { id: assoc.id }),
      investmentAccountId: assoc.investmentAccountId,
      ...(assoc.investmentAccountTypeRef && {
        investmentAccountTypeRef: assoc.investmentAccountTypeRef
      })
    }))
  })
  ```

### 4.2 Opportunity Payload

**File:** `src/common/data/investment/types/investmentOpportunityTypes.ts`

**Changes in `buildInvestmentOpportunityPayload` function:**

- Update to handle `investmentOpportunityAccounts` array
- Remove direct `accountId` field handling
- Add array processing similar to investment payload

---

## Phase 5: GraphQL Queries

### 5.1 Portfolio Top Accounts Query

**File:** `src/business-apps/irm/investments/apps/investment-management/views/analytics-view/overview/queries/PortfolioTopAccountsQuery.ts`

**Critical Changes:**

- **Line 29** - Change from:
  ```typescript
  investmentAccountId: {
    _isNull: false
  }
  ```

to:

```typescript
investmentInvestmentAccounts: {
  investmentAccountId: {
    _isNull: false
  }
}
```

- **Line 31** - Remove `distinctOn: investmentAccountId` (no longer valid)

- **Lines 34-38** - Replace entire query structure:

  ```graphql
  # OLD:
  investmentAccountId
  investmentAccount { id, name }

  # NEW:
  investmentInvestmentAccounts(where: { isDeleted: { _eq: false } }) {
    id
    investmentAccountId
    investmentAccount {
      id
      name
    }
  }
  ```

- **Line 52** - Update aggregate query conditions:

  ```typescript
  // OLD: `investmentAccountId: { _eq: "${accountId}" }`
  // NEW: `investmentInvestmentAccounts: { investmentAccountId: { _eq: "${accountId}" } }`
  ```

- **Lines 108-121** - Update result processing:
  ```typescript
  // OLD: Extract from Investment.investmentAccountId
  // NEW: Flatten from Investment.investmentInvestmentAccounts array
  const accounts: AccountInfo[] = distinctResult.Investment.flatMap(inv => inv.investmentInvestmentAccounts || [])
    .filter(assoc => assoc.investmentAccount)
    .map(assoc => ({
      accountId: assoc.investmentAccountId,
      accountName: assoc.investmentAccount.name || 'Unknown'
    }))
  ```

### 5.2 Other Investment Queries

**Files to update:**

- `src/business-apps/irm/investments/forms/investment-form/hooks/useInvestmentAiAutofill.ts` (lines 75-76)
- `src/business-apps/irm/investments/apps/investment-management/views/analytics-view/overview/hooks/useInvestmentPortfolioIntegration.ts`
- `src/business-apps/irm/investments/apps/investment-management/views/report-view/tabs/*/queries/*.ts`
- `src/business-apps/irm/investments/records/investment-record/hooks/useInvestmentReportData.ts`

**Pattern for all:**

- Replace `investmentAccountId` field queries with `investmentInvestmentAccounts` relationship queries
- Update filters from `investmentAccountId: { _eq: "..." }` to `investmentInvestmentAccounts: { investmentAccountId: { _eq: "..." } }`

### 5.3 Opportunity Queries

**Files to update:**

- All opportunity query files in `src/business-apps/irm/core/apps/investment-relations/views/*/queries/`
- `src/business-apps/irm/core/forms/opportunity-form/OpportunityForm.tsx` (queries)

**Pattern:**

- Replace `accountId` field queries with `investmentOpportunityAccounts` relationship
- Update filters similarly to investment queries

---

## Phase 6: View Components and Table Columns

### 6.1 Investment Table Columns

**Files:**

- `src/business-apps/irm/investments/apps/investment-management/views/investment-view/data/*/List.tsx`
- `src/business-apps/irm/investments/apps/investment-management/views/divestment-view/tabs/*/Tab.tsx`
- `src/business-apps/irm/investments/records/investment-record/components/shared/InvestmentHomeTab.tsx`

**Changes:**

- **Update** account column accessor:

  ```typescript
  // OLD:
  accessorKey: 'investmentAccount.name'

  // NEW (display first account or multiple):
  accessorFn: row => {
    const accounts = row.investmentInvestmentAccounts || []
    if (accounts.length === 0) return 'No accounts'
    if (accounts.length === 1) return accounts[0].investmentAccount?.name || '-'
    return `${accounts.length} accounts` // Show count for multiple
  }
  ```

- **Update** cell rendering to handle multiple accounts:
  ```typescript
  cell: ({ row }) => {
    const accounts = row.original.investmentInvestmentAccounts || []
    if (accounts.length === 0) return <span>-</span>
    if (accounts.length === 1) {
      return <span>{accounts[0].investmentAccount?.name}</span>
    }
    return (
      <Badge variant="secondary">
        {accounts.length} accounts
      </Badge>
    )
  }
  ```

### 6.2 Opportunity Table Columns

**Files:**

- `src/business-apps/irm/core/apps/investment-relations/views/opportunity-view/OpportunityView.tsx`
- `src/business-apps/irm/core/records/account-record/views/opportunity-view/OpportunityView.tsx`
- `src/business-apps/irm/core/records/opportunity-record/OpportunityRecord.tsx`

**Changes:**

- Similar pattern to investment tables
- Update from `opportunity.account.name` to `opportunity.investmentOpportunityAccounts[0].account.name`
- Handle multiple accounts display

### 6.3 Investment Record Home Tab

**File:** `src/business-apps/irm/investments/records/investment-record/components/shared/InvestmentHomeTab.tsx`

**Changes:**

- Update account display section to show all associated accounts
- Add account type badges if `investmentAccountTypeRef` is present
- Add UI for managing multiple accounts (add/remove)

### 6.4 Investment Portal

**Files:**

- `src/business-apps/irm/investments/apps/investment-portal/InvestmentPortal.tsx`
- `src/business-apps/irm/investments/apps/investment-portal/components/InvestmentExpandableCard.tsx`

**Changes:**

- Update account field display to handle arrays
- Show comma-separated list or badges for multiple accounts

---

## Phase 7: Statistics and Dashboard Components

### 7.1 Dashboard Statistics

**Files:**

- `src/business-apps/irm/core/apps/investment-launcher/hooks/useInvestmentDashboardStats.ts`
- `src/business-apps/irm/core/apps/investment-relations/views/dashboard-view/hooks/useOverviewData.ts`
- `src/business-apps/irm/investments/apps/investment-management/views/dashboard-view/queries/InvestmentKPIQueries.ts`

**Changes:**

- Update any queries that filter by account to use junction table relationship
- Update aggregate queries to properly traverse the association

### 7.2 Analytics Queries

**Files:** All KPI query files in:

- `src/business-apps/irm/investments/apps/investment-management/views/analytics-view/*/queries/*KPIQueries.ts`

**Changes:**

- Update WHERE clauses that reference `investmentAccountId`
- Use relationship path: `investmentInvestmentAccounts.investmentAccountId`

---

## Phase 8: Data Integration Hooks

### 8.1 Investment Hooks

**Files:**

- `src/common/data/investment/hooks/useInvestments.new.ts`
- `src/common/data/investment/hooks/useInvestment.new.ts`

**Changes:**

- Ensure GraphQL fragments include `investmentInvestmentAccounts` relationship
- Remove any `investmentAccountId` field selections

### 8.2 Opportunity Hooks

**Files:**

- `src/common/data/investment/hooks/useInvestmentOpportunity.ts`
- `src/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters.ts`

**Changes:**

- Include `investmentOpportunityAccounts` in GraphQL fragments
- Update filter logic for account-based filters

---

## Phase 9: Mappers and Transformers

### 9.1 Opportunity to Investment Mapper

**File:** `src/business-apps/irm/investments/forms/investment-form/utils/opportunityToInvestmentMapper.ts`

**Changes:**

- Map `opportunity.investmentOpportunityAccounts` to `investment.investmentInvestmentAccounts`
- Convert association structure as needed

### 9.2 Investment to Opportunity Mapper

**File:** `src/common/data/investment/utils/investmentToOpportunityMapper.ts`

**Changes:**

- Reverse mapping for divestment flows
- Map investment accounts array to opportunity accounts array

---

## Phase 10: Report Types and Queries

### 10.1 Real Estate Report Types

**File:** `src/business-apps/irm/investments/apps/investment-management/views/report-view/tabs/real-estate-report-tab/types/realEstateReportTypes.ts`

**Changes:**

- Update investment type definitions to use array associations
- Update any account-related computed fields

### 10.2 Report Queries

**File:** `src/business-apps/irm/investments/apps/investment-management/views/report-view/tabs/real-estate-report-tab/queries/realEstateReportQueries.ts`

**Changes:**

- Update queries to fetch `investmentInvestmentAccounts` relationship
- Update JOIN conditions if using raw SQL

### 10.3 Report Mappers

**File:** `src/business-apps/irm/investments/apps/investment-management/views/report-view/tabs/real-estate-report-tab/mappers/realEstateReportMappers.ts`

**Changes:**

- Update data transformation to handle account arrays
- Flatten or aggregate account data as needed for reports

---

## Phase 11: Record Views and Context

### 11.1 Opportunity Record

**File:** `src/business-apps/irm/core/records/opportunity-record/OpportunityRecord.tsx`

**Changes:**

- **Line 909** - Update context data:

  ```typescript
  // OLD: accountId: opportunityData?.account?.id
  // NEW: accountIds: opportunityData?.investmentOpportunityAccounts?.map(a => a.accountId)
  ```

- Update navigation links that pass account context

### 11.2 Account Record

**File:** `src/business-apps/irm/core/records/account-record/AccountRecord.tsx`

**Changes:**

- Update opportunity filtering to use junction table
- **Line 273** - Ensure `OpportunityView` can filter by accountId via junction table

---

## Phase 12: Form Task Integration

### 12.1 Task Form

**File:** `src/business-apps/irm/core/forms/task-form/TaskForm.tsx`

**Changes:**

- **Line 77** - Update dependencies array if needed
- Ensure account context handling supports both old and new formats during migration

### 12.2 Activity Form

**File:** `src/business-apps/irm/core/forms/activity-form/ActivityForm.tsx`

**Changes:**

- Similar to task form
- Update entity hydration logic if it references accounts

### 12.3 Note Form

**File:** `src/business-apps/irm/core/forms/note-form/NoteForm.tsx`

**Changes:**

- Update entity validation (line 203) to handle account arrays

---

## Phase 13: AI and Summary Features

### 13.1 AI Autofill Hook

**File:** `src/business-apps/irm/investments/forms/investment-form/hooks/useInvestmentAiAutofill.ts`

**Changes:**

- **Lines 75-76** - Update payload structure:
  ```typescript
  // OLD: metaPayload.investment_account_id = params.investmentAccountId
  // NEW: metaPayload.investment_account_ids = params.investmentAccountIds
  ```

### 13.2 AI Summary Hook

**File:** `src/business-apps/irm/investments/records/investment-record/hooks/useInvestmentAiSummary.ts`

**Changes:**

- Update to extract accounts from array for AI context
- Include all accounts or just primary account

---

## Phase 14: Form Context and State Management

### 14.1 Investment Form Context

**File:** `src/business-apps/irm/investments/forms/investment-form/context/InvestmentFormContext.tsx`

**Changes:**

- Update initial values structure for accounts array
- Update form value transformations

### 14.2 Investment Form Schema

**File:** `src/business-apps/irm/investments/forms/investment-form/utils/investmentFormSchema.ts`

**Changes:**

- Already covered in Phase 2, but verify:
  - Type inference matches new array structure
  - Error messages reference correct field paths

---

## Testing and Validation Checklist

### Forms

- [ ] Investment form can select multiple accounts
- [ ] Investment form validation requires at least one account
- [ ] Opportunity form can select multiple accounts
- [ ] Form submission sends correct junction table payload

### Views and Tables

- [ ] Investment tables display account names correctly
- [ ] Multi-account investments show badge with count
- [ ] Clicking account navigates to account record
- [ ] Sorting and filtering by account still work

### Queries and Data

- [ ] Portfolio top accounts query returns correct aggregates
- [ ] Investment queries include account associations
- [ ] Opportunity queries include account associations
- [ ] Statistics calculations account for multiple accounts per investment

### Analytics and Reports

- [ ] Dashboard KPIs calculate correctly
- [ ] Investment reports include account data
- [ ] Analytics charts use correct account relationships

### Integration

- [ ] AI autofill works with multiple accounts
- [ ] Lead conversion creates opportunity with accounts
- [ ] Opportunity conversion creates investment with accounts

---

## Migration Safety Notes

1. **Backward Compatibility**: Consider adding temporary computed fields during migration:

   ```typescript
   // In Investment type (temporary)
   get investmentAccount() {
     return this.investmentInvestmentAccounts?.[0]?.investmentAccount
   }
   ```

2. **Data Migration**: Backend team must migrate existing data:
   - Copy `investment.investmentAccountId` → `investment_investment_account.investmentAccountId`
   - Copy `opportunity.accountId` → `investment_opportunity_account.accountId`

3. **Error Handling**: Add graceful fallbacks for missing account data:

   ```typescript
   const accountName = investment.investmentInvestmentAccounts?.[0]?.investmentAccount?.name || 'No account'
   ```

4. **Performance**: Junction tables add JOIN overhead - ensure queries include proper indexes

---

## Estimated File Count: 40-50 files across all phases
