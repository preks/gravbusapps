import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger, Spinner, Alert, Button } from '@newwork/nw-design-system'
import { List, LayoutGrid } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { OpportunityStatistics } from './components/OpportunityStatistics'
import { OpportunityList } from './components/OpportunityList'
import { ColumnConfig } from '@/components/dataController'
import { OpportunityBoard } from './components/opportunity-board/OpportunityBoard'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Plus } from 'lucide-react'
import { useInvestmentOpportunityFilters } from './hooks/useInvestmentOpportunityFilters'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface OpportunityViewProps extends BusinessAppContextProps {}

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { accessToken } = context

  // State management
  type SortOrder = 'ASC' | 'DESC' | undefined
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  const [sortField, setSortField] = useState<string | undefined>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  // const [showDataFilter, setShowDataFilter] = useState(false);
  const [activeTab, setActiveTab] = useState('list')
  const [initializedFromUrl, setInitializedFromUrl] = useState(false)
  const [boardRefreshTrigger, setBoardRefreshTrigger] = useState(0)

  // Board view filters have been moved to the OpportunityBoard component
  // List view only needs basic filtering

  // Hooks for data fetching
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)
  // Board view loads its own stages based on selected pipeline

  // Data state
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'opportunity', label: 'Opportunity', visible: true },
    { id: 'amount', label: 'Amount', visible: true },
    { id: 'pipeline', label: 'Pipeline', visible: true },
    { id: 'stage', label: 'Stage', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'closeDate', label: 'Close Date', visible: true },
    { id: 'account', label: 'Account', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Creation Date', visible: true }
  ])

  // Get visible columns for passing to table
  const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id)

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  const { filterGroups, filterLabelMap, handleFilterChange, closeAfter, closeBefore } = useInvestmentOpportunityFilters(
    context,
    selectedFilters,
    setSelectedFilters
  )

  // Build query variables
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => {
    const variables: InvestmentOpportunityQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      dealType: 'INVESTMENT_DEAL', // Fixed filter for investment opportunities only
      ...(sortField && sortOrder
        ? {
            orderBy: [
              { field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }
            ] as any
          }
        : {}),
      ...(closeAfter ? { closeDateFrom: closeAfter } : {}),
      ...(closeBefore ? { closeDateTo: closeBefore } : {})
    }

    // Map selected filters
    const ownerIds: string[] = []
    const stageIds: string[] = []
    const pipelineIds: string[] = []
    const accountIds: string[] = []
    const statusIds: string[] = []
    const amountRanges: Array<{ min?: number; max?: number }> = []
    const chanceRanges: Array<{ min?: number; max?: number }> = []

    selectedFilters.forEach(f => {
      if (f.startsWith('owner:')) ownerIds.push(f.slice(6))
      else if (f.startsWith('stage:')) stageIds.push(f.slice(6))
      else if (f.startsWith('pipeline:')) pipelineIds.push(f.slice(9))
      else if (f.startsWith('account:')) accountIds.push(f.slice(8))
      else if (f.startsWith('status:')) statusIds.push(f.slice(7))
      else if (f === 'amount-large') amountRanges.push({ min: 100000 })
      else if (f === 'amount-medium') amountRanges.push({ min: 50000, max: 100000 })
      else if (f === 'amount-small') amountRanges.push({ min: 10000, max: 50000 })
      else if (f === 'amount-micro') amountRanges.push({ max: 10000 })
      else if (f === 'chance-high') chanceRanges.push({ min: 75, max: 100 })
      else if (f === 'chance-medium') chanceRanges.push({ min: 50, max: 74 })
      else if (f === 'chance-low') chanceRanges.push({ min: 25, max: 49 })
      else if (f === 'chance-very-low') chanceRanges.push({ min: 0, max: 24 })
    })

    if (ownerIds.length) variables.ownerEmployeeIds = ownerIds
    if (stageIds.length) variables.stageIds = stageIds
    if (pipelineIds.length) variables.pipelineIds = pipelineIds
    if (accountIds.length) variables.accountIds = accountIds
    if (statusIds.length) variables.statusIds = statusIds
    if (amountRanges.length) {
      const min = Math.min(...amountRanges.map(r => r.min ?? 0))
      const max = Math.max(...amountRanges.map(r => r.max ?? Number.MAX_SAFE_INTEGER))
      variables.forecastedProfitBetween = [min, max]
    }
    // Note: winningChance filtering not supported in current schema

    // Board view handles its own filtering - list view only uses DataContainer filters

    return variables
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, closeAfter, closeBefore])

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentOpportunities(queryVariables)
      setOpportunities(result.InvestmentOpportunity || [])
      setTotalCount(result.InvestmentOpportunityAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchInvestmentOpportunities, queryVariables])

  // Load data on mount and when variables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for process events and refresh data when investment opportunity processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        // Check for successful completion from different event structures (MATCHING ACCOUNT VIEW PATTERN)
        if (event.detail?.resolution === 'success') {
          loadData() // Refresh opportunity list data
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investmentOpportunity) {
          loadData()
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
          return
        }

        // For continue events, check if payload contains successful data
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadData()
          setBoardRefreshTrigger(prev => prev + 1) // Trigger board refresh
        }
      } catch (err) {
        console.error('Error handling process event:', err)
      }
    }

    // Listen to multiple possible event names (following Investment Account pattern exactly)
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue', // ✅ This is what our form dispatches!
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion'
    ]

    // Add event listeners
    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessEvent)
      document.addEventListener(eventName, handleProcessEvent)
    })

    // Cleanup event listeners
    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessEvent)
        document.removeEventListener(eventName, handleProcessEvent)
      })
    }
  }, [loadData])

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setCurrentPage(1) // Reset to first page on search
  }, [])

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  // Handle sorting
  const handleSort = useCallback(
    (field: string) => {
      if (sortField !== field) {
        setSortField(field)
        setSortOrder('ASC')
        return
      }
      if (sortOrder === 'ASC') {
        setSortOrder('DESC')
      } else if (sortOrder === 'DESC') {
        setSortField(undefined)
        setSortOrder(undefined)
      } else {
        setSortOrder('ASC')
      }
    },
    [sortField, sortOrder]
  )

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters)
    setCurrentPage(1)
  }, [])

  // Initialize from URL parameters (search and common filters)
  useEffect(() => {
    if (initializedFromUrl) return
    const urlParams = new URLSearchParams(window.location.search)
    const initialFilters: string[] = []
    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach(v => v && initialFilters.push(`${prefix}:${v}`))
    }
    pushAll('owner', 'owner')
    pushAll('stage', 'stage')
    pushAll('pipeline', 'pipeline')
    pushAll('account', 'account')
    pushAll('status', 'status')

    if (initialFilters.length) {
      setSelectedFilters(prev => (prev.length ? prev : initialFilters))
    }
    const search = urlParams.get('search')
    if (search) setSearchTerm(search)
    setInitializedFromUrl(true)
  }, [initializedFromUrl])

  // Sync selected filters and search to URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    const setList = (key: string, values: string[]) => {
      urlParams.delete(key)
      values.forEach(v => urlParams.append(key, v))
    }

    const collect = (prefix: string) =>
      selectedFilters.filter(f => f.startsWith(`${prefix}:`)).map(f => f.slice(prefix.length + 1))

    setList('owner', collect('owner'))
    setList('stage', collect('stage'))
    setList('pipeline', collect('pipeline'))
    setList('account', collect('account'))
    setList('status', collect('status'))

    if (searchTerm) urlParams.set('search', searchTerm)
    else urlParams.delete('search')

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [selectedFilters, searchTerm])

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // Board view handles its own filtering - handlers removed

  // Loading state
  if (isLoading && opportunities.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading opportunities: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div data-testid="investment-opportunities-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Opportunities</h1>
            <p className="gba:text-gray-600">Manage investment opportunities and pipeline stages</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <OpportunityStatistics {...context} />
      </div>

      {/* Filters moved to Board View tab */}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gba:mb-2">
          <TabsTrigger value="list" startIcon={<List />}>
            List View
          </TabsTrigger>
          <TabsTrigger value="board" startIcon={<LayoutGrid />}>
            Board View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {/* Data Container with Opportunity List */}
          <DataContainer
            dataControllerProps={{
              search: searchTerm,
              setSearch: handleSearch,
              debounceDelay: 500,
              filter: selectedFilters,
              setFilter: handleSetFilter,
              filterLabelMap,
              listTitle: (
                <div className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span>Opportunities</span>
                    <span className="gba:text-gray-500">({totalCount})</span>
                  </div>
                </div>
              ),
              columnVisibility: {
                columns: columnConfig,
                onColumnVisibilityChange: handleColumnVisibilityChange,
                'data-testid': 'investment-opportunities-column-visibility'
              },
              actions: (
                <AppAction
                  contextsArray={[FlowContextName.createInvestmentOpportunity]}
                  accessToken={accessToken}
                  data-testid="add-opportunity-action"
                  emptyStateBehavior="hide"
                >
                  <Button size="sm" variant="default" data-testid="add-opportunity-button" type="button">
                    <Plus size={16} />
                    {getTranslationFromI18nKeyAndLabel('crm:opportunity.addOpportunity', 'Add Opportunity')}
                  </Button>
                </AppAction>
              )
            }}
            dataFilterProps={{
              filterGroups,
              onFilterChange: handleFilterChange
            }}
            dataBody={
              <OpportunityList
                opportunities={opportunities}
                isLoading={isLoading}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
                visibleColumns={visibleColumns}
                {...context}
              />
            }
          />
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <OpportunityBoard {...context} refreshTrigger={boardRefreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default OpportunityView
