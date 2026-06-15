import React, { useState, useCallback, useEffect, useMemo } from 'react'
import {
  DataDisplay,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityListLayout } from '@/common/components/common-relations/view-layouts/opportunity-layout'
import {
  createOpportunityColumns,
  createOpportunitySortableColumns
} from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityColumns'
import { opportunityFilterConfig } from '@/common/components/common-relations/view-layouts/opportunity-layout/config/opportunityFilters'
import {
  buildCustomerOpportunityQuery,
  buildCustomerOpportunityWhereCondition,
  buildCustomerOpportunityOrderBy,
  type CustomerOpportunityQueryVariables
} from '@/common/data/customer/queries/customerOpportunityQueries'
import { CustomerOpportunity, toCustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCustomerOpportunityFilters } from '@/business-apps/crm/core/apps/customer-relations/views/opportunity-view/hooks/useCustomerOpportunityFilters'
import {
  applyBasicFilters,
  applyAmountFilter,
  applyDateFilter
} from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/queryHelpers'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

// Currency Filter Component
interface CurrencyFilterProps {
  selectedCurrency: string
  currencies: Array<{ code: string; label: string }>
  onCurrencyChange: (currencyCode: string) => void
}

const CurrencyFilter: React.FC<CurrencyFilterProps> = ({ selectedCurrency, currencies, onCurrencyChange }) => {
  if (currencies.length === 0) return null

  return (
    <div className="gba:flex gba:items-center gba:gap-2" data-testid="employee-opportunities-currency-filter">
      <Label className="gba:text-sm gba:font-medium gba:whitespace-nowrap">Currency:</Label>
      <Select value={selectedCurrency} onValueChange={onCurrencyChange}>
        <SelectTrigger className="gba:w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {currencies.map(currency => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface EmployeeOpportunitiesTabProps extends Partial<BusinessAppContextProps> {
  employeeId: string
  accessToken: string
  userInfo?: any
  onTotalChange?: (total: number) => void
}

/**
 * Employee Opportunities View - Shows opportunities owned by the selected employee
 * Uses OpportunityListLayout directly (no tabs, no board) following IRM Divestment pattern
 */
export const EmployeeOpportunitiesTab: React.FC<EmployeeOpportunitiesTabProps> = ({
  employeeId,
  accessToken,
  userInfo,
  ...restContext
}) => {
  const context = { accessToken, userInfo, ...restContext } satisfies BusinessAppContextProps
  const graphqlClient = useGraphQLClient(context.accessToken)

  // State management
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'closeDate', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')
  const [availableCurrencies, setAvailableCurrencies] = useState<Array<{ code: string; label: string }>>([])
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'opportunity',
    'amount',
    'opportunityPipeline',
    'opportunityPipelineStage',
    'opportunityStatus',
    'opportunityForecast',
    'closeDate',
    'owner',
    'created'
  ])

  // Dynamic filter data
  const filterData = useCustomerOpportunityFilters(context)
  const { stages, pipelines, accounts, statuses } = filterData
  const forecasts = ('forecasts' in filterData ? filterData.forecasts : []) as Array<{ id: string; label: string }>
  const amountRange =
    'amountRange' in filterData && typeof filterData.amountRange === 'object'
      ? (filterData.amountRange as { min: number; max: number })
      : { min: 0, max: 1000000 }

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

  // Dynamic filter configuration (hide owner filter since we're filtering by specific employee)
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
      'forecast-group',
      'forecast',
      forecasts.map((f: any) => ({ id: f.id, label: f.label }))
    )
    updateFilterOptions(
      filterConfig,
      'pipeline-group',
      'pipeline',
      pipelines.map(p => ({ id: p.id, label: p.label }))
    )
    updateFilterOptions(
      filterConfig,
      'account-group',
      'account',
      accounts.map(a => ({ id: a.id, label: a.label }))
    )

    updateAmountRangeFilter(filterConfig, amountRange)

    // Remove owner filter since we're filtering by specific employee
    return {
      ...filterConfig,
      groups: filterConfig.groups.filter(group => group.id !== 'owner-group')
    }
  }, [stages, statuses, forecasts, pipelines, accounts, amountRange])

  // Map column IDs to GraphQL fields
  const mapColumnToGraphQLField = (columnId: string): string => {
    const mapping: Record<string, string> = {
      opportunity: 'name',
      amount: 'estimatedAmount',
      opportunityStatus: 'opportunityStatus',
      closeDate: 'closeDate',
      account: 'accountId',
      opportunityPipeline: 'salesPipeline',
      opportunityPipelineStage: 'salesPipelineStage',
      opportunityForecast: 'opportunityForecast',
      owner: 'ownerEmployeeId',
      created: 'createdAt'
    }
    return mapping[columnId] || columnId
  }

  // Load opportunities
  const loadOpportunities = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const variables: CustomerOpportunityQueryVariables = {
        limit: pagination.pageSize,
        offset: pagination.pageIndex * pagination.pageSize,
        search: searchTerm.trim() || undefined,
        ownerEmployeeIds: [employeeId], // Filter by employee
        currencyCode: selectedCurrency // Filter by selected currency
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

      const query = buildCustomerOpportunityQuery()
      const whereCondition = buildCustomerOpportunityWhereCondition(variables)
      const orderBy = buildCustomerOpportunityOrderBy(variables.orderBy || [])

      const graphQLVariables: Record<string, any> = {
        limit: Math.min(variables.limit || 50, 100),
        offset: variables.offset || 0,
        where: whereCondition,
        orderBy: orderBy
      }

      const result = await graphqlClient.request<{
        Opportunity: any[]
        OpportunityAggregate: { aggregate: { count: number } }
      }>(query, graphQLVariables)

      const opps = result.Opportunity.map(toCustomerOpportunity)
      const total = result.OpportunityAggregate?.aggregate?.count || 0

      setOpportunities(opps)
      setTotalCount(total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
      setOpportunities([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, pagination, searchTerm, selectedFilters, sorting, selectedCurrency, graphqlClient])

  // Fetch available currencies from employee's opportunities
  const fetchAvailableCurrencies = useCallback(async () => {
    if (!accessToken || !employeeId) return

    try {
      const currenciesQuery = `
        query GetEmployeeOpportunityCurrencies {
          currencies: Opportunity(
            distinctOn: currencyRef
            orderBy: [{ currencyRef: ASC }]
            where: {
              isDeleted: { _eq: false }
              ownerEmployeeId: { _eq: "${employeeId}" }
              currencyRef: { _isNull: false }
            }
          ) {
            currencyRef
            currency {
              code
              value
            }
          }
        }
      `

      const result = await graphqlClient.request<{
        currencies: Array<{
          currencyRef: string | null
          currency: { code: string; value: string } | null
        }>
      }>(currenciesQuery)

      const currencies = (result.currencies || [])
        .filter(item => item.currency?.code)
        .map(item => ({
          code: item.currency!.code,
          label: item.currency!.code
        }))

      // Sort currencies: EUR, USD, GBP first, then alphabetically
      const priorityCurrencies = ['EUR', 'USD', 'GBP']
      const sortedCurrencies = currencies.toSorted((a, b) => {
        const aIndex = priorityCurrencies.indexOf(a.code)
        const bIndex = priorityCurrencies.indexOf(b.code)

        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
        if (aIndex !== -1) return -1
        if (bIndex !== -1) return 1

        return a.code.localeCompare(b.code)
      })

      setAvailableCurrencies(sortedCurrencies)
    } catch (err) {
      console.error('Error fetching available currencies:', err)
      setAvailableCurrencies([])
    }
  }, [accessToken, employeeId, graphqlClient])

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadOpportunities()
  }, [loadOpportunities])

  // Fetch currencies when component mounts
  useEffect(() => {
    fetchAvailableCurrencies()
  }, [fetchAvailableCurrencies])

  // Reset pagination when currency changes
  useEffect(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [selectedCurrency])

  // Memoized callback for process completion
  const handleProcessSuccess = useCallback(() => {
    loadOpportunities()
  }, [loadOpportunities])

  // Handle process completion to refresh data
  useProcessCompletion({ onSuccess: handleProcessSuccess })

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
  const handleRowClick = useCallback((opportunity: CustomerOpportunity) => {
    if (!opportunity.id) return
    const url = buildPlatformUrl('/platform/crm/opportunity-record', {
      opportunityId: opportunity.id,
      source: 'sales-performance'
    })
    navigateTo(url)
  }, [])

  // Columns
  const columns = useMemo(() => createOpportunityColumns(), [])

  const availableColumns = useMemo(
    () => [
      { id: 'opportunity', label: 'Opportunity' },
      { id: 'amount', label: 'Amount' },
      { id: 'opportunityPipeline', label: 'Pipeline' },
      { id: 'opportunityPipelineStage', label: 'Stage' },
      { id: 'opportunityStatus', label: 'Status' },
      { id: 'opportunityForecast', label: 'Forecast' },
      { id: 'closeDate', label: 'Close Date' },
      { id: 'owner', label: 'Owner' },
      { id: 'created', label: 'Created' }
    ],
    []
  )

  const sortableColumns = useMemo(() => createOpportunitySortableColumns(), [])

  return (
    <div data-testid={`employee-opportunities-${employeeId}`}>
      <DataDisplay
        titleSections={[
          {
            id: 'opportunities',
            label: 'All Opportunities',
            metadata: {
              count: totalCount
            }
          }
        ]}
        currentSection="opportunities"
        searchValue={searchTerm}
        searchPlaceholder="Search opportunities..."
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
        secondaryActions={
          <CurrencyFilter
            selectedCurrency={selectedCurrency}
            currencies={availableCurrencies}
            onCurrencyChange={setSelectedCurrency}
          />
        }
        toolbarDensity="default"
      >
        <OpportunityListLayout<CustomerOpportunity>
          data={opportunities}
          loading={loading}
          error={error}
          totalCount={totalCount}
          columns={columns.filter(col => visibleColumns.includes(col.id as string)) as any}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          onRowClick={handleRowClick as any}
          dataTestId="employee-opportunities-list"
          // NOTE: No 'actions' prop = no action column!
        />
      </DataDisplay>
    </div>
  )
}

export default EmployeeOpportunitiesTab
