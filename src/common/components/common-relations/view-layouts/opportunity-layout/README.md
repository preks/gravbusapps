# Opportunity Layout - Centralized View Pattern

## Overview

The `OpportunityLayout` component is a **context-agnostic, generic view component** that eliminates code duplication across different business contexts (CRM, IRM, etc.). It handles all common logic for opportunity views including:

- ✅ State management (search, filters, sorting, pagination)
- ✅ Data fetching and loading states
- ✅ Dynamic filter configuration
- ✅ Process completion event handling
- ✅ Tab management (List/Board views)
- ✅ Row actions with AppActionMenu
- ✅ Column visibility controls

## Usage Modes

### 1. **Config Mode** (Recommended for full views)

Provides complete data management and state handling.

```typescript
import { OpportunityLayout, type OpportunityViewConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout'

<OpportunityLayout
  context={context}
  config={opportunityConfig}
  dataTestId="my-opportunities-view"
/>
```

### 2. **Simple Mode** (Backward compatible)

For simple container usage without built-in logic.

```typescript
<OpportunityLayout
  statistics={<MyStatistics />}
  listViewContent={<MyListContent />}
  boardViewContent={<MyBoardContent />}
/>
```

---

## How to Centralize a View (Step-by-Step Guide)

This guide shows how to extract and centralize views like **Account View**, **Contact View**, or **Lead View** using the same pattern as `OpportunityLayout`.

### Step 1: Analyze Current Implementation

**Example: Account View**

1. **Identify duplicated code** across contexts:
   - Investment Account View: `src/business-apps/irm/core/apps/investment-relations/views/account-view/`
   - Customer Account View: `src/business-apps/crm/core/apps/customer-relations/views/account-view/`

2. **Look for common patterns**:
   - Similar state management (`useState`, `useEffect`, `useCallback`)
   - Similar filter logic
   - Similar column definitions
   - Similar data fetching patterns
   - Similar UI structure (tabs, search, filters, table)

3. **Identify context-specific differences**:
   - Different GraphQL queries (`InvestmentAccount` vs `Account`)
   - Different column renderers (e.g., investment-specific fields)
   - Different flow contexts
   - Different navigation URLs
   - Different statistics components

### Step 2: Create Central Layout Directory

```bash
mkdir src/common/components/common-relations/view-layouts/account-layout
```

Create these files:

```
account-layout/
├── AccountLayout.tsx           # Main generic component
├── AccountListTabLayout.tsx    # List view wrapper
├── AccountBoardTabLayout.tsx   # Board view wrapper (if needed)
├── index.ts                    # Exports
└── README.md                   # Documentation
```

### Step 3: Create Generic Configuration Interface

**File: `AccountLayout.tsx`**

```typescript
import React, { useState, useCallback, useEffect, useMemo } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

// ============================================================================
// Generic Configuration Interface
// ============================================================================

export interface AccountViewConfig<TAccount, TQueryVariables> {
  // Context type identifier
  contextType: 'investment' | 'customer'

  // Data fetching
  fetchAccounts: (variables: TQueryVariables) => Promise<{
    accounts?: TAccount[]
    total?: number
  }>

  // Dynamic filter data hook
  filterDataHook: (context: BusinessAppContextProps) => {
    owners: Array<{ id: string; label: string }>
    types: Array<{ id: string; label: string }>
    // ... other filter options
  }

  // Column configuration
  createColumns: () => ColumnDef<TAccount>[]
  createSortableColumns: () => Array<{ id: string; label: string }>
  mapColumnToGraphQLField: (columnId: string) => string

  // Filter configuration
  baseFilterConfig: FilterConfiguration

  // Query variable builder
  buildQueryVariables: (params: {
    pagination: { pageIndex: number; pageSize: number }
    searchTerm: string
    selectedFilters: Record<string, any>
    sorting: Array<{ id: string; desc: boolean }>
    mapColumnToGraphQLField: (columnId: string) => string
  }) => TQueryVariables

  // Flow contexts
  flowContexts: {
    entityContext: FlowContextName
    createContext: FlowContextName
  }

  // Navigation
  buildRecordUrl: (id: string) => string

  // UI Components
  renderStatistics: (props: { context: BusinessAppContextProps; onRefresh: () => void }) => React.ReactNode

  // Optional: Board view
  renderBoard?: (props: { context: BusinessAppContextProps; refreshTrigger: number }) => React.ReactNode

  // Optional: Custom row actions
  renderRowActions?: (row: { original: TAccount }, accessToken: string) => React.ReactNode
}

// ============================================================================
// Props Interfaces
// ============================================================================

export interface SimpleAccountLayoutProps {
  initialTab?: 'list' | 'board'
  statistics?: React.ReactNode
  listViewContent?: React.ReactNode
  boardViewContent?: React.ReactNode
}

export interface ConfigAccountLayoutProps<TAccount = any, TQueryVariables = any> {
  context: BusinessAppContextProps
  config: AccountViewConfig<TAccount, TQueryVariables>
  dataTestId?: string
}

export type AccountLayoutProps<T = any, V = any> = SimpleAccountLayoutProps | ConfigAccountLayoutProps<T, V>

// Type guard
function isConfigProps<T, V>(props: AccountLayoutProps<T, V>): props is ConfigAccountLayoutProps<T, V> {
  return 'config' in props && 'context' in props
}

// ============================================================================
// Main Component
// ============================================================================

export const AccountLayout = <TAccount extends { id: string } = any, TQueryVariables = any>(
  props: AccountLayoutProps<TAccount, TQueryVariables>
) => {
  if (isConfigProps(props)) {
    // CONFIG MODE - Full logic here (copy pattern from OpportunityLayout)
    // ... state management
    // ... data fetching
    // ... filter handling
    // ... render with DataDisplay/DataTable
  }

  // SIMPLE MODE - Just container (copy pattern from OpportunityLayout)
  // ... render tabs with provided content
}

export default AccountLayout
```

### Step 4: Create Context-Specific Config Files

**For Investment Accounts:**

```
src/business-apps/irm/core/apps/investment-relations/views/account-view/
├── accountViewConfig.tsx          # NEW: Configuration
├── config/
│   ├── accountColumns.tsx         # NEW: Column definitions
│   └── accountFilters.ts          # NEW: Filter configuration
└── hooks/
    └── useInvestmentAccountFilters.ts  # NEW: Filter data hook
```

**File: `accountViewConfig.tsx`**

```typescript
import React from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { AccountViewConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import type { InvestmentAccount } from '@/common/data/investment/types'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { createAccountColumns, createAccountSortableColumns } from './config/accountColumns'
import { accountFilterConfig } from './config/accountFilters'
import { useInvestmentAccountFilters } from './hooks/useInvestmentAccountFilters'
import { AccountStatistics } from './components/AccountStatistics'

export const createInvestmentAccountConfig = (
  context: BusinessAppContextProps,
  fetchAccounts: (variables: InvestmentAccountQueryVariables) => Promise<{
    InvestmentAccount: InvestmentAccount[]
    InvestmentAccountAggregate: { aggregate: { count: number } }
  }>
): AccountViewConfig<InvestmentAccount, InvestmentAccountQueryVariables> => ({
  contextType: 'investment',

  // Transform response to match expected format
  fetchAccounts: async (variables) => {
    const result = await fetchAccounts(variables)
    return {
      accounts: result.InvestmentAccount,
      total: result.InvestmentAccountAggregate.aggregate.count
    }
  },

  filterDataHook: useInvestmentAccountFilters,

  createColumns: createAccountColumns,
  createSortableColumns: createAccountSortableColumns,

  mapColumnToGraphQLField: (columnId: string): string => {
    const mapping: Record<string, string> = {
      account: 'name',
      type: 'accountType',
      owner: 'ownerEmployeeId',
      created: 'createdAt'
      // ... other mappings
    }
    return mapping[columnId] || columnId
  },

  baseFilterConfig: accountFilterConfig,

  buildQueryVariables: ({ pagination, searchTerm, selectedFilters, sorting, mapColumnToGraphQLField }) => {
    const vars: InvestmentAccountQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    // Apply filters
    if (selectedFilters.type?.length > 0) {
      vars.typeIds = selectedFilters.type
    }
    // ... other filters

    // Sorting
    const sortField = sorting.length > 0 ? sorting[0].id : undefined
    const sortDesc = sorting.length > 0 ? sorting[0].desc : undefined

    if (sortField) {
      vars.orderBy = [{
        field: mapColumnToGraphQLField(sortField) as any,
        direction: sortDesc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
      }]
    }

    return vars
  },

  flowContexts: {
    entityContext: FlowContextName.investmentAccountEntity,
    createContext: FlowContextName.investmentAccountCreate
  },

  buildRecordUrl: (id: string) =>
    buildPlatformUrl('/platform/irm/account-record', {
      accountId: id,
      source: 'investment-relations'
    }),

  renderStatistics: () => <AccountStatistics {...context} />
})
```

### Step 5: Simplify Consumer View

**File: `AccountView.tsx`**

```typescript
import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentAccounts } from '@/common/data/investment/hooks/useInvestmentAccounts'
import { AccountLayout } from '@/common/components/common-relations/view-layouts/account-layout'
import { createInvestmentAccountConfig } from './accountViewConfig'

export type AccountViewProps = BusinessAppContextProps

export const AccountView: React.FC<AccountViewProps> = context => {
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context)
  const config = createInvestmentAccountConfig(context, fetchInvestmentAccounts)
  return <AccountLayout context={context} config={config} dataTestId="investment-accounts-view" />
}

export default AccountView
```

**Before: ~400 lines**  
**After: ~15 lines**  
**Savings: ~96%** 🎉

### Step 6: Repeat for Customer Context

Create `src/business-apps/crm/core/apps/customer-relations/views/account-view/accountViewConfig.tsx` with the same pattern but customer-specific details.

### Step 7: Clean Up

Delete old files that are no longer needed:

- ❌ Old `AccountList.tsx` components
- ❌ Old `AccountTable.tsx` components
- ❌ Old `useAccountListData.ts` hooks
- ❌ Old `types.ts` files

Keep files that are still used elsewhere:

- ✅ Statistics components (if referenced in config)
- ✅ Board components (if referenced in config)
- ✅ Filter hooks used by other components

---

## Benefits of Centralization

### 1. **Code Reduction**

- **Before**: 800+ lines across 2 contexts
- **After**: ~450 lines central + 2×100 lines config = ~650 lines
- **Savings**: ~150 lines + 100% consistency

### 2. **Consistency**

- Identical behavior across all contexts
- Bugs fixed in one place
- Features added once, available everywhere

### 3. **Maintainability**

- Single source of truth
- Type-safe configuration
- Clear separation of concerns

### 4. **Flexibility**

- Easy to add new contexts
- Context-specific customizations via config
- Backward compatible simple mode

---

## Configuration Reference

### Required Config Properties

| Property                  | Type                         | Description               |
| ------------------------- | ---------------------------- | ------------------------- |
| `contextType`             | `'investment' \| 'customer'` | Context identifier        |
| `fetchAccounts`           | `Function`                   | Data fetching function    |
| `filterDataHook`          | `Hook`                       | Dynamic filter options    |
| `createColumns`           | `Function`                   | Column definitions        |
| `createSortableColumns`   | `Function`                   | Sortable column list      |
| `mapColumnToGraphQLField` | `Function`                   | Column ID → GraphQL field |
| `baseFilterConfig`        | `FilterConfiguration`        | Static filter structure   |
| `buildQueryVariables`     | `Function`                   | UI state → GraphQL vars   |
| `flowContexts`            | `Object`                     | Flow registry contexts    |
| `buildRecordUrl`          | `Function`                   | Record navigation URL     |
| `renderStatistics`        | `Function`                   | Statistics component      |

### Optional Config Properties

| Property                  | Type       | Description              |
| ------------------------- | ---------- | ------------------------ |
| `renderBoard`             | `Function` | Board view component     |
| `renderRowActions`        | `Function` | Custom action renderer   |
| `processCompletionEvents` | `string[]` | Event names to listen to |

---

## Examples in Codebase

### ✅ Opportunity View (Implemented)

- **Central**: `src/common/components/common-relations/view-layouts/opportunity-layout/`
- **Investment**: `src/business-apps/irm/core/apps/investment-relations/views/opportunity-view/`
- **Customer**: `src/business-apps/crm/core/apps/customer-relations/views/opportunity-view/`

### 🔄 Ready to Centralize

1. **Account View**
   - `investment-relations/views/account-view/`
   - `customer-relations/views/account-view/`

2. **Contact View**
   - `investment-relations/views/contact-view/`
   - `customer-relations/views/contact-view/`

3. **Lead View**
   - `investment-relations/views/lead-view/`
   - `customer-relations/views/lead-view/`

4. **Task View**
   - `investment-relations/views/task-view/`
   - `customer-relations/views/task-view/`

---

## Common Pitfalls

### ❌ Don't: Mix Response Formats

```typescript
// Hook returns { entities: [], total: number }
// Config expects { Entity: [], EntityAggregate: { aggregate: { count } } }
```

**✅ Do: Transform in Config**

```typescript
fetchAccounts: async variables => {
  const result = await fetchAccounts(variables)
  return {
    accounts: result.InvestmentAccount,
    total: result.InvestmentAccountAggregate.aggregate.count
  }
}
```

### ❌ Don't: Hardcode Context-Specific Logic in Layout

```typescript
if (contextType === 'investment') {
  // Investment-specific code
}
```

**✅ Do: Use Config Functions**

```typescript
config.renderStatistics({ context, onRefresh })
```

### ❌ Don't: Delete Files Still in Use Elsewhere

Check with:

```bash
grep -r "useOldHook" src/
```

**✅ Do: Keep Shared Utilities**

- Statistics components used in config
- Filter hooks used by performance dashboards
- Board components referenced in config

---

## Testing Checklist

After centralizing a view:

- [ ] Data loads correctly in both contexts
- [ ] Search works
- [ ] Filters work (all filter types)
- [ ] Sorting works (all sortable columns)
- [ ] Pagination works
- [ ] Column visibility works
- [ ] Row actions (AppActionMenu) work
- [ ] Create button works
- [ ] Row click navigation works
- [ ] Process completion events trigger refresh
- [ ] Statistics load and refresh
- [ ] Board view works (if applicable)
- [ ] No linter errors
- [ ] No console errors
- [ ] Backward compatibility maintained

---

## Support

For questions or issues with centralization:

1. Check existing `OpportunityLayout` implementation
2. Review this README
3. Check TypeScript types for guidance
4. Test incrementally (one context at a time)

---

**Last Updated**: January 2025  
**Pattern Version**: 1.0  
**Implemented Views**: Opportunity
