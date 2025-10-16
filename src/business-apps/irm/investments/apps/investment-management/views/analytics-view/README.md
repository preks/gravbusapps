# Analytics View - Investment Management

**Comprehensive analytics and reporting interface for investment portfolio management**

---

## 📚 Documentation Index

This directory contains comprehensive documentation for the analytics-view refactoring project:

1. **[REFACTOR_PLAN.md](./REFACTOR_PLAN.md)** - Complete refactoring strategy
   - Problem statement and goals
   - Current state analysis
   - Existing IRM resources inventory
   - Proposed architecture
   - 8-phase implementation plan
   - Migration guide for developers
   - Testing strategy
   - Success metrics

2. **[RESOURCE_HIERARCHY.md](./RESOURCE_HIERARCHY.md)** - Import guide and best practices
   - Resource hierarchy (4 levels)
   - Import decision tree
   - Quick reference tables
   - Anti-patterns to avoid
   - Migration checklist

3. **[IMPLEMENTATION_TRACKER.md](./IMPLEMENTATION_TRACKER.md)** - Progress tracking
   - Phase-by-phase progress
   - File-by-file change tracking
   - Completion criteria per phase
   - Testing checklist
   - Sign-off requirements

---

## 🎯 Quick Start

### For Developers Adding New Features

**Before writing any code:**

1. Read [RESOURCE_HIERARCHY.md](./RESOURCE_HIERARCHY.md) for import guidelines
2. Check existing shared resources in `shared/` directory
3. Follow the patterns in existing components

**Key principle:** Don't duplicate what already exists!

### For Developers Refactoring Existing Code

1. Read [REFACTOR_PLAN.md](./REFACTOR_PLAN.md) - Section: Migration Guide
2. Check [IMPLEMENTATION_TRACKER.md](./IMPLEMENTATION_TRACKER.md) for current progress
3. Follow the refactoring patterns documented

---

## 📁 Directory Structure

```
analytics-view/
├── README.md                          # This file
├── REFACTOR_PLAN.md                   # Complete refactoring strategy
├── RESOURCE_HIERARCHY.md              # Import guidelines
├── IMPLEMENTATION_TRACKER.md          # Progress tracking
│
├── shared/                            # 🎯 Shared resources for all tabs
│   ├── components/                    # Reusable UI components
│   │   ├── ChartEmptyState.tsx       # Empty state for charts
│   │   ├── CurrencyFilter.tsx        # Currency dropdown
│   │   ├── LoadingState.tsx          # Loading spinner
│   │   ├── ErrorState.tsx            # Error display
│   │   └── index.ts
│   │
│   ├── hooks/                         # Reusable hooks
│   │   ├── useCurrencySync.ts        # Currency synchronization
│   │   ├── useKPIIntegration.ts      # Generic KPI fetching
│   │   └── index.ts
│   │
│   ├── utils/                         # Utility functions
│   │   ├── currencyUtils.ts          # Currency helpers
│   │   ├── dateUtils.ts              # Date/duration helpers
│   │   ├── dataFilters.ts            # Data filtering
│   │   ├── chartUtils.ts             # Chart configuration
│   │   ├── distributionUtils.ts      # Distribution calculations
│   │   └── index.ts
│   │
│   ├── types.ts                       # Shared TypeScript types
│   └── utils.ts                       # Legacy utils (color helpers)
│
├── overview/                          # Portfolio overview tab
│   ├── components/
│   │   ├── PortfolioAnalyticsCharts.tsx
│   │   ├── PortfolioDistributionCharts.tsx
│   │   └── PortfolioTimelineCharts.tsx
│   ├── hooks/
│   │   └── useInvestmentPortfolioIntegration.ts
│   ├── queries/
│   │   └── PortfolioKPIQueries.ts
│   └── InvestmentPortfolioOverview.tsx
│
├── equity-analytics/                  # Equity analytics (queries EquityInvestment)
│   ├── components/
│   │   ├── EquityAnalyticsCharts.tsx
│   │   ├── EquityDistributionCharts.tsx
│   │   └── EquityTimelineCharts.tsx
│   ├── hooks/
│   │   └── useEquityKPIIntegration.ts
│   ├── queries/
│   │   └── EquityKPIQueries.ts
│   └── EquityInvestmentsReport.tsx
│
├── liquid-fund-analytics/             # Liquid fund analytics (queries LiquidFundInvestment)
│   ├── components/
│   │   ├── LiquidFundAnalyticsCharts.tsx
│   │   ├── LiquidFundDistributionCharts.tsx
│   │   └── LiquidFundTimelineCharts.tsx
│   ├── hooks/
│   │   └── useLiquidFundKPIIntegration.ts
│   └── LiquidFundInvestmentsReport.tsx
│
├── real-estate-analytics/             # Real estate analytics (queries RealEstateInvestment)
│   ├── components/
│   │   ├── RealEstateAnalyticsCharts.tsx
│   │   ├── RealEstateDistributionCharts.tsx
│   │   └── RealEstateTimelineCharts.tsx
│   ├── hooks/
│   │   └── useRealEstateKPIIntegration.ts
│   └── RealEstateInvestmentsReport.tsx
│
├── AnalyticsView.tsx                  # Main analytics view component
└── index.ts                           # Module exports
```

---

## 🚀 Common Patterns

### Pattern 1: Creating a New Chart Component

```typescript
import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { ChartContainer } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'

// ✅ Import shared resources
import { CurrencyFilter, ChartEmptyState } from '../shared/components'
import { useCurrencySync } from '../shared/hooks'
import { filterInvestmentsByCurrency, shouldShowEmptyState } from '../shared/utils/dataFilters'
import { CHART_COLORS, createChartConfig } from '../shared/utils/chartUtils'
import { formatCurrencyCompact } from '../../utils/currencyUtils'

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
  // Use currency sync hook
  const [chartCurrency, setChartCurrency] = useCurrencySync(masterCurrency)

  // Filter and process data
  const chartData = useMemo(() => {
    return filterInvestmentsByCurrency(rawInvestments, chartCurrency)
      .map(inv => ({
        name: inv.name,
        amount: inv.totalAmount
      }))
  }, [rawInvestments, chartCurrency])

  const chartConfig = useMemo(() => {
    return createChartConfig(chartData)
  }, [chartData])

  return (
    <Card>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle>My Chart</CardTitle>
          <CurrencyFilter
            value={chartCurrency}
            onChange={setChartCurrency}
            currencies={availableCurrencies}
          />
        </div>
      </CardHeader>
      <CardContent>
        {shouldShowEmptyState(chartData, ['amount']) ? (
          <ChartEmptyState />
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[400px]">
            <BarChart data={chartData}>
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(v) => formatCurrencyCompact(v, chartCurrency)} />
              <Bar dataKey="amount" fill={CHART_COLORS[0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
```

### Pattern 2: Creating a KPI Hook

```typescript
import { useKPIIntegration } from '../shared/hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetMyKPIs } from '../queries/MyKPIQueries'

export const useMyKPIIntegration = (context: BusinessAppContextProps) => {
  const { fetchMyKPIs } = useGetMyKPIs(context)

  return useKPIIntegration(
    context,
    { fetch: fetchMyKPIs },
    {
      totalInvestments: 0,
      totalAmount: 0,
      averageValue: 0
    }
  )
}
```

### Pattern 3: Main Report Component

```typescript
import React, { useState, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LoadingState, ErrorState, CurrencyFilter } from '../shared/components'
import { extractAvailableCurrencies } from '../shared/utils/currencyUtils'
import { useInvestmentDataIntegration } from '@/common/data/investment'
import { useMyKPIIntegration } from './hooks/useMyKPIIntegration'

export const MyReport: React.FC<BusinessAppContextProps> = (props) => {
  const [selectedCurrency, setSelectedCurrency] = useState('EUR')

  const { investments, isLoading, error } = useInvestmentDataIntegration(props)
  const { current: kpis } = useMyKPIIntegration(props)

  const availableCurrencies = useMemo(() => {
    return extractAvailableCurrencies(investments)
  }, [investments])

  if (isLoading) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="gba:flex gba:justify-between gba:mb-4">
        <h1>My Report</h1>
        <CurrencyFilter
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          currencies={availableCurrencies}
          showLabel
        />
      </div>
      {/* KPIs and charts */}
    </div>
  )
}
```

---

## 🛠️ Development Guidelines

### Import Hierarchy (Quick Reference)

1. **Level 1:** `@/common/data/investment` - Project-wide utilities
2. **Level 2:** `../../utils/currencyUtils` - Investment management utils
3. **Level 3:** `../shared/` - Analytics-view shared resources
4. **Level 4:** Tab-specific code

### Key Rules

✅ **DO:**

- Use shared components from `../shared/components`
- Use shared hooks from `../shared/hooks`
- Use shared utilities from `../shared/utils`
- Import currency formatter from `../../utils/currencyUtils`
- Follow existing patterns

❌ **DON'T:**

- Create local empty state components
- Create local currency filter components
- Duplicate KPI hook logic
- Write manual currency synchronization
- Import from sibling tabs

---

## 📊 Current Status

**Phase:** Planning Complete  
**Implementation:** Not Started  
**Documentation:** ✅ Complete

See [IMPLEMENTATION_TRACKER.md](./IMPLEMENTATION_TRACKER.md) for detailed progress.

---

## 🎯 Goals & Metrics

### Primary Goals

1. **Reduce code duplication** by 75%+ (~1,023 lines → <250 lines)
2. **Improve maintainability** with single source of truth
3. **Standardize patterns** across all analytics reports
4. **Enable faster development** of new analytics features

### Success Metrics

- ✅ Zero duplicate utility functions across tabs
- ✅ Consistent UI/UX for currency filtering
- ✅ Standardized empty/loading/error states
- ✅ All tabs use centralized chart utilities
- ✅ KPI hooks follow generic pattern
- ✅ 80%+ test coverage for shared code

---

## 🤝 Contributing

### Adding New Features

1. **Check existing resources** in `shared/` first
2. **Follow import hierarchy** from RESOURCE_HIERARCHY.md
3. **Use shared components** - don't create new ones
4. **Write tests** for new functionality
5. **Update documentation** if adding to shared/

### Refactoring Existing Code

1. **Read the refactor plan** - REFACTOR_PLAN.md
2. **Check implementation tracker** - IMPLEMENTATION_TRACKER.md
3. **Follow migration patterns** documented in guides
4. **Test thoroughly** after refactoring
5. **Update tracker** with completed tasks

### Code Review Checklist

- [ ] Uses shared components where applicable
- [ ] Follows import hierarchy
- [ ] No duplicate utility functions
- [ ] Proper TypeScript types
- [ ] Comprehensive data-testid attributes
- [ ] Tests written and passing
- [ ] Documentation updated

---

## 📞 Support

### Questions?

- **Architecture questions:** See [REFACTOR_PLAN.md](./REFACTOR_PLAN.md)
- **Import questions:** See [RESOURCE_HIERARCHY.md](./RESOURCE_HIERARCHY.md)
- **Implementation questions:** See [IMPLEMENTATION_TRACKER.md](./IMPLEMENTATION_TRACKER.md)

### Key Contacts

- **Tech Lead:** [Name]
- **IRM Team:** [Team Channel]
- **Documentation:** This directory

---

## 📝 Change Log

| Date       | Change                                          | Author   |
| ---------- | ----------------------------------------------- | -------- |
| 2025-10-16 | Created comprehensive refactoring documentation | AI Agent |
| 2025-10-16 | Implemented currency filtering in overview tab  | Team     |

---

**Last Updated:** October 16, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation
