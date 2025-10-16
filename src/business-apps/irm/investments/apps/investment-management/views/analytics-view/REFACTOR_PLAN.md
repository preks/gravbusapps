# Analytics View Refactoring Plan

**Last Updated:** October 16, 2025  
**Status:** Planning Phase  
**Goal:** Centralize shared logic, components, and utilities across all analytics view tabs to reduce code duplication by 75%+

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current State Analysis](#current-state-analysis)
3. [Existing IRM Resources](#existing-irm-resources)
4. [Proposed Architecture](#proposed-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Migration Guide](#migration-guide)
7. [Testing Strategy](#testing-strategy)
8. [Success Metrics](#success-metrics)

---

## Overview

### Problem Statement

The analytics-view currently has significant code duplication across four analytics tabs:

- **Overview** (`overview/`)
- **Equity Analytics** (`equity-analytics/`)
- **Liquid Fund Analytics** (`liquid-fund-analytics/`)
- **Real Estate Analytics** (`real-estate-analytics/`)

**Important:** These analytics tabs query from the **main Investment tables** (Investment, EquityInvestment, LiquidFundInvestment, RealEstateInvestment), not from InvestmentReport tables. This is distinct from the report-view which handles investment reports.

**Duplication identified:**

- Currency utilities: 4× (200 lines total)
- KPI integration hooks: 4× (423 lines total)
- Chart empty states: 3× in overview alone (120 lines)
- Currency filter UI: ~8× across charts (160 lines)
- Duration formatting: 2× (120 lines)
- Chart utilities: Equity-only (should be shared)

**Total duplication:** ~1,023 lines that could be reduced to ~380 lines (63% reduction)

### Goals

1. **Eliminate duplication** by creating shared utilities and components
2. **Leverage existing IRM resources** that are currently underutilized
3. **Improve maintainability** with single source of truth
4. **Standardize patterns** across all analytics reports
5. **Enable faster development** of new analytics features

### Success Criteria

- ✅ Zero duplicate utility functions across tabs
- ✅ Consistent currency filtering UI and behavior
- ✅ Standardized empty/loading/error states
- ✅ All tabs use centralized chart utilities
- ✅ KPI hooks follow generic pattern
- ✅ 75%+ reduction in duplicated code
- ✅ All existing functionality preserved
- ✅ No regressions in user experience

---

## Current State Analysis

### Directory Structure (Current)

```
analytics-view/
├── overview/
│   ├── components/
│   │   ├── PortfolioAnalyticsCharts.tsx      # 318 lines, has ChartEmptyState (40 lines)
│   │   ├── PortfolioDistributionCharts.tsx   # 606 lines, has ChartEmptyState (40 lines)
│   │   └── PortfolioTimelineCharts.tsx       # 384 lines, has ChartEmptyState (41 lines)
│   ├── hooks/
│   │   ├── useInvestmentPortfolioIntegration.ts  # 216 lines
│   │   └── usePortfolioChartData.ts
│   ├── queries/
│   │   └── PortfolioKPIQueries.ts            # Queries Investment table
│   └── InvestmentPortfolioOverview.tsx       # Has safeCurrencyExtraction (14 lines)
│
├── equity-analytics/                          # Queries EquityInvestment table
│   ├── components/
│   │   ├── EquityAnalyticsCharts.tsx
│   │   ├── EquityDistributionCharts.tsx
│   │   ├── EquityTimelineCharts.tsx
│   │   └── shared/                           # ⚠️ Should be promoted to analytics-view/shared
│   │       ├── chartUtils.ts                 # 48 lines - REUSABLE
│   │       ├── distributionUtils.ts          # 220 lines - REUSABLE
│   │       ├── DistributionPieChart.tsx      # REUSABLE
│   │       └── InvestmentSizeDurationCharts.tsx  # REUSABLE
│   ├── hooks/
│   │   └── useEquityKPIIntegration.ts        # 67 lines, 90% similar to others
│   └── EquityInvestmentsReport.tsx           # Has safeCurrencyExtraction, formatDuration
│
├── liquid-fund-analytics/                     # Queries LiquidFundInvestment table
│   ├── components/
│   │   ├── LiquidFundAnalyticsCharts.tsx
│   │   ├── LiquidFundDistributionCharts.tsx
│   │   ├── LiquidFundTimelineCharts.tsx
│   │   └── LiquidFundKPICards.tsx
│   ├── hooks/
│   │   └── useLiquidFundKPIIntegration.ts    # 70 lines, 90% similar to others
│   └── LiquidFundInvestmentsReport.tsx       # Has safeCurrencyExtraction
│
├── real-estate-analytics/                     # Queries RealEstateInvestment table
│   ├── components/
│   │   ├── RealEstateAnalyticsCharts.tsx
│   │   ├── RealEstateDistributionCharts.tsx
│   │   ├── RealEstateTimelineCharts.tsx
│   │   └── RealEstateKPICards.tsx
│   ├── hooks/
│   │   └── useRealEstateKPIIntegration.ts    # 70 lines, 90% similar to others
│   └── RealEstateInvestmentsReport.tsx       # Has safeCurrencyExtraction
│
└── shared/                                    # ⚠️ Currently minimal
    ├── types.ts                               # Good - comprehensive types
    └── utils.ts                               # Good - color helpers, calculateChange
```

### Code Duplication Details

#### 1. Currency Utilities (Duplicated 4×)

**Locations:**

- `overview/hooks/useInvestmentPortfolioIntegration.ts` (lines ~50-62)
- `equity-analytics/EquityInvestmentsReport.tsx` (lines ~49-62)
- `liquid-fund-analytics/LiquidFundInvestmentsReport.tsx` (lines ~48-60)
- `real-estate-analytics/RealEstateInvestmentsReport.tsx` (lines ~42-54)

**Duplicate code:**

```typescript
const safeCurrencyExtraction = (currency: any): string | null => {
  if (!currency) return null
  if (typeof currency === 'object') {
    const currencyStr = currency.code || currency.value
    if (!currencyStr) return null
    return extractCurrencyCode(currencyStr)
  }
  return extractCurrencyCode(currency)
}
```

**Impact:** ~60 lines across 4 files

#### 2. KPI Integration Hooks (Similar pattern 4×)

**Locations:**

- `overview/hooks/useInvestmentPortfolioIntegration.ts` (216 lines)
- `equity-analytics/hooks/useEquityKPIIntegration.ts` (67 lines)
- `liquid-fund-analytics/hooks/useLiquidFundKPIIntegration.ts` (70 lines)
- `real-estate-analytics/hooks/useRealEstateKPIIntegration.ts` (70 lines)

**Pattern similarity:** 90% identical structure:

- All have: `current`, `previous`, `isLoading`, `error`, `refetch`
- All use: `useState`, `useCallback`, `useEffect` with same logic
- Only differ in: Type names and query function calls

**Impact:** ~423 lines (could be ~150 lines with generic hook)

#### 3. Chart Empty State Component (Duplicated 3×)

**Locations:**

- `overview/components/PortfolioAnalyticsCharts.tsx` (lines 24-40)
- `overview/components/PortfolioDistributionCharts.tsx` (lines 24-40)
- `overview/components/PortfolioTimelineCharts.tsx` (lines 25-41)

**Duplicate component:**

```typescript
const ChartEmptyState: React.FC<{ message?: string; height?: string }> = ({
  message = 'No data available for the selected currency',
  height = 'gba:h-[400px]'
}) => (
  <div className={`gba:flex gba:flex-col gba:items-center gba:justify-center ${height} gba:text-gray-500`}>
    {/* SVG icon */}
    <p className="gba:text-sm gba:font-medium">{message}</p>
    <p className="gba:text-xs gba:mt-1">Try selecting a different currency</p>
  </div>
)
```

**Impact:** ~120 lines across 3 files

#### 4. Currency Filter UI (Repeated ~8×)

**Locations:** Each chart component that filters by currency

**Duplicate pattern:**

```typescript
<Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
  <SelectTrigger className="gba:w-24">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    {availableCurrencies.map(currency => (
      <SelectItem key={currency} value={currency}>
        {currency}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Impact:** ~160 lines across multiple files

#### 5. Currency Synchronization (Repeated 3×)

**Pattern:**

```typescript
const [chartCurrency, setChartCurrency] = useState(masterCurrency)
useEffect(() => {
  setChartCurrency(masterCurrency)
}, [masterCurrency])
```

**Impact:** ~30 lines across chart components

#### 6. Duration Formatting (Duplicated 2×)

**Locations:**

- `equity-analytics/EquityInvestmentsReport.tsx` (lines 64-92, ~29 lines)
- `equity-analytics/components/shared/distributionUtils.ts` (lines 66-73, different format)

**Impact:** ~120 lines with different implementations

---

## Existing IRM Resources

### Resource Hierarchy (What Already Exists)

```
src/common/data/investment/              # ✅ Level 1: Project-wide
└── utils/
    ├── formatters.ts                    # extractCurrencyCode, formatCurrency, etc.
    └── debounce.ts

investment-management/
├── utils/
│   └── currencyUtils.ts                 # ✅ Level 2: formatCurrencyCompact
│
└── views/
    ├── report-view/components/shared/   # ✅ Level 3: Report filtering
    │   ├── ReportFilterPanel.tsx        # Complete filter UI with currency
    │   ├── TableStateWrapper.tsx
    │   └── hooks/
    │       └── useReportFilters.ts      # Currency + date + column filtering
    │
    └── analytics-view/shared/           # ⚠️ Level 4: Minimal (needs expansion)
        ├── types.ts                     # ✅ Good
        └── utils.ts                     # ✅ Good but incomplete
```

### Level 1: Common Investment Utilities

**Path:** `src/common/data/investment/`

**What's available:**

```typescript
// utils/formatters.ts
export const extractCurrencyCode: (currencyRef: string) => string
export const formatCurrency: (amount: number, currencyRef?: string) => string
export const formatPercentage: (value: number) => string
export const formatDate: (dateString: string, format?: string) => string
export const formatDisplayDate: (dateString: string) => string
export const getStatusColor: (status: string) => string
export const formatLargeNumber: (value: number) => string
export const formatNumber: (value: number) => string
```

**Current usage:** ✅ All analytics views import from here (good!)

**What it provides:**

- Currency code extraction from API format (`Currency:v1:EUR` → `EUR`)
- Currency formatting (re-exports from `@/common/utils/numberFormatter`)
- Date formatting utilities
- Status color mapping

### Level 2: Investment Management Utils

**Path:** `investment-management/utils/currencyUtils.ts`

**What's available:**

```typescript
export const formatCurrencyCompact: (amount: number, currency?: string) => string
export const formatCurrency: (amount: number, currency?: string) => string // Legacy alias
```

**Current usage:** ⚠️ NOT used by analytics-view (should be!)

**What it provides:**

- Custom compact formatting that keeps thousands as full numbers
- Proper handling of millions (M) and billions (B)
- Built-in currency code extraction

**Example:**

```typescript
formatCurrencyCompact(1500, 'EUR') // €1,500
formatCurrencyCompact(1500000, 'EUR') // €1.5M
formatCurrencyCompact(1500000000, 'USD') // $1.5B
```

### Level 3: Report-View Shared Components

**Path:** `report-view/components/shared/`

**What's available:**

#### `ReportFilterPanel.tsx`

Complete filter UI component with:

- Date range filtering (start/end dates)
- Currency multi-select with catalog integration
- Column visibility management
- Table transpose toggle
- Clear filters button

**Props:**

```typescript
interface ReportFilterPanelProps {
  filters: UseReportFiltersReturn // From useReportFilters hook
  accessToken: string
  availableCurrencyIds?: string[] // Currencies to show
  variant?: 'card' | 'simple'
  title?: string
  description?: string
}
```

#### `useReportFilters.ts`

Comprehensive filter state management:

**Returns:**

```typescript
interface UseReportFiltersReturn {
  // State
  startDate: dayjs.Dayjs | null
  endDate: dayjs.Dayjs | null
  isTransposed: boolean
  columnConfig: ColumnConfig[]
  visibleColumns: string[]
  selectedCurrencies: string[] // Multi-select
  availableCurrencies: string[]
  filtersInitialized: boolean

  // Callbacks
  handleStartDateChange: (date) => void
  handleEndDateChange: (date) => void
  handleClearFilters: () => void
  handleTransposeToggle: () => void
  handleColumnVisibilityChange: (id, visible) => void
  handleCurrencyChange: (currencies: string[]) => void
  handleAvailableCurrenciesUpdate: (currencies: string[]) => void

  // Computed filters for API calls
  computedFilters: {
    startDate?: string
    endDate?: string
    currencyIds?: string[]
  }
}
```

**Current usage:** ✅ Used by report-view (equity, liquid-fund, real-estate reports)  
**Potential usage:** ⚠️ Could be adapted for analytics-view

**Difference from analytics-view:**

- Report-view uses **multi-select currencies** for filtering tables
- Analytics-view uses **single currency** for chart display
- Both need currency management, but different UX patterns

### Level 4: Analytics-View Shared (Current)

**Path:** `analytics-view/shared/`

**What exists:**

#### `types.ts` - ✅ Comprehensive and good

```typescript
// Investment summaries for analytics (from main Investment tables)
export interface BaseInvestmentSummary { ... }
export interface EquityInvestmentSummary { ... }
export interface LiquidFundInvestmentSummary { ... }
export interface RealEstateInvestmentSummary { ... }
export interface BaseInvestmentKPIs { ... }
export interface InvestmentKPIsWithComparison { ... }
export interface PortfolioOverviewKPIs { ... }
```

**Note:** These interfaces are for **investment analytics** (querying Investment, EquityInvestment, LiquidFundInvestment, RealEstateInvestment tables), not investment reports (InvestmentReport table).

#### `utils.ts` - ✅ Good but incomplete

```typescript
// Re-exports from common
export { extractCurrencyCode, formatCurrency, ... } from '@/common/data/investment'

// Analytics-specific utilities
export const calculateChange: (current, previous) => { value, positive }
export const getInvestmentStatusColor: (status) => string
export const getRiskLevelColor: (riskLevel) => string
export const getInvestmentRoleColor: (role) => string
export const getInvestmentPhaseColor: (phase) => string
export const getFundTypeColor: (fundType) => string
```

**What's missing:**

- Components (ChartEmptyState, CurrencyFilter, LoadingState, ErrorState)
- Hooks (useCurrencySync, useKPIIntegration)
- Chart utilities (moved from equity/shared)
- Data filtering utilities
- Date/duration utilities

---

## Proposed Architecture

### Target Directory Structure

```
analytics-view/
├── shared/                                    # ✅ Expanded shared resources
│   ├── components/
│   │   ├── index.ts
│   │   ├── ChartEmptyState.tsx               # 🆕 Replaces 3× duplicates
│   │   ├── CurrencyFilter.tsx                # 🆕 Replaces ~8× duplicates
│   │   ├── LoadingState.tsx                  # 🆕 Standardized loading
│   │   ├── ErrorState.tsx                    # 🆕 Standardized errors
│   │   ├── DistributionPieChart.tsx          # 🔄 Moved from equity/shared
│   │   └── InvestmentSizeDurationCharts.tsx  # 🔄 Moved from equity/shared
│   │
│   ├── hooks/
│   │   ├── index.ts
│   │   ├── useCurrencySync.ts                # 🆕 Currency synchronization
│   │   ├── useKPIIntegration.ts              # 🆕 Generic KPI hook
│   │   └── useAnalyticsCurrencyFilter.ts     # 🆕 Single-currency filter
│   │
│   ├── utils/
│   │   ├── index.ts                          # 🔄 Enhanced exports
│   │   ├── currencyUtils.ts                  # 🆕 safeCurrencyExtraction, etc.
│   │   ├── dateUtils.ts                      # 🆕 formatDuration, etc.
│   │   ├── chartUtils.ts                     # 🔄 Moved from equity/shared
│   │   ├── distributionUtils.ts              # 🔄 Generalized from equity
│   │   └── dataFilters.ts                    # 🆕 Currency filtering helpers
│   │
│   ├── types.ts                              # ✅ Keep (already good)
│   └── utils.ts                              # 🔄 Keep but move specifics to submodules
│
├── overview/                                  # ♻️ Refactored - Queries Investment table
│   ├── components/
│   │   ├── PortfolioAnalyticsCharts.tsx      # Uses shared components
│   │   ├── PortfolioDistributionCharts.tsx   # Uses shared components
│   │   └── PortfolioTimelineCharts.tsx       # Uses shared components
│   ├── hooks/
│   │   └── useInvestmentPortfolioIntegration.ts  # Uses generic useKPIIntegration
│   └── InvestmentPortfolioOverview.tsx       # Uses shared utilities
│
├── equity-analytics/                          # ♻️ Refactored - Queries EquityInvestment table
│   ├── components/
│   │   ├── EquityAnalyticsCharts.tsx         # Uses shared components
│   │   ├── EquityDistributionCharts.tsx      # Uses shared components
│   │   └── EquityTimelineCharts.tsx          # Uses shared components
│   ├── hooks/
│   │   └── useEquityKPIIntegration.ts        # Uses generic useKPIIntegration
│   └── EquityInvestmentsReport.tsx           # Uses shared utilities
│
├── liquid-fund-analytics/                     # ♻️ Refactored - Queries LiquidFundInvestment table
│   └── (similar structure, uses shared resources)
│
└── real-estate-analytics/                     # ♻️ Refactored - Queries RealEstateInvestment table
    └── (similar structure, uses shared resources)
```

### Shared Components Specification

#### 1. `ChartEmptyState.tsx`

**Purpose:** Standardized empty state for all charts

**Props:**

```typescript
interface ChartEmptyStateProps {
  message?: string // Default: 'No data available for the selected currency'
  height?: string // Default: 'gba:h-[400px]'
  showCurrencyHint?: boolean // Default: true
  icon?: React.ReactNode // Custom icon (optional)
}
```

**Usage:**

```typescript
import { ChartEmptyState } from '../shared/components'

{shouldShowEmptyState(data, ['totalAmount']) ? (
  <ChartEmptyState message="No investment amounts recorded for this currency" />
) : (
  <ChartContainer>...</ChartContainer>
)}
```

**Replaces:** 3× duplicates in overview components (~120 lines → ~50 lines)

#### 2. `CurrencyFilter.tsx`

**Purpose:** Reusable currency dropdown component

**Props:**

```typescript
interface CurrencyFilterProps {
  value: string
  onChange: (value: string) => void
  currencies: string[]
  className?: string // Default: 'gba:w-24'
  dataTestId?: string
  showLabel?: boolean // Default: false
  label?: string // Default: 'Currency:'
}
```

**Usage:**

```typescript
import { CurrencyFilter } from '../shared/components'

<CurrencyFilter
  value={selectedCurrency}
  onChange={setSelectedCurrency}
  currencies={availableCurrencies}
  dataTestId="chart-currency-filter"
/>
```

**Replaces:** ~8× duplicate Select components (~160 lines → ~60 lines)

#### 3. `LoadingState.tsx`

**Purpose:** Standardized loading state

**Props:**

```typescript
interface LoadingStateProps {
  message?: string // Default: 'Loading...'
  size?: 'sm' | 'md' | 'lg' // Default: 'lg'
}
```

#### 4. `ErrorState.tsx`

**Purpose:** Standardized error display

**Props:**

```typescript
interface ErrorStateProps {
  title?: string // Default: 'Error Loading Data'
  message: string
  onRetry?: () => void
  retryLabel?: string // Default: 'Retry'
}
```

### Shared Hooks Specification

#### 1. `useCurrencySync.ts`

**Purpose:** Synchronize chart currency with master currency

**Signature:**

```typescript
export const useCurrencySync = (
  masterCurrency: string
): [string, (value: string) => void]
```

**Usage:**

```typescript
import { useCurrencySync } from '../shared/hooks'

// Before: 6 lines per chart
const [chartCurrency, setChartCurrency] = useState(masterCurrency)
useEffect(() => {
  setChartCurrency(masterCurrency)
}, [masterCurrency])

// After: 1 line
const [chartCurrency, setChartCurrency] = useCurrencySync(masterCurrency)
```

**Replaces:** ~30 lines across multiple chart components

#### 2. `useKPIIntegration.ts`

**Purpose:** Generic KPI data fetching hook

**Signature:**

```typescript
export function useKPIIntegration<T extends KPIData>(
  context: BusinessAppContextProps,
  fetcher: KPIFetcher<T>,
  initialState: T,
  dependencies: any[] = []
): KPIIntegrationResult<T>

interface KPIIntegrationResult<T> {
  current: T
  previous: T
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```

**Usage:**

```typescript
import { useKPIIntegration } from '../shared/hooks'

// Before: 67-70 lines per hook with duplicated logic

// After: ~20 lines using generic hook
const { current, previous, isLoading, error, refetch } = useKPIIntegration(
  context,
  { fetch: fetchEquityKPIs },
  {
    totalInvestments: 0,
    totalAmountInvested: 0,
    portfolioMoic: 0,
    averageDuration: 0
  },
  [currency]
)
```

**Replaces:** 4× similar hooks (~423 lines → ~150 lines)

### Shared Utilities Specification

#### 1. `currencyUtils.ts`

**Exports:**

```typescript
// Safe currency extraction from various formats
export const safeCurrencyExtraction: (currency: any, defaultCurrency?: string) => string

// Extract available currencies from investments
export const extractAvailableCurrencies: (investments: any[], defaultCurrency?: string) => string[]

// Format currency for display (uses Intl.NumberFormat)
export const formatCurrencyDisplay: (amount: number, currency: string, options?: Intl.NumberFormatOptions) => string
```

**Replaces:** 4× safeCurrencyExtraction implementations (~60 lines → ~80 lines centralized)

#### 2. `dateUtils.ts`

**Exports:**

```typescript
// Format duration in days to readable format
export const formatDuration: (days: number, format?: 'short' | 'long') => string

// Format years to readable duration
export const formatYearsDuration: (years: number) => string

// Calculate investment duration from acquisition date
export const calculateInvestmentDuration: (acquisitionDate: string | Date) => number

// Calculate duration in years
export const calculateDurationYears: (acquisitionDate: string | Date) => number
```

**Replaces:** 2× formatDuration implementations with different formats (~120 lines → ~60 lines)

#### 3. `dataFilters.ts`

**Exports:**

```typescript
// Filter investments by currency code
export const filterInvestmentsByCurrency: <T extends { currencyCode?: string }>(
  investments: T[],
  currencyCode: string,
  defaultCurrency?: string
) => T[]

// Check if data has non-zero values
export const hasNonZeroValues: (data: any[], valueKey: string) => boolean

// Check if data should show empty state
export const shouldShowEmptyState: (data: any[], valueKeys: string[]) => boolean

// Group investments by field and aggregate
export const groupInvestmentsByField: <T>(
  investments: T[],
  getField: (inv: T) => string,
  getAmount: (inv: T) => number
) => Array<{ type: string; count: number; totalAmount: number }>
```

#### 4. `chartUtils.ts` (Moved from equity/shared)

**Exports:**

```typescript
// Chart colors using design system variables
export const CHART_COLORS: string[]

// Custom label renderer for pie charts
export const renderCustomizedLabel: (props: any) => JSX.Element | null

// Chart configuration helper
export const createChartConfig: (data: any[], labelKey?: string) => Record<string, { label: string; color: string }>
```

**Moves:** From `equity-analytics/components/shared/chartUtils.ts` to shared

#### 5. `distributionUtils.ts` (Generalized from equity)

**Exports:**

```typescript
// Compute distribution by field
export const computeDistributionByField: <T>(
  investments: T[],
  currency: string,
  getField: (inv: T) => string
) => DistributionData[]

// Format amounts for display
export const formatAmount: (amount: number) => string

// Calculate investment size ranges (quintiles)
export const calculateInvestmentSizeRanges: <T>(investments: T[], currency: string) => DistributionData[]

// Calculate investment duration ranges
export const calculateInvestmentDurationRanges: <T>(investments: T[]) => DistributionData[]
```

**Moves:** From `equity-analytics/components/shared/distributionUtils.ts` to shared (generalized)

---

## Implementation Phases

### Phase 0: Use Existing Resources (Week 1)

**Priority:** 🔥 Critical  
**Effort:** Low  
**Impact:** High

#### Tasks

1. **Replace currency formatters across analytics-view**

   ```typescript
   // ❌ Remove direct imports
   import { formatCurrency } from '@/common/data/investment'

   // ✅ Use investment-management currency utils
   import { formatCurrencyCompact } from '../../utils/currencyUtils'
   ```

   **Files to update:**
   - All chart components using `formatCurrency`
   - All KPI display components
   - All statistics components

   **Estimated changes:** ~24 files

2. **Document existing resource usage**
   - Create import guide showing correct resource hierarchy
   - Update component documentation with proper imports
   - Add ESLint rule to prevent incorrect imports (optional)

3. **Audit current imports**
   - Verify all files use `@/common/data/investment` utilities
   - Check for any custom formatters that should use common utils
   - Identify any missing utilities in common

#### Success Criteria

- ✅ All currency formatting uses `formatCurrencyCompact`
- ✅ No custom currency formatters in analytics-view
- ✅ Documentation updated with correct imports

#### Files Changed

```
✏️  ~24 chart and KPI component files
📝  1 documentation file (import guide)
```

---

### Phase 1: Create Shared Components (Week 1-2)

**Priority:** 🔥 Critical  
**Effort:** Medium  
**Impact:** High

#### Tasks

1. **Create `shared/components/` directory**

   ```bash
   mkdir -p analytics-view/shared/components
   ```

2. **Implement ChartEmptyState.tsx**
   - Copy best implementation from existing duplicates
   - Add proper TypeScript interfaces
   - Add comprehensive data-testid attributes
   - Support custom icons and heights
   - Test with different messages and configurations

3. **Implement CurrencyFilter.tsx**
   - Extract Select pattern from chart components
   - Add label support (optional)
   - Add loading state support
   - Integrate with design system tokens
   - Test with various currency lists

4. **Implement LoadingState.tsx**
   - Standardize spinner usage
   - Support size variants
   - Add customizable message
   - Use design system Spinner

5. **Implement ErrorState.tsx**
   - Use Alert component from design system
   - Support retry callback
   - Add proper error styling
   - Test error scenarios

6. **Create components/index.ts**
   - Export all components
   - Export TypeScript interfaces
   - Add JSDoc comments

#### Success Criteria

- ✅ All 4 components implemented and tested
- ✅ Comprehensive TypeScript interfaces
- ✅ Design system integration
- ✅ Proper data-testid attributes
- ✅ Zero external dependencies beyond design system

#### Files Created

```
🆕  shared/components/ChartEmptyState.tsx       (~60 lines)
🆕  shared/components/CurrencyFilter.tsx        (~60 lines)
🆕  shared/components/LoadingState.tsx          (~30 lines)
🆕  shared/components/ErrorState.tsx            (~40 lines)
🆕  shared/components/index.ts                  (~15 lines)
```

---

### Phase 2: Create Shared Hooks (Week 2)

**Priority:** 🔥 Critical  
**Effort:** Medium  
**Impact:** Very High

#### Tasks

1. **Create `shared/hooks/` directory**

   ```bash
   mkdir -p analytics-view/shared/hooks
   ```

2. **Implement useCurrencySync.ts**
   - Extract sync pattern from chart components
   - Support initial currency parameter
   - Return tuple: `[currency, setCurrency]`
   - Add comprehensive tests
   - Document usage examples

3. **Implement useKPIIntegration.ts**
   - Analyze all 4 existing KPI hooks
   - Extract common pattern
   - Create generic version with TypeScript generics
   - Support custom dependencies array
   - Handle loading, error, and refetch states
   - Add comprehensive JSDoc

4. **Implement useAnalyticsCurrencyFilter.ts** (Optional)
   - Wrapper around `useReportFilters` for single-currency use case
   - Simplify interface for analytics view
   - Convert multi-select to single-select
   - Maintain compatibility with report-view patterns

5. **Create hooks/index.ts**
   - Export all hooks
   - Export TypeScript interfaces
   - Add usage examples in comments

#### Success Criteria

- ✅ useCurrencySync replaces all manual sync logic
- ✅ useKPIIntegration works with all 4 report types
- ✅ Hooks follow React best practices
- ✅ Comprehensive TypeScript types
- ✅ Zero regressions in existing functionality

#### Files Created

```
🆕  shared/hooks/useCurrencySync.ts                  (~40 lines)
🆕  shared/hooks/useKPIIntegration.ts                (~80 lines)
🆕  shared/hooks/useAnalyticsCurrencyFilter.ts       (~60 lines) [Optional]
🆕  shared/hooks/index.ts                            (~15 lines)
```

---

### Phase 3: Create Shared Utilities (Week 2-3)

**Priority:** High  
**Effort:** Medium  
**Impact:** High

#### Tasks

1. **Create utility submodules**

   ```bash
   mkdir -p analytics-view/shared/utils
   ```

2. **Implement currencyUtils.ts**
   - Move `safeCurrencyExtraction` from 4 files
   - Add `extractAvailableCurrencies` helper
   - Add `formatCurrencyDisplay` wrapper
   - Use `@/common/data/investment` utilities internally
   - Add comprehensive tests

3. **Implement dateUtils.ts**
   - Consolidate 2× `formatDuration` implementations
   - Support both 'short' and 'long' formats
   - Add `formatYearsDuration` variant
   - Add calculation helpers
   - Use dayjs for date operations

4. **Implement dataFilters.ts**
   - Extract currency filtering pattern
   - Add `shouldShowEmptyState` with zero-value check
   - Add `groupInvestmentsByField` helper
   - Make generic with TypeScript

5. **Move chartUtils.ts**
   - Copy from `equity-analytics/components/shared/`
   - Enhance with additional chart types support
   - Add more color options
   - Update CHART_COLORS to use design system tokens

6. **Move and generalize distributionUtils.ts**
   - Copy from `equity-analytics/components/shared/`
   - Remove equity-specific types
   - Make generic with TypeScript generics
   - Test with all investment types

7. **Update shared/utils/index.ts**
   - Export all utility modules
   - Keep existing exports from utils.ts
   - Add deprecation notices for old utils.ts exports

#### Success Criteria

- ✅ All utility modules implemented
- ✅ Zero equity-specific code in generalized utils
- ✅ Proper TypeScript generics usage
- ✅ Comprehensive JSDoc documentation
- ✅ Unit tests for critical functions

#### Files Created/Modified

```
🆕  shared/utils/currencyUtils.ts           (~100 lines)
🆕  shared/utils/dateUtils.ts               (~80 lines)
🆕  shared/utils/dataFilters.ts             (~120 lines)
🔄  shared/utils/chartUtils.ts              (~80 lines, moved & enhanced)
🔄  shared/utils/distributionUtils.ts       (~250 lines, moved & generalized)
✏️  shared/utils/index.ts                   (enhanced exports)
```

---

### Phase 4: Refactor Overview Tab (Week 3)

**Priority:** High  
**Effort:** High  
**Impact:** Very High (validates shared resources)

#### Tasks

1. **Refactor PortfolioAnalyticsCharts.tsx**
   - Remove local ChartEmptyState component
   - Import ChartEmptyState from shared
   - Replace currency Select with CurrencyFilter
   - Use useCurrencySync for state management
   - Use dataFilters utilities
   - Test all charts render correctly

   **Changes:**
   - Remove lines 24-40 (ChartEmptyState)
   - Import from `../shared/components`
   - Replace 2× currency Select components
   - Add useCurrencySync hook

   **Estimated reduction:** ~70 lines

2. **Refactor PortfolioDistributionCharts.tsx**
   - Same changes as PortfolioAnalyticsCharts
   - Update empty state logic
   - Test distribution charts

   **Estimated reduction:** ~70 lines

3. **Refactor PortfolioTimelineCharts.tsx**
   - Same changes as above
   - Update timeline charts

   **Estimated reduction:** ~70 lines

4. **Refactor InvestmentPortfolioOverview.tsx**
   - Remove safeCurrencyExtraction
   - Import from shared/utils/currencyUtils
   - Use formatCurrencyCompact from investment-management/utils
   - Update currency extraction logic

   **Estimated reduction:** ~20 lines

5. **Refactor useInvestmentPortfolioIntegration.ts**
   - Consider using useKPIIntegration (or keep as-is if too different)
   - Use currencyUtils from shared
   - Update imports

6. **Test overview tab thoroughly**
   - Verify all charts render
   - Test currency filtering
   - Test empty states
   - Test loading/error states
   - Verify KPI calculations

#### Success Criteria

- ✅ Overview tab fully refactored
- ✅ All functionality preserved
- ✅ Zero regressions
- ✅ ~210 lines removed from overview
- ✅ All shared resources validated

#### Files Modified

```
✏️  overview/components/PortfolioAnalyticsCharts.tsx      (-70 lines)
✏️  overview/components/PortfolioDistributionCharts.tsx   (-70 lines)
✏️  overview/components/PortfolioTimelineCharts.tsx       (-70 lines)
✏️  overview/InvestmentPortfolioOverview.tsx              (-20 lines)
✏️  overview/hooks/useInvestmentPortfolioIntegration.ts   (-10 lines)
```

---

### Phase 5: Refactor Equity Analytics Tab (Week 4)

**Priority:** High  
**Effort:** High  
**Impact:** High

**Note:** This tab queries the **EquityInvestment** table (and related Investment data), not InvestmentReport tables.

#### Tasks

1. **Move equity-analytics/shared to analytics-view/shared**
   - Assess what's already in shared (chartUtils, distributionUtils)
   - Remove equity-specific components that were moved
   - Update import paths in equity components

2. **Refactor EquityAnalyticsCharts.tsx**
   - Use shared CurrencyFilter
   - Use shared useCurrencySync
   - Use shared ChartEmptyState (if needed)
   - Update imports from shared

3. **Refactor EquityDistributionCharts.tsx**
   - Same as above
   - Use shared distributionUtils
   - Test distribution calculations

4. **Refactor EquityTimelineCharts.tsx**
   - Same as above
   - Test timeline rendering

5. **Refactor EquityInvestmentsReport.tsx**
   - Remove safeCurrencyExtraction
   - Remove local formatDuration
   - Import from shared/utils
   - Use shared dateUtils

6. **Refactor useEquityKPIIntegration.ts**
   - Use generic useKPIIntegration
   - Keep equity-specific types
   - Simplify to ~20 lines

   **Before:** 67 lines  
   **After:** ~20 lines using generic hook

7. **Test equity tab thoroughly**
   - Verify all charts
   - Test size/duration distributions
   - Test KPIs
   - Verify currency filtering

#### Success Criteria

- ✅ Equity tab fully refactored
- ✅ equity/shared/ removed (moved to analytics-view/shared)
- ✅ useEquityKPIIntegration uses generic hook
- ✅ ~100 lines removed
- ✅ All functionality preserved

#### Files Modified

```
✏️  equity-analytics/components/EquityAnalyticsCharts.tsx
✏️  equity-analytics/components/EquityDistributionCharts.tsx
✏️  equity-analytics/components/EquityTimelineCharts.tsx
✏️  equity-analytics/EquityInvestmentsReport.tsx              (-30 lines)
✏️  equity-analytics/hooks/useEquityKPIIntegration.ts         (-47 lines)
🗑️  equity-analytics/components/shared/                       (moved to analytics-view/shared)
```

---

### Phase 6: Refactor Liquid Fund Tab (Week 4)

**Priority:** High  
**Effort:** Medium  
**Impact:** Medium

#### Tasks

1. **Refactor LiquidFundAnalyticsCharts.tsx**
   - Use shared components and hooks
   - Update currency filtering

2. **Refactor LiquidFundDistributionCharts.tsx**
   - Use shared components and hooks

3. **Refactor LiquidFundTimelineCharts.tsx**
   - Use shared components and hooks

4. **Refactor LiquidFundKPICards.tsx**
   - Use shared utilities

5. **Refactor LiquidFundInvestmentsReport.tsx**
   - Remove safeCurrencyExtraction
   - Import from shared

6. **Refactor useLiquidFundKPIIntegration.ts**
   - Use generic useKPIIntegration
   - Reduce from 70 lines to ~20 lines

7. **Test liquid fund tab**

#### Success Criteria

- ✅ Liquid fund tab fully refactored
- ✅ ~80 lines removed
- ✅ All functionality preserved

#### Files Modified

```
✏️  liquid-fund-analytics/components/LiquidFundAnalyticsCharts.tsx
✏️  liquid-fund-analytics/components/LiquidFundDistributionCharts.tsx
✏️  liquid-fund-analytics/components/LiquidFundTimelineCharts.tsx
✏️  liquid-fund-analytics/components/LiquidFundKPICards.tsx
✏️  liquid-fund-analytics/LiquidFundInvestmentsReport.tsx                 (-15 lines)
✏️  liquid-fund-analytics/hooks/useLiquidFundKPIIntegration.ts            (-50 lines)
```

---

### Phase 7: Refactor Real Estate Tab (Week 5)

**Priority:** High  
**Effort:** Medium  
**Impact:** Medium

#### Tasks

1. **Refactor RealEstateAnalyticsCharts.tsx**
   - Use shared components and hooks

2. **Refactor RealEstateDistributionCharts.tsx**
   - Use shared components and hooks

3. **Refactor RealEstateTimelineCharts.tsx**
   - Use shared components and hooks

4. **Refactor RealEstateKPICards.tsx**
   - Use shared utilities

5. **Refactor RealEstateInvestmentsReport.tsx**
   - Remove safeCurrencyExtraction
   - Import from shared

6. **Refactor useRealEstateKPIIntegration.ts**
   - Use generic useKPIIntegration
   - Reduce from 70 lines to ~20 lines

7. **Test real estate tab**

#### Success Criteria

- ✅ Real estate tab fully refactored
- ✅ ~80 lines removed
- ✅ All functionality preserved

#### Files Modified

```
✏️  real-estate-analytics/components/RealEstateAnalyticsCharts.tsx
✏️  real-estate-analytics/components/RealEstateDistributionCharts.tsx
✏️  real-estate-analytics/components/RealEstateTimelineCharts.tsx
✏️  real-estate-analytics/components/RealEstateKPICards.tsx
✏️  real-estate-analytics/RealEstateInvestmentsReport.tsx                 (-15 lines)
✏️  real-estate-analytics/hooks/useRealEstateKPIIntegration.ts            (-50 lines)
```

---

### Phase 8: Testing & Documentation (Week 5)

**Priority:** Critical  
**Effort:** Medium  
**Impact:** Very High

#### Tasks

1. **Comprehensive testing**
   - Test all 4 tabs (overview, equity, liquid fund, real estate)
   - Test currency filtering in all charts
   - Test empty states with various data scenarios
   - Test loading and error states
   - Test KPI calculations and comparisons
   - Test responsive behavior
   - Test accessibility (keyboard navigation, screen readers)

2. **Performance testing**
   - Verify no performance regressions
   - Check for unnecessary re-renders
   - Optimize if needed

3. **Update documentation**
   - Document shared components usage
   - Document shared hooks usage
   - Document shared utilities usage
   - Create migration guide for future components
   - Update main README

4. **Code review and cleanup**
   - Remove unused imports
   - Remove console.logs
   - Fix linter warnings
   - Verify TypeScript strictness
   - Check for TODOs

5. **Update tests**
   - Update component tests for new imports
   - Add tests for shared components
   - Add tests for shared hooks
   - Add tests for shared utilities

#### Success Criteria

- ✅ All tabs working perfectly
- ✅ Zero regressions found
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Code review approved

---

## Migration Guide

### For Developers Adding New Charts

#### 1. Import Shared Components

```typescript
// ✅ Correct
import { ChartEmptyState, CurrencyFilter, LoadingState, ErrorState } from '../shared/components'

// ❌ Wrong - Don't create local components
const ChartEmptyState = () => {
  /* ... */
}
```

#### 2. Use Currency Synchronization Hook

```typescript
// ✅ Correct
import { useCurrencySync } from '../shared/hooks'

const [chartCurrency, setChartCurrency] = useCurrencySync(masterCurrency)

// ❌ Wrong - Don't manually sync
const [chartCurrency, setChartCurrency] = useState(masterCurrency)
useEffect(() => {
  setChartCurrency(masterCurrency)
}, [masterCurrency])
```

#### 3. Use Shared Utilities

```typescript
// ✅ Correct - Currency utilities
import { safeCurrencyExtraction, extractAvailableCurrencies } from '../shared/utils/currencyUtils'
import { formatCurrencyCompact } from '../../../utils/currencyUtils'

// ✅ Correct - Data filtering
import { filterInvestmentsByCurrency, shouldShowEmptyState } from '../shared/utils/dataFilters'

// ✅ Correct - Date utilities
import { formatDuration, calculateDurationYears } from '../shared/utils/dateUtils'

// ✅ Correct - Chart utilities
import { CHART_COLORS, renderCustomizedLabel, createChartConfig } from '../shared/utils/chartUtils'

// ❌ Wrong - Don't create local utilities
const formatDuration = days => {
  /* ... */
}
```

#### 4. Implement Empty State Logic

```typescript
// ✅ Correct
import { shouldShowEmptyState } from '../shared/utils/dataFilters'
import { ChartEmptyState } from '../shared/components'

{shouldShowEmptyState(filteredData, ['totalAmount', 'totalValue']) ? (
  <ChartEmptyState message="No investment amounts recorded for this currency" />
) : (
  <ChartContainer config={chartConfig}>
    {/* Chart content */}
  </ChartContainer>
)}

// ❌ Wrong - Manual checks
{filteredData.length === 0 ? (
  <div>No data</div>
) : (
  /* ... */
)}
```

#### 5. Create KPI Integration Hooks

```typescript
// ✅ Correct - Use generic hook
import { useKPIIntegration } from '../shared/hooks'
import { useGetMyKPIs } from '../queries/MyKPIQueries'

export const useMyKPIIntegration = (context: BusinessAppContextProps) => {
  const { fetchMyKPIs } = useGetMyKPIs(context)

  return useKPIIntegration(
    context,
    { fetch: fetchMyKPIs },
    {
      totalInvestments: 0,
      totalAmount: 0
      // ... your KPI fields
    }
  )
}

// ❌ Wrong - Copy-paste from other hooks
export const useMyKPIIntegration = (context: BusinessAppContextProps) => {
  const [current, setCurrent] = useState({
    /* ... */
  })
  const [previous, setPrevious] = useState({
    /* ... */
  })
  const [isLoading, setIsLoading] = useState(true)
  // ... 60 more lines of duplicated logic
}
```

### For Developers Refactoring Existing Charts

#### Step-by-Step Process

1. **Identify duplicated code**
   - Look for local ChartEmptyState components
   - Look for currency Select components
   - Look for manual currency synchronization
   - Look for custom utilities (formatDuration, etc.)

2. **Replace with shared resources**
   - Import from `../shared/components`
   - Import from `../shared/hooks`
   - Import from `../shared/utils`

3. **Test thoroughly**
   - Verify chart renders correctly
   - Test currency filtering
   - Test empty states
   - Test loading/error states

4. **Remove unused code**
   - Delete local component definitions
   - Remove unused imports
   - Clean up console.logs

5. **Update data-testid attributes**
   - Ensure test IDs remain consistent
   - Update component tests if needed

### Common Patterns

#### Pattern 1: Chart with Currency Filter

```typescript
import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { ChartContainer } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'

// ✅ Import shared resources
import { CurrencyFilter, ChartEmptyState } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { filterInvestmentsByCurrency, shouldShowEmptyState } from '../../shared/utils/dataFilters'
import { CHART_COLORS, createChartConfig } from '../../shared/utils/chartUtils'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'

interface MyChartProps {
  rawInvestments: any[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const MyChart: React.FC<MyChartProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // ✅ Use currency sync hook
  const [chartCurrency, setChartCurrency] = useCurrencySync(masterCurrency)

  // ✅ Filter data by currency
  const filteredData = useMemo(() => {
    return filterInvestmentsByCurrency(rawInvestments, chartCurrency)
      .reduce((acc, inv) => {
        // Your aggregation logic
        return acc
      }, [] as any[])
  }, [rawInvestments, chartCurrency])

  // ✅ Create chart config
  const chartConfig = useMemo(() => {
    return createChartConfig(filteredData, 'name')
  }, [filteredData])

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>My Chart</CardTitle>
          {/* ✅ Use shared currency filter */}
          <CurrencyFilter
            value={chartCurrency}
            onChange={setChartCurrency}
            currencies={availableCurrencies}
            dataTestId="my-chart-currency-filter"
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* ✅ Use shared empty state check */}
        {shouldShowEmptyState(filteredData, ['totalAmount']) ? (
          <ChartEmptyState message="No data for this currency" />
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[400px]">
            <BarChart data={filteredData}>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => formatCurrencyCompact(value, chartCurrency)} />
              <Bar dataKey="totalAmount" fill={CHART_COLORS[0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

#### Pattern 2: KPI Integration Hook

```typescript
import { useKPIIntegration } from '../../shared/hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetMyKPIs, MyKPIData } from '../queries/MyKPIQueries'

export interface MyKPIIntegration {
  current: MyKPIData
  previous: MyKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useMyKPIIntegration = (context: BusinessAppContextProps, currency?: string): MyKPIIntegration => {
  const { fetchMyKPIs } = useGetMyKPIs(context, currency)

  // ✅ Use generic hook - reduces from 70 lines to 20 lines
  return useKPIIntegration(
    context,
    { fetch: fetchMyKPIs },
    {
      totalInvestments: 0,
      totalAmountInvested: 0,
      totalMarketValue: 0,
      averageValue: 0
    },
    [currency] // Dependencies for refetching
  )
}
```

#### Pattern 3: Main Report Component

```typescript
import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@newwork/nw-design-system'
import { WidgetGroup } from '@/components/widget-group'

// ✅ Import shared utilities
import { safeCurrencyExtraction, extractAvailableCurrencies } from '../shared/utils/currencyUtils'
import { calculateChange } from '../shared/utils'
import { LoadingState, ErrorState, CurrencyFilter } from '../shared/components'

// ✅ Import hooks
import { useMyKPIIntegration } from './hooks/useMyKPIIntegration'
import { useInvestmentDataIntegration } from '@/common/data/investment'

export const MyReport: React.FC<BusinessAppContextProps> = (props) => {
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Fetch data
  const { investments, isLoading, error, refetch } = useInvestmentDataIntegration(props)
  const { current: kpis, previous: previousKpis } = useMyKPIIntegration(props, selectedCurrency)

  // ✅ Use shared utility
  const availableCurrencies = useMemo(() => {
    return extractAvailableCurrencies(investments)
  }, [investments])

  // ✅ Use shared loading/error components
  if (isLoading) return <LoadingState message="Loading investments..." />
  if (error) return <ErrorState message={error} onRetry={refetch} />

  return (
    <div>
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
        <h1>My Investment Report</h1>
        {/* ✅ Use shared currency filter */}
        <CurrencyFilter
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          currencies={availableCurrencies}
          showLabel
        />
      </div>

      {/* KPIs */}
      <WidgetGroup widgets={/* ... */} />

      {/* Charts */}
      <Tabs>
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics">
          <MyAnalyticsCharts
            rawInvestments={investments}
            masterCurrency={selectedCurrency}
            availableCurrencies={availableCurrencies}
          />
        </TabsContent>
        {/* ... */}
      </Tabs>
    </div>
  )
}
```

---

## Testing Strategy

### Unit Tests

#### Shared Components

```typescript
// shared/components/__tests__/ChartEmptyState.test.tsx
describe('ChartEmptyState', () => {
  it('renders default message', () => {})
  it('renders custom message', () => {})
  it('renders custom icon', () => {})
  it('shows currency hint by default', () => {})
  it('hides currency hint when disabled', () => {})
  it('applies custom height', () => {})
})

// shared/components/__tests__/CurrencyFilter.test.tsx
describe('CurrencyFilter', () => {
  it('renders currency select', () => {})
  it('calls onChange when currency selected', () => {})
  it('displays available currencies', () => {})
  it('shows label when enabled', () => {})
  it('hides label by default', () => {})
})
```

#### Shared Hooks

```typescript
// shared/hooks/__tests__/useCurrencySync.test.ts
describe('useCurrencySync', () => {
  it('initializes with master currency', () => {})
  it('syncs when master currency changes', () => {})
  it('allows manual override', () => {})
  it('re-syncs after manual change when master changes', () => {})
})

// shared/hooks/__tests__/useKPIIntegration.test.ts
describe('useKPIIntegration', () => {
  it('fetches data on mount', () => {})
  it('sets loading state correctly', () => {})
  it('handles errors gracefully', () => {})
  it('refetches when dependencies change', () => {})
  it('supports refetch callback', () => {})
})
```

#### Shared Utilities

```typescript
// shared/utils/__tests__/currencyUtils.test.ts
describe('currencyUtils', () => {
  describe('safeCurrencyExtraction', () => {
    it('extracts from API format', () => {})
    it('extracts from catalog object', () => {})
    it('returns default for null', () => {})
    it('handles string codes', () => {})
  })

  describe('extractAvailableCurrencies', () => {
    it('extracts unique currencies', () => {})
    it('sorts currencies', () => {})
    it('handles empty array', () => {})
  })
})

// shared/utils/__tests__/dataFilters.test.ts
describe('dataFilters', () => {
  describe('filterInvestmentsByCurrency', () => {
    it('filters by currency code', () => {})
    it('uses default currency for null', () => {})
  })

  describe('shouldShowEmptyState', () => {
    it('returns true for empty array', () => {})
    it('returns true when all values zero', () => {})
    it('returns false when any value non-zero', () => {})
  })
})
```

### Integration Tests

#### Chart Components

```typescript
describe('MyChart Integration', () => {
  it('renders chart with data', () => {})
  it('filters data by selected currency', () => {})
  it('syncs with master currency', () => {})
  it('shows empty state when no data', () => {})
  it('shows empty state when all values zero', () => {})
  it('formats currency correctly', () => {})
})
```

#### Report Components

```typescript
describe('MyReport Integration', () => {
  it('loads and displays data', () => {})
  it('shows loading state', () => {})
  it('shows error state', () => {})
  it('filters by currency', () => {})
  it('calculates KPIs correctly', () => {})
  it('supports refetch', () => {})
})
```

### E2E Tests

```typescript
describe('Analytics View E2E', () => {
  it('navigates between tabs', () => {})
  it('filters by currency across all charts', () => {})
  it('handles empty states correctly', () => {})
  it('displays KPIs correctly', () => {})
  it('synchronizes currency across charts', () => {})
})
```

---

## Success Metrics

### Code Quality Metrics

| Metric                | Before       | Target     | Measurement           |
| --------------------- | ------------ | ---------- | --------------------- |
| **Duplicated Code**   | ~1,023 lines | <250 lines | LOC analysis          |
| **Code Reduction**    | Baseline     | 75%+       | Line count comparison |
| **Shared Components** | 0            | 4+         | Component count       |
| **Shared Hooks**      | 0            | 2+         | Hook count            |
| **Shared Utilities**  | 2 files      | 7+ files   | File count            |
| **Test Coverage**     | Unknown      | 80%+       | Jest coverage         |

### Development Metrics

| Metric                | Before   | Target  | Measurement      |
| --------------------- | -------- | ------- | ---------------- |
| **Time to Add Chart** | ~2 hours | <30 min | Developer survey |
| **Bugs per Release**  | Baseline | -50%    | Bug tracking     |
| **Code Review Time**  | Baseline | -40%    | Review duration  |

### User Experience Metrics

| Metric               | Requirement    | Measurement       |
| -------------------- | -------------- | ----------------- |
| **Zero Regressions** | ✅ Required    | QA testing        |
| **Performance**      | No degradation | Lighthouse scores |
| **Accessibility**    | Maintained     | WCAG audit        |

### Completion Criteria

- ✅ All 4 tabs refactored
- ✅ All shared resources created and documented
- ✅ Zero code duplication for common patterns
- ✅ All tests passing (unit + integration + E2E)
- ✅ Documentation complete
- ✅ Code review approved
- ✅ QA sign-off
- ✅ 75%+ code reduction achieved

---

## Risk Mitigation

### Identified Risks

1. **Breaking Changes**
   - **Risk:** Refactoring breaks existing functionality
   - **Mitigation:** Comprehensive testing, gradual rollout, feature flags

2. **Performance Regression**
   - **Risk:** Shared hooks cause unnecessary re-renders
   - **Mitigation:** React profiler analysis, memoization, benchmark tests

3. **Type Safety Issues**
   - **Risk:** Generic types too complex or break inference
   - **Mitigation:** Comprehensive TypeScript tests, strict mode, type guards

4. **Import Path Confusion**
   - **Risk:** Developers import from wrong location
   - **Mitigation:** Clear documentation, ESLint rules, code review

5. **Incomplete Migration**
   - **Risk:** Some duplicates remain
   - **Mitigation:** Code audit, grep searches, linter warnings

### Rollback Plan

If critical issues arise:

1. **Git Revert:** Each phase is a separate commit/PR
2. **Feature Flag:** Can disable refactored tabs
3. **Gradual Rollout:** Deploy one tab at a time
4. **Monitoring:** Track errors and performance metrics

---

## Appendix

### Related Documentation

- [Currency Filtering Implementation (Overview Tab)](./overview/README.md)
- [Shared Types Documentation](./shared/types.ts)
- [Investment Data Module](../../../../../common/data/investment/README.md)
- [Report View Filtering](../report-view/components/shared/README.md)

### Key Contacts

- **Tech Lead:** [Name]
- **QA Lead:** [Name]
- **Product Owner:** [Name]

### Change Log

| Date       | Phase    | Status      | Notes                  |
| ---------- | -------- | ----------- | ---------------------- |
| 2025-10-16 | Planning | ✅ Complete | Documentation created  |
| TBD        | Phase 0  | Pending     | Use existing resources |
| TBD        | Phase 1  | Pending     | Shared components      |
| TBD        | Phase 2  | Pending     | Shared hooks           |
| TBD        | Phase 3  | Pending     | Shared utilities       |
| TBD        | Phase 4  | Pending     | Refactor overview      |
| TBD        | Phase 5  | Pending     | Refactor equity        |
| TBD        | Phase 6  | Pending     | Refactor liquid fund   |
| TBD        | Phase 7  | Pending     | Refactor real estate   |
| TBD        | Phase 8  | Pending     | Testing & docs         |

---

**End of Refactoring Plan**
