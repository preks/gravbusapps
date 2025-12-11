import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  DataDisplay,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Label
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { OpportunityListLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import {
  createOpportunityColumns,
  createOpportunitySortableColumns
} from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import { useInvestmentOpportunityFilters } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters'
import {
  applyBasicFilters,
  applyAmountFilter,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/queryHelpers'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ExitsStatistics } from './components/ExitsStatistics'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export type ExitsTabProps = BusinessAppContextProps

export const ExitsTab: React.FC<ExitsTabProps> = context => {
  const { accessToken } = context
  const [selectedCurrency, setSelectedCurrency] = useState('EUR')
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  // State management
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'closeDate', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'opportunity',
    'amount',
    'account',
    'status',
    'closeDate',
    'owner',
    'created'
  ])

  // Dynamic filter data
  const filterData = useInvestmentOpportunityFilters(context)
  const { owners, stages, pipelines, accounts, statuses } = filterData
  const amountRange =
    'amountRange' in filterData && typeof filterData.amountRange === 'object'
      ? (filterData.amountRange as { min: number; max: number })
      : { min: 0, max: 1000000 }

  // Identify WON status IDs for server-side filtering
  const wonStatusIds = useMemo(() => {
    return statuses
      .filter(status => {
        const label = status.label?.toUpperCase() || ''
        const wonVariations = ['WON', 'CLOSED WON', 'SOLD', 'SUCCESS', 'COMPLETED']
        return wonVariations.some(variation => label.includes(variation) || label === variation)
      })
      .map(status => status.id)
  }, [statuses])

  // Helper to update filter options
  const updateFilterOptions = (
    filterConfig: any,
    groupId: string,
    filterId: string,
    options: Array<{ id: string; label: string }>
  ) => {
    if (options.length === 0) return

    const group = filterConfig.groups.find((g: any) => g.id === groupId)
    if (!group) return

    const filter = group.filters.find((f: any) => f.id === filterId)
    if (filter?.config && 'options' in filter.config) {
      filter.config.options = options
    }
  }

  // Helper to update amount range
  const updateAmountRangeFilter = (filterConfig: any, amountRange: { min: number; max: number }) => {
    const group = filterConfig.groups.find((g: any) => g.id === 'amount-group')
    if (!group) return

    const filter = group.filters.find((f: any) => f.id === 'amount')
    if (filter?.config && 'min' in filter.config && 'max' in filter.config) {
      filter.config.min = amountRange.min
      filter.config.max = amountRange.max
      const range = amountRange.max - amountRange.min
      filter.config.step = Math.max(100, Math.ceil(range * 0.01))
    }
  }

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const filterConfig = { ...opportunityFilterConfig }

    updateFilterOptions(
      filterConfig,
      'stage-group',
      'stage',
      stages.map(s => ({ id: s.id, label: s.label }))
    )
    updateFilterOptions(
      filterConfig,
      'status-group',
      'status',
      statuses.map(s => ({ id: s.id, label: s.label }))
    )
    updateFilterOptions(
      filterConfig,
      'pipeline-group',
      'pipeline',
      pipelines.map(p => ({ id: p.id, label: p.label }))
    )
    updateFilterOptions(
      filterConfig,
      'owner-group',
      'owner',
      owners.map(o => ({ id: o.id, label: o.label }))
    )
    updateFilterOptions(
      filterConfig,
      'account-group',
      'account',
      accounts.map(a => ({ id: a.id, label: a.label }))
    )

    updateAmountRangeFilter(filterConfig, amountRange)

    return filterConfig
  }, [owners, stages, pipelines, accounts, statuses, amountRange])

  // Map column IDs to GraphQL fields
  const mapColumnToGraphQLField = (columnId: string): string => {
    const mapping: Record<string, string> = {
      opportunity: 'name',
      amount: 'estimatedAmount',
      status: 'opportunityStatus',
      closeDate: 'closeDate',
      account: 'accountId',
      owner: 'ownerEmployeeId',
      created: 'createdAt'
    }
    return mapping[columnId] || columnId
  }

  // Load opportunities with server-side WON filtering
  const loadOpportunities = useCallback(async () => {
    if (!accessToken || wonStatusIds.length === 0) {
      // If no WON statuses found, set empty data
      if (wonStatusIds.length === 0) {
        setOpportunities([])
        setTotalCount(0)
        setLoading(false)
      }
      return
    }

    setLoading(true)
    setError(null)

    try {
      const variables: InvestmentOpportunityQueryVariables = {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        search: searchTerm.trim() || undefined,
        dealType: 'DIVESTMENT_DEAL',
        currencyCode: selectedCurrency || undefined,
        // Server-side filtering for WON opportunities
        statusIds: wonStatusIds
      }

      // Apply user-selected filters
      applyBasicFilters(variables, selectedFilters)
      applyAmountFilter(variables, selectedFilters.amount)
      applyDateFilter(variables, selectedFilters.closeDate)

      // Apply sorting
      if (sorting.length > 0) {
        variables.orderBy = [
          {
            field: mapColumnToGraphQLField(sorting[0].id) as any,
            direction: sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
          }
        ]
      }

      const result = await fetchInvestmentOpportunities(variables)

      setOpportunities(result.InvestmentOpportunity || [])
      setTotalCount(result.totalCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exit opportunities')
      setOpportunities([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    wonStatusIds,
    pagination,
    searchTerm,
    selectedFilters,
    sorting,
    selectedCurrency,
    fetchInvestmentOpportunities
  ])

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  // Handle process completion to refresh data
  useProcessCompletion({ onSuccess: loadOpportunities })

  useEffect(() => {
    const handleProcessComplete = () => loadOpportunities()

    const eventNames = ['taskCompletion', 'processCompletion', 'taskCompleted', 'processCompleted']

    eventNames.forEach(eventName => {
      globalThis.addEventListener(eventName, handleProcessComplete)
    })

    return () => {
      eventNames.forEach(eventName => {
        globalThis.removeEventListener(eventName, handleProcessComplete)
      })
    }
  }, [loadOpportunities])

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Handle filter change
  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Handle row click
  const handleRowClick = useCallback((opportunity: InvestmentOpportunity) => {
    const url = buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId: opportunity.id,
      source: 'divestment-view',
      tab: 'exits'
    })
    navigateTo(url)
  }, [])

  // Build account URL
  const buildAccountUrl = useCallback(
    (accountId: string) =>
      buildPlatformUrl('/platform/irm/account-record', {
        accountId
      }),
    []
  )

  // Columns
  const columns = useMemo(() => createOpportunityColumns(buildAccountUrl), [buildAccountUrl])

  const availableColumns = useMemo(
    () => [
      { id: 'opportunity', label: 'Opportunity' },
      { id: 'amount', label: 'Exit Amount' },
      { id: 'account', label: 'Account' },
      { id: 'status', label: 'Status' },
      { id: 'closeDate', label: 'Close Date' },
      { id: 'owner', label: 'Owner' },
      { id: 'created', label: 'Created' }
    ],
    []
  )

  const sortableColumns = useMemo(() => createOpportunitySortableColumns(), [])

  // Fetch available currencies efficiently using distinctOn
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'InvestmentOpportunity', dealType: 'DIVESTMENT_DEAL' },
    returnFormat: 'codes'
  })

  // Currency Filter Component
  const currencyFilterUI = useMemo(() => {
    if (availableCurrencies.length === 0) return null

    return (
      <div className="gba:flex gba:items-center gba:gap-2">
        <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
        <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
          <SelectTrigger className="gba:w-32">
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
      </div>
    )
  }, [availableCurrencies, selectedCurrency])

  // No need for client-side pagination anymore - using server-side pagination

  return (
    <div data-testid="exits-tab-container" className="gba:space-y-6">
      {/* Statistics */}
      <ExitsStatistics {...context} currencyCode={selectedCurrency} />

      {/* Data Display with List */}
      <DataDisplay
        titleSections={[
          {
            id: 'exits',
            label: 'Exited Opportunities',
            metadata: {
              count: totalCount
            }
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
      </DataDisplay>
    </div>
  )
}

export default ExitsTab
