import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, Button } from '@newwork/nw-design-system'
import { DownloadIcon, FileXlsIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/components/CurrencyFilter'
import { useExitsExport } from './hooks/useExitsExport'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useFilterGroups } from '@/common/data/common/hooks/useFilterGroups'
import { deriveSortableColumns, deriveAvailableColumns } from '@/common/network/graphql/descriptorUtils'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { OpportunityListLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import { createOpportunityColumns } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import {
  buildInvestmentOpportunityQuery,
  buildInvestmentOpportunityWhereCondition,
  buildInvestmentOpportunityOrderBy
} from '@/common/data/investment/queries/investmentOpportunityQueries'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { toInvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { DIVESTMENT_OPPORTUNITY_DESCRIPTORS } from '../../config/divestmentOpportunityDescriptors'
import { divestmentOpportunityFilterConfig } from '../../config/defaultDivestmentFilters'
import { buildDynamicFilterConfig } from '@/common/components/common-relations/view-layouts/account-layout'
import { insertDivestmentColumn } from '../../config/divestmentColumns'
import { buildOpportunityCustomConditions, WON_STATUS_CONDITION } from '../../config/divestmentOpportunityConditions'
import { ExitsStatistics } from './components/ExitsStatistics'
import { formatFlatCurrencyAmount } from '../../../investment-view/data/shared/investmentAggregatesFormat'

const EXITS_BASE_WHERE_PARTS = ['dealType: { _eq: "DIVESTMENT_DEAL" }']

function buildAmountRanges(amountFilter: any): InvestmentOpportunityQueryVariables['estimatedAmountRanges'] {
  if (!amountFilter || typeof amountFilter !== 'object') return undefined
  const { min, max } = amountFilter
  if (min === undefined && max === undefined) return undefined
  return [{ ...(min !== undefined && { min }), ...(max !== undefined && { max }) }]
}

function buildDateFilterVars(closeDateRange: any): Record<string, string> {
  const normalizedDate = normalizeDateRange(closeDateRange)
  if (!normalizedDate) return {}
  return {
    ...(normalizedDate.from && { closeDateFrom: normalizedDate.from }),
    ...(normalizedDate.to && { closeDateTo: normalizedDate.to })
  }
}

function buildSortingVars(sorting: Array<{ id: string; desc: boolean }>) {
  if (sorting.length === 0) return undefined
  return [
    {
      field: sorting[0].id as any,
      direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
    }
  ]
}

const COLUMN_LABELS: Record<string, string> = {
  opportunity: 'Opportunity',
  amount: 'Exit Amount',
  divestment: 'Divestment',
  opportunityStatus: 'Status',
  opportunityPipeline: 'Pipeline',
  opportunityPipelineStage: 'Stage',
  opportunityForecast: 'Forecast',
  closeDate: 'Close Date',
  owner: 'Owner',
  created: 'Created'
}

export interface ExitsTabProps extends BusinessAppContextProps {
  enabled?: boolean
}

export const ExitsTab: React.FC<ExitsTabProps> = ({ enabled = true, ...context }) => {
  const { accessToken } = context
  const gatedToken = enabled ? accessToken : ''
  const gatedContext = useMemo(() => ({ ...context, accessToken: gatedToken }), [gatedToken, context.userInfo])

  const graphqlClient = useGraphQLClient(gatedToken)

  // View State
  const [selectedCurrency, setSelectedCurrency] = useState('EUR')
  const activeCurrency = selectedCurrency === 'all' ? undefined : selectedCurrency
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'closeDate', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([])

  // Data State
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [exitAmounts, setExitAmounts] = useState<{
    totalExitAmount: number | null
    averageExitAmount: number | null
    totalInvestmentAmount: number | null
    avgInvestmentAmount: number | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Descriptor-driven filter options (single batched query)
  const filterGroups = useFilterGroups(gatedContext, 'InvestmentOpportunity', DIVESTMENT_OPPORTUNITY_DESCRIPTORS, {
    limit: 100,
    baseWhereParts: EXITS_BASE_WHERE_PARTS
  })

  const dynamicFilterConfig = useMemo(
    () => buildDynamicFilterConfig(divestmentOpportunityFilterConfig, DIVESTMENT_OPPORTUNITY_DESCRIPTORS, filterGroups),
    [filterGroups]
  )

  // Columns
  const columns = useMemo(() => insertDivestmentColumn(createOpportunityColumns(), 'account'), [])

  const availableColumns = useMemo(() => deriveAvailableColumns(columns), [columns])
  const availableColumnIds = useMemo(() => availableColumns.map(col => col.id), [availableColumns])
  const sortableColumns = useMemo(
    () => deriveSortableColumns(DIVESTMENT_OPPORTUNITY_DESCRIPTORS, COLUMN_LABELS, availableColumnIds),
    [availableColumnIds]
  )

  // Initialize visible columns
  useEffect(() => {
    if (visibleColumns.length === 0 && availableColumns.length > 0) {
      setVisibleColumns(availableColumns.map(col => col.id))
    }
  }, [availableColumns, visibleColumns.length])

  // Scope free-text search to the visible table columns (mirrors the Exit Opportunities tab) so the
  // generated `_or` only targets displayed columns. Stays `undefined` when no search term, so toggling
  // columns without an active search does not trigger a refetch.
  const searchDescriptorKeys = useMemo(
    () => (searchTerm.trim() && visibleColumns.length > 0 ? visibleColumns : undefined),
    [searchTerm, visibleColumns]
  )

  // Build query variables from UI state
  const queryVariables = useMemo(() => {
    const vars: InvestmentOpportunityQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined,
      ...(searchDescriptorKeys ? { searchDescriptorKeys } : {}),
      estimatedAmountRanges: buildAmountRanges(selectedFilters.amount),
      orderBy: buildSortingVars(sorting),
      ...buildDateFilterVars(selectedFilters.closeDateRange)
    }

    for (const [key, value] of Object.entries(selectedFilters)) {
      if (key === 'amount' || key === 'closeDateRange') continue
      if (value !== undefined && value !== null) {
        ;(vars as any)[key] = value
      }
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting, searchDescriptorKeys])

  // Load data using descriptor-driven where builder
  const loadData = useCallback(async () => {
    if (!enabled || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const query = buildInvestmentOpportunityQuery()

      const customConditions = buildOpportunityCustomConditions(
        { ...queryVariables, dealType: 'DIVESTMENT_DEAL', currencyCode: activeCurrency },
        [WON_STATUS_CONDITION]
      )

      const whereCondition = buildInvestmentOpportunityWhereCondition(queryVariables, [], customConditions)
      const orderBy = buildInvestmentOpportunityOrderBy(queryVariables.orderBy || [])

      const [result, amountAgg] = await Promise.all([
        graphqlClient.request<{
          InvestmentOpportunity: InvestmentOpportunity[]
          InvestmentOpportunityAggregate: { aggregate: { count: number } }
        }>(query, {
          limit: Math.min(queryVariables.limit || 50, 100),
          offset: queryVariables.offset || 0,
          where: whereCondition,
          orderBy
        }),
        graphqlClient.request<{
          InvestmentOpportunityAggregate: {
            aggregate: {
              sum: { estimatedAmount: number | null; initialInvestmentAmount: number | null }
              avg: { estimatedAmount: number | null; initialInvestmentAmount: number | null }
            }
          }
        }>(
          `query GetExitAmounts($where: InvestmentOpportunityBoolExp) {
            InvestmentOpportunityAggregate(where: $where) {
              aggregate {
                sum { estimatedAmount initialInvestmentAmount }
                avg { estimatedAmount initialInvestmentAmount }
              }
            }
          }`,
          { where: whereCondition }
        )
      ])

      const agg = amountAgg.InvestmentOpportunityAggregate?.aggregate
      setOpportunities(result.InvestmentOpportunity.map(toInvestmentOpportunity))
      setTotalCount(result.InvestmentOpportunityAggregate?.aggregate?.count || 0)
      setExitAmounts({
        totalExitAmount: agg?.sum?.estimatedAmount ?? null,
        averageExitAmount: agg?.avg?.estimatedAmount ?? null,
        totalInvestmentAmount: agg?.sum?.initialInvestmentAmount ?? null,
        avgInvestmentAmount: agg?.avg?.initialInvestmentAmount ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exit opportunities')
      setOpportunities([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [enabled, accessToken, graphqlClient, queryVariables, selectedCurrency])

  useEffect(() => {
    loadData()
  }, [loadData])

  useProcessCompletion({
    onSuccess: () => {
      loadData()
    }
  })

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback((opportunity: InvestmentOpportunity) => {
    const url = buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId: opportunity.id,
      source: 'divestment-view',
      tab: 'exits'
    })
    navigateTo(url)
  }, [])

  // Currency
  const { currencies: availableCurrencies } = useAvailableCurrencies(
    { ...context, accessToken: gatedToken },
    {
      filters: { entity: 'InvestmentOpportunity', dealType: 'DIVESTMENT_DEAL' },
      returnFormat: 'codes'
    }
  )

  const { isExporting, handleExportCsv, handleExportExcel } = useExitsExport({
    accessToken: accessToken || '',
    queryVariables,
    activeCurrency,
    totalCount,
    exitAmounts: exitAmounts ?? undefined,
    displayCurrencyCode: activeCurrency || 'EUR'
  })

  const currencyFilterUI = useMemo(
    () => (
      <>
        <CurrencyFilter
          value={selectedCurrency}
          currencies={availableCurrencies as string[]}
          onChange={setSelectedCurrency}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          disabled={isExporting || totalCount === 0}
          title={isExporting ? 'Exporting…' : `Export ${totalCount} exits as CSV`}
          data-testid="export-exits-csv"
        >
          <DownloadIcon size={16} />
          CSV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportExcel}
          disabled={isExporting || totalCount === 0}
          title={isExporting ? 'Exporting…' : `Export ${totalCount} exits as Excel`}
          data-testid="export-exits-excel"
        >
          <FileXlsIcon size={16} />
          Excel
        </Button>
      </>
    ),
    [availableCurrencies, selectedCurrency, isExporting, totalCount, handleExportCsv, handleExportExcel]
  )

  return (
    <div data-testid="exits-tab-container" className="gba:space-y-6">
      <ExitsStatistics accessToken={accessToken} currencyCode={activeCurrency} enabled={enabled} />

      <DataDisplay
        titleSections={[
          {
            id: 'exits',
            label: 'Exited Opportunities',
            metadata: { count: totalCount, isLoading: loading }
          }
        ]}
        currentSection="exits"
        searchValue={searchTerm}
        searchPlaceholder="Search exited opportunities..."
        onSearchChange={handleSearch}
        filters={selectedFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={handleFilterUpdate}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumns}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        secondaryActions={currencyFilterUI}
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle="Filter Exits"
        filterSheetDescription="Apply filters to narrow down the exited opportunities list"
      >
        <OpportunityListLayout<InvestmentOpportunity>
          data={opportunities}
          loading={loading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          onRowClick={handleRowClick}
          dataTestId="exits-opportunities-list"
        />
        {exitAmounts && (
          <div
            className="gba:flex gba:flex-wrap gba:items-baseline gba:gap-x-6 gba:gap-y-2 gba:px-1 gba:py-3 gba:border-t gba:border-border gba:bg-muted/40 gba:text-sm"
            data-testid="exits-aggregates-bar"
          >
            <div data-testid="exits-aggregate-count">
              <span className="gba:text-muted-foreground">Count: </span>
              <span className="gba:font-medium gba:text-foreground">{totalCount}</span>
            </div>
            <div data-testid="exits-aggregate-total-estimated">
              <span className="gba:text-muted-foreground">Total Estimated Amount: </span>
              <span className="gba:font-medium gba:font-mono gba:text-foreground">
                {formatFlatCurrencyAmount(exitAmounts.totalExitAmount, activeCurrency || 'EUR')}
              </span>
            </div>
            <div data-testid="exits-aggregate-avg-estimated">
              <span className="gba:text-muted-foreground">Average Estimated Amount: </span>
              <span className="gba:font-medium gba:font-mono gba:text-foreground">
                {formatFlatCurrencyAmount(exitAmounts.averageExitAmount, activeCurrency || 'EUR')}
              </span>
            </div>
            <div data-testid="exits-aggregate-total-investment">
              <span className="gba:text-muted-foreground">Total Investment Amount: </span>
              <span className="gba:font-medium gba:font-mono gba:text-foreground">
                {formatFlatCurrencyAmount(exitAmounts.totalInvestmentAmount, activeCurrency || 'EUR')}
              </span>
            </div>
            <div data-testid="exits-aggregate-avg-investment">
              <span className="gba:text-muted-foreground">Average Investment Amount: </span>
              <span className="gba:font-medium gba:font-mono gba:text-foreground">
                {formatFlatCurrencyAmount(exitAmounts.avgInvestmentAmount, activeCurrency || 'EUR')}
              </span>
            </div>
          </div>
        )}
      </DataDisplay>
    </div>
  )
}

export default ExitsTab
