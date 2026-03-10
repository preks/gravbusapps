import React, { useState, useCallback, useMemo } from 'react'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DataDisplay } from '@newwork/nw-design-system'
import type { ColumnDef, CellContext } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import { buildCurrencyFilter } from '../../../investment-view/utils/filterHandlers'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { usePlannedExitsSectionState } from './hooks/usePlannedExitsData'
import { usePlannedExitsMetrics } from './hooks/usePlannedExitsMetrics'
import PlannedExitsMetrics from './components/PlannedExitsMetrics'
import GenericInvestmentsList, {
  type InvestmentListConfig
} from '../../../investment-view/data/shared/GenericInvestmentsList'
import {
  MarketValueCell,
  PerformanceCell,
  PlannedExitDateCell
} from '../../../investment-view/data/equity-data/EquityCellRenderers'
import { plannedExitsFilterConfig } from './plannedExitsFilterConfig'
import { CurrencyFilter } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/components/CurrencyFilter'

const PLANNED_EXITS_BASE_WHERE_PARTS = ['planedExit: { _eq: true }']

function buildRangeCondition(value: { min?: number; max?: number }): Record<string, number> | null {
  const condition: Record<string, number> = {}
  if (value.min !== undefined) condition._gte = value.min
  if (value.max !== undefined) condition._lte = value.max
  return Object.keys(condition).length > 0 ? condition : null
}

function applyDateRangeFilter(result: Record<string, any>, value: any): void {
  if (!value) return
  const normalized = normalizeDateRange(value)
  if (normalized?.from) result.plannedExitDateFrom = normalized.from
  if (normalized?.to) result.plannedExitDateTo = normalized.to
}

function applyAmountRangeFilter(
  conditions: Record<string, any>[],
  field: string,
  value: { min?: number; max?: number } | undefined
): void {
  if (!value) return
  const cond = buildRangeCondition(value)
  if (cond) conditions.push({ [field]: cond })
}

function normalizePlannedExitFilters(rawFilters: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  const extraConditions: Record<string, any>[] = []

  for (const [key, value] of Object.entries(rawFilters)) {
    if (key === 'plannedExitDateRange') {
      applyDateRangeFilter(result, value)
    } else if (key === 'totalInvestmentAmountRange') {
      applyAmountRangeFilter(extraConditions, 'totalInvestmentAmount', value)
    } else if (key === 'investmentMarketValueRange') {
      applyAmountRangeFilter(extraConditions, 'investmentMarketValue', value)
    } else if (value !== null && value !== undefined) {
      result[key] = value
    }
  }

  if (extraConditions.length > 0) result.customConditions = extraConditions
  return result
}

const GROUP_LABEL_MAP: Record<string, string> = {
  RealEstate: 'Real Estate',
  LiquidFund: 'Liquid Fund',
  LiquidFunds: 'Liquid Fund'
}

function formatGroupValue(value: string): string {
  return (
    GROUP_LABEL_MAP[value] ??
    value
      .split(/(?=[A-Z])/)
      .join(' ')
      .trim()
  )
}

const InvestmentGroupCell = ({ row }: CellContext<Investment, unknown>) => {
  const groupValue = row.original.investmentGroup?.value || 'Unknown'
  const formatted = formatGroupValue(groupValue)

  return (
    <span className="gba:text-sm gba:truncate gba:block" title={formatted}>
      {formatted}
    </span>
  )
}

const PLANNED_EXIT_EXTRA_COLUMNS: ColumnDef<Investment>[] = [
  {
    id: 'investmentGroup',
    header: 'Group',
    accessorKey: 'investmentGroup.value',
    cell: InvestmentGroupCell
  },
  {
    id: 'investmentMarketValue',
    header: 'Market Value',
    accessorKey: 'investmentMarketValue',
    cell: MarketValueCell,
    meta: { align: 'right' }
  },
  {
    id: 'performance',
    header: 'Performance',
    enableSorting: false,
    cell: PerformanceCell,
    meta: { align: 'right' }
  },
  {
    id: 'plannedExitDate',
    header: 'Planned Exit Date',
    accessorKey: 'plannedExitDate',
    size: 200,
    minSize: 180,
    maxSize: 250,
    enableResizing: false,
    meta: { type: 'date' as const },
    cell: PlannedExitDateCell
  }
]

const PLANNED_EXIT_CONFIG: InvestmentListConfig = {
  investmentGroup: 'PLANNED_EXIT',
  dataTestIdPrefix: 'planned-exit-investment',
  defaultTypeLabel: 'Investment',
  fromSubView: 'planned-exits',
  extraColumns: PLANNED_EXIT_EXTRA_COLUMNS,
  insertExtraColumnsAfter: 'afterAmount',
  emptyMessage: 'No planned exits found'
}

const COLUMN_CONFIG = [
  { id: 'name', label: 'Investment' },
  { id: 'investmentType', label: 'Type' },
  { id: 'totalInvestmentAmount', label: 'Total Investment' },
  { id: 'investmentGroup', label: 'Group' },
  { id: 'investmentMarketValue', label: 'Market Value' },
  { id: 'performance', label: 'Performance' },
  { id: 'plannedExitDate', label: 'Planned Exit Date' },
  { id: 'ownerEmployee', label: 'Owner' },
  { id: 'investmentStatus', label: 'Status' },
  { id: 'createdAt', label: 'Created' }
]

export interface PlannedExitsProps extends BusinessAppContextProps {
  enabled?: boolean
}

const PlannedExits: React.FC<PlannedExitsProps> = ({ accessToken, userInfo, enabled = true }) => {
  const context = { accessToken, userInfo }
  const gatedContext = useMemo(
    () => ({ accessToken: enabled ? accessToken : '', userInfo }),
    [accessToken, userInfo, enabled]
  )
  const [selectedCurrency, setSelectedCurrency] = useState('all')
  const activeCurrency = selectedCurrency === 'all' ? undefined : selectedCurrency
  // Raw filter values from the filter sheet (used as display state in DataDisplay)
  const [rawFilterSheetFilters, setRawFilterSheetFilters] = useState<Record<string, any>>({})

  const { currencies: availableCurrencies, isLoading: currenciesLoading } = useAvailableCurrencies(
    { accessToken: enabled && accessToken ? accessToken : '', userInfo },
    {
      filters: { entity: 'Investment' },
      returnFormat: 'full'
    }
  )

  const filtersReady = !currenciesLoading && Array.isArray(availableCurrencies)

  // Descriptor-driven filter options scoped to planned exits only
  const filterGroups = useFilterGroups(gatedContext, 'Investment', INVESTMENT_DESCRIPTORS, {
    limit: 100,
    baseWhereParts: PLANNED_EXITS_BASE_WHERE_PARTS
  })

  const dynamicFilterConfig = useMemo(
    () => buildDynamicFilterConfig(plannedExitsFilterConfig, INVESTMENT_DESCRIPTORS, filterGroups),
    [filterGroups]
  )

  // Convert filter sheet values to query-compatible variables.
  // - Date ranges → separate From/To fields (descriptor-based)
  // - Amount ranges → customConditions (not in descriptors)
  const normalizedFilterSheetFilters = useMemo(
    () => normalizePlannedExitFilters(rawFilterSheetFilters),
    [rawFilterSheetFilters]
  )

  // Merge currency (from dropdown) with filter sheet selections
  const selectedFilters = useMemo(
    () =>
      filtersReady
        ? { ...buildCurrencyFilter(availableCurrencies, activeCurrency ?? ''), ...normalizedFilterSheetFilters }
        : {},
    [filtersReady, availableCurrencies, activeCurrency, normalizedFilterSheetFilters]
  )

  const sectionState = usePlannedExitsSectionState({
    accessToken: filtersReady && enabled ? accessToken || '' : '',
    selectedFilters
  })

  // KPIs only react to currency changes — filter sheet selections must not trigger re-fetches
  const currencyOnlyFilters = useMemo(
    () => (filtersReady ? buildCurrencyFilter(availableCurrencies, activeCurrency ?? '') : {}),
    [filtersReady, availableCurrencies, activeCurrency]
  )
  const metrics = usePlannedExitsMetrics(context, activeCurrency ?? '', currencyOnlyFilters, filtersReady && enabled)

  useProcessCompletion({
    onSuccess: () => {
      sectionState.refetch()
      metrics.refetch()
    }
  })

  const handleSearch = useCallback(
    (value: string) => {
      sectionState.setSearch(value)
      sectionState.handlePaginationChange({ pageIndex: 0, pageSize: sectionState.pageSize })
    },
    [sectionState]
  )

  const handleFilterChange = useCallback(
    (newFilters: Record<string, any>) => {
      setRawFilterSheetFilters(newFilters)
      sectionState.handlePaginationChange({ pageIndex: 0, pageSize: sectionState.pageSize })
    },
    [sectionState]
  )

  const currencyCodes = useMemo(
    () =>
      (Array.isArray(availableCurrencies) ? availableCurrencies : [])
        .map(c => (typeof c === 'string' ? c : c?.code || c?.value || ''))
        .filter(Boolean),
    [availableCurrencies]
  )

  const secondaryActions = useMemo(
    () => (
      <CurrencyFilter
        value={selectedCurrency}
        currencies={currencyCodes}
        onChange={newCurrency => {
          setSelectedCurrency(newCurrency)
          sectionState.handlePaginationChange({ pageIndex: 0, pageSize: sectionState.pageSize })
        }}
        allOptionLabel="All"
        dataTestId="planned-exits-currency-filter"
      />
    ),
    [currencyCodes, selectedCurrency, sectionState]
  )

  return (
    <div data-testid="planned-exits-container" className="gba:space-y-6">
      <PlannedExitsMetrics
        current={metrics.current}
        previous={metrics.previous}
        currencyCode={activeCurrency}
        isLoading={metrics.isLoading}
        error={metrics.error}
        onRetry={metrics.refetch}
      />

      <DataDisplay
        titleSections={[
          {
            id: 'planned-exits',
            label: 'Planned Exits',
            metadata: {
              count: sectionState.totalCount,
              isLoading: sectionState.loading
            }
          }
        ]}
        currentSection="planned-exits"
        searchValue={sectionState.search}
        searchPlaceholder="Search planned exits..."
        onSearchChange={handleSearch}
        filters={rawFilterSheetFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={handleFilterChange}
        availableColumns={COLUMN_CONFIG}
        visibleColumns={sectionState.visibleColumns}
        onVisibleColumnsChange={sectionState.setVisibleColumns}
        secondaryActions={secondaryActions}
        toolbarDensity="default"
        filterSheetTitle="Filter Planned Exits"
        filterSheetDescription="Apply filters to narrow down the planned exits list"
      >
        <GenericInvestmentsList
          accessToken={accessToken}
          userInfo={userInfo}
          config={PLANNED_EXIT_CONFIG}
          data={sectionState.investments}
          loading={sectionState.isInitialLoading}
          error={sectionState.error}
          totalCount={sectionState.totalCount}
          sorting={sectionState.sorting}
          onSortingChange={sectionState.handleSortingChange}
          pagination={sectionState.pagination}
          onPaginationChange={sectionState.handlePaginationChange}
          visibleColumns={sectionState.visibleColumns}
        />
      </DataDisplay>
    </div>
  )
}

export default PlannedExits
