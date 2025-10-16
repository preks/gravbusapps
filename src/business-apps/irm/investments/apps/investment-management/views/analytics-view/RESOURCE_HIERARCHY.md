# IRM Resource Hierarchy & Import Guide

**Quick Reference for Developers**

This document provides a clear hierarchy of where to import utilities, components, and hooks from in the IRM investment management module.

---

## 📊 Resource Hierarchy (Top to Bottom)

```
Level 1: Project-wide Common Utilities
    └─ src/common/data/investment/

Level 2: Investment Management App Utils
    └─ investment-management/utils/

Level 3: Cross-View Shared (Report + Analytics)
    └─ investment-management/shared/ [FUTURE]
    └─ report-view/components/shared/ [CURRENT]

Level 4: Analytics-View Shared
    └─ analytics-view/shared/

Level 5: Tab-Specific Code
    └─ analytics-view/overview/
    └─ analytics-view/equity-analytics/
    └─ analytics-view/liquid-fund-analytics/
    └─ analytics-view/real-estate-analytics/
```

---

## ✅ Import Decision Tree

### Need Currency Formatting?

```typescript
// ✅ PREFER: Investment Management custom formatter (keeps thousands, compacts M/B)
import { formatCurrencyCompact } from '../../utils/currencyUtils'

// ✅ FALLBACK: Common utility (standard compact formatting)
import { formatCurrency } from '@/common/data/investment'

// ❌ NEVER: Create your own formatter
```

### Need Currency Code Extraction?

```typescript
// ✅ PREFER: Analytics-view shared (handles catalog objects + API format)
import { safeCurrencyExtraction } from '../shared/utils/currencyUtils'

// ✅ ALTERNATIVE: Common utility (simpler, API format only)
import { extractCurrencyCode } from '@/common/data/investment'

// ❌ NEVER: Parse currency strings manually
```

### Need Date/Duration Formatting?

```typescript
// ✅ PREFER: Analytics-view shared (investment-specific durations)
import { formatDuration, calculateDurationYears } from '../shared/utils/dateUtils'

// ✅ FALLBACK: Common utility (general date formatting)
import { formatDate, formatDisplayDate } from '@/common/data/investment'

// ❌ NEVER: Create custom date formatters
```

### Need Chart Utilities?

```typescript
// ✅ USE: Analytics-view shared
import { CHART_COLORS, renderCustomizedLabel, createChartConfig } from '../shared/utils/chartUtils'

// ❌ NEVER: Define CHART_COLORS or label renderers locally
```

### Need Data Filtering?

```typescript
// ✅ USE: Analytics-view shared
import { filterInvestmentsByCurrency, shouldShowEmptyState, groupInvestmentsByField } from '../shared/utils/dataFilters'

// ❌ NEVER: Write manual filter/reduce loops for common patterns
```

### Need UI Components?

```typescript
// ✅ PRIMARY: Design system components
import { Button, Card, Select, Spinner } from '@newwork/nw-design-system'

// ✅ SECONDARY: Analytics-view shared components
import { ChartEmptyState, CurrencyFilter, LoadingState, ErrorState } from '../shared/components'

// ✅ TERTIARY: Workspace-level shared components
import { WidgetGroup } from '@/components/widget-group'

// ❌ NEVER: Use legacy gravity-ui-catalog
// ❌ NEVER: Create local empty state/loading components
```

### Need State Management Hooks?

```typescript
// ✅ USE: Analytics-view shared hooks
import { useCurrencySync, useKPIIntegration } from '../shared/hooks'

// ❌ NEVER: Manually sync state or duplicate KPI hook logic
```

### Need Investment Data?

```typescript
// ✅ USE: Common investment data hooks
import {
  useGetInvestments,
  useInvestmentDataIntegration,
  type Investment,
  type EquityInvestment
} from '@/common/data/investment'

// ❌ NEVER: Write custom GraphQL queries for basic investment retrieval
```

### Need Report Filtering (Tables)?

```typescript
// ✅ USE: Report-view shared components
import { ReportFilterPanel, useReportFilters } from '../../report-view/components/shared'

// ⚠️ NOTE: Analytics-view has different UX pattern (single currency vs multi-select)
// Consider adapting or creating analytics-specific wrapper
```

---

## 📁 Detailed Import Paths

### Level 1: Common Investment Utilities

**Path:** `@/common/data/investment`

```typescript
// ✅ Formatters
import {
  extractCurrencyCode, // Extract ISO code from API format
  formatCurrency, // Standard currency formatting
  formatPercentage, // Percentage formatting
  formatDate, // Date formatting with fallback
  formatDisplayDate, // Date for display
  formatLargeNumber, // Compact number formatting
  formatNumber // Standard number formatting
} from '@/common/data/investment'

// ✅ Hooks
import {
  useGetInvestments, // Fetch all investments
  useGetInvestmentById, // Fetch single investment
  useSearchInvestments, // Search investments
  useInvestmentDataIntegration // Integrated data fetching
} from '@/common/data/investment'

// ✅ Types
import type {
  Investment,
  EquityInvestment,
  RealEstateInvestment,
  LiquidFundInvestment,
  InvestmentReport
} from '@/common/data/investment'

// ✅ Queries (if needed for custom hooks)
import { GET_INVESTMENTS, GET_INVESTMENT_BY_ID, SEARCH_INVESTMENTS } from '@/common/data/investment'
```

**When to use:**

- ✅ Project-wide investment data operations
- ✅ Standard formatting needs
- ✅ Type definitions
- ✅ Basic data fetching

**When NOT to use:**

- ❌ When investment-management-specific formatting exists
- ❌ When analytics-specific utilities exist

---

### Level 2: Investment Management Utils

**Path:** `../../utils/` (from analytics-view) or `../utils/` (from views)

```typescript
// ✅ Currency Utilities
import {
  formatCurrencyCompact, // Custom compact formatter (keeps thousands)
  formatCurrency // Alias for formatCurrencyCompact
} from '../../utils/currencyUtils'
```

**When to use:**

- ✅ Displaying currency amounts in charts/tables
- ✅ When standard compact notation doesn't fit requirements
- ✅ Investment management specific formatting

**Features:**

- Keeps thousands as full numbers: `€1,500` not `€1.5K`
- Compacts millions: `€1.5M`
- Compacts billions: `€1.5B`
- Handles API currency format automatically

---

### Level 3: Report-View Shared

**Path:** `../../report-view/components/shared`

```typescript
// ✅ Components
import {
  ReportFilterPanel, // Complete filter UI
  TableStateWrapper // Table state management
} from '../../report-view/components/shared'

// ✅ Hooks
import {
  useReportFilters, // Comprehensive filter state
  type UseReportFiltersReturn,
  type ColumnConfig
} from '../../report-view/components/shared'
```

**When to use:**

- ✅ Report-view tables with filtering
- ✅ Multi-currency filtering
- ✅ Date range filtering
- ✅ Column visibility management
- ✅ Table transpose functionality

**When NOT to use:**

- ⚠️ Analytics-view charts (different UX pattern)
- ⚠️ Single-currency scenarios (consider analytics-specific wrapper)

---

### Level 4: Analytics-View Shared

**Path:** `../shared/` (from tab directories)

#### Components

```typescript
import {
  ChartEmptyState, // Standardized empty state for charts
  CurrencyFilter, // Reusable currency dropdown
  LoadingState, // Standardized loading spinner
  ErrorState // Standardized error display
} from '../shared/components'

// With types
import type {
  ChartEmptyStateProps,
  CurrencyFilterProps,
  LoadingStateProps,
  ErrorStateProps
} from '../shared/components'
```

#### Hooks

```typescript
import {
  useCurrencySync, // Synchronize chart currency with master
  useKPIIntegration, // Generic KPI fetching hook
  useAnalyticsCurrencyFilter // Single-currency filter wrapper
} from '../shared/hooks'

// With types
import type { KPIData, KPIIntegrationResult, KPIFetcher } from '../shared/hooks'
```

#### Utilities

```typescript
// Currency utilities
import {
  safeCurrencyExtraction, // Safe extraction from various formats
  extractAvailableCurrencies, // Extract unique currencies from array
  formatCurrencyDisplay // Intl.NumberFormat wrapper
} from '../shared/utils/currencyUtils'

// Date utilities
import {
  formatDuration, // Format days to readable duration
  formatYearsDuration, // Format years to readable duration
  calculateInvestmentDuration, // Calculate duration from date
  calculateDurationYears // Calculate duration in years
} from '../shared/utils/dateUtils'

// Data filtering utilities
import {
  filterInvestmentsByCurrency, // Filter array by currency
  hasNonZeroValues, // Check if data has non-zero values
  shouldShowEmptyState, // Check if empty state should show
  groupInvestmentsByField // Group and aggregate by field
} from '../shared/utils/dataFilters'

// Chart utilities
import {
  CHART_COLORS, // Design system chart colors
  renderCustomizedLabel, // Pie chart label renderer
  createChartConfig // Chart config generator
} from '../shared/utils/chartUtils'

// Distribution utilities
import {
  computeDistributionByField, // Compute distribution data
  formatAmount, // Format amounts compactly
  calculateInvestmentSizeRanges, // Calculate size quintiles
  calculateInvestmentDurationRanges // Calculate duration quintiles
} from '../shared/utils/distributionUtils'

// Color helpers (from utils.ts)
import {
  calculateChange, // Calculate percentage change
  getInvestmentStatusColor, // Status color mapping
  getRiskLevelColor, // Risk level colors
  getInvestmentRoleColor, // Role colors
  getInvestmentPhaseColor, // Phase colors
  getFundTypeColor // Fund type colors
} from '../shared/utils'
```

#### Types

```typescript
import type {
  BaseInvestmentSummary,
  EquityInvestmentSummary,
  LiquidFundInvestmentSummary,
  RealEstateInvestmentSummary,
  BaseInvestmentKPIs,
  InvestmentKPIsWithComparison,
  PortfolioOverviewKPIs,
  EquityInvestmentKPIs,
  LiquidFundInvestmentKPIs,
  RealEstateInvestmentKPIs
} from '../shared/types'
```

**When to use:**

- ✅ All analytics-view charts and components
- ✅ Analytics-specific data processing
- ✅ Chart empty states
- ✅ Currency synchronization
- ✅ KPI data fetching

**When NOT to use:**

- ❌ Report-view (different patterns)
- ❌ When common utilities already exist

---

## 🚫 Anti-Patterns to Avoid

### ❌ Don't Create Local Utilities

```typescript
// ❌ BAD: Local utility in component file
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

// ✅ GOOD: Import from appropriate level
import { formatCurrencyCompact } from '../../utils/currencyUtils'
```

### ❌ Don't Duplicate Components

```typescript
// ❌ BAD: Local empty state component
const ChartEmptyState = () => (
  <div>No data available</div>
)

// ✅ GOOD: Import from shared
import { ChartEmptyState } from '../shared/components'
```

### ❌ Don't Copy-Paste Hook Logic

```typescript
// ❌ BAD: Duplicate KPI hook logic (70 lines)
export const useMyKPIHook = context => {
  const [current, setCurrent] = useState({
    /* ... */
  })
  const [previous, setPrevious] = useState({
    /* ... */
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  // ... 60 more lines of duplicated logic
}

// ✅ GOOD: Use generic hook (20 lines)
export const useMyKPIHook = context => {
  return useKPIIntegration(
    context,
    { fetch: fetchMyKPIs },
    {
      /* initial state */
    }
  )
}
```

### ❌ Don't Import from Wrong Level

```typescript
// ❌ BAD: Importing from sibling tab
import { MyUtil } from '../equity-analytics/utils/myUtil'

// ✅ GOOD: Import from shared
import { MyUtil } from '../shared/utils/myUtil'
```

### ❌ Don't Skip Design System

```typescript
// ❌ BAD: Custom loading component
const Loading = () => <div className="spinner">Loading...</div>

// ✅ GOOD: Use design system
import { Spinner } from '@newwork/nw-design-system'
// or
import { LoadingState } from '../shared/components'
```

---

## 🎯 Quick Decision Matrix

| Need                    | Import From                        | Example                          |
| ----------------------- | ---------------------------------- | -------------------------------- |
| **Currency formatting** | `investment-management/utils`      | `formatCurrencyCompact`          |
| **Currency extraction** | `analytics-view/shared/utils`      | `safeCurrencyExtraction`         |
| **Date formatting**     | `@/common/data/investment`         | `formatDate`                     |
| **Duration formatting** | `analytics-view/shared/utils`      | `formatDuration`                 |
| **Investment data**     | `@/common/data/investment`         | `useGetInvestments`              |
| **Investment types**    | `@/common/data/investment`         | `Investment`, `EquityInvestment` |
| **Chart colors**        | `analytics-view/shared/utils`      | `CHART_COLORS`                   |
| **Empty state**         | `analytics-view/shared/components` | `ChartEmptyState`                |
| **Currency filter**     | `analytics-view/shared/components` | `CurrencyFilter`                 |
| **Currency sync**       | `analytics-view/shared/hooks`      | `useCurrencySync`                |
| **KPI fetching**        | `analytics-view/shared/hooks`      | `useKPIIntegration`              |
| **Data filtering**      | `analytics-view/shared/utils`      | `filterInvestmentsByCurrency`    |
| **Report filters**      | `report-view/components/shared`    | `ReportFilterPanel`              |
| **UI components**       | `@newwork/nw-design-system`        | `Button`, `Card`, etc.           |
| **Status colors**       | `analytics-view/shared/utils`      | `getInvestmentStatusColor`       |

---

## 🔄 Migration Checklist

When refactoring a component, check:

- [ ] Are you using `formatCurrencyCompact` from `investment-management/utils`?
- [ ] Are you importing from `../shared` instead of creating local utilities?
- [ ] Are you using `ChartEmptyState` from shared components?
- [ ] Are you using `CurrencyFilter` from shared components?
- [ ] Are you using `useCurrencySync` instead of manual state sync?
- [ ] Are you using design system components, not custom ones?
- [ ] Are you importing types from `@/common/data/investment`?
- [ ] Have you removed all local duplicate code?

---

## 📚 Additional Resources

- [Full Refactor Plan](./REFACTOR_PLAN.md)
- [Migration Guide](./REFACTOR_PLAN.md#migration-guide)
- [Common Investment Data Module](../../../../../common/data/investment/README.md)
- [Design System Documentation](https://design-system-docs-url)

---

**Last Updated:** October 16, 2025  
**Maintained By:** IRM Development Team
