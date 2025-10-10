import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, Alert } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentLeads } from '@/common/data/investment/hooks/useInvestmentLeads'
import type { InvestmentLead } from '@/common/data/investment/types'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { LeadStatistics } from './components/LeadStatistics'
import { LeadList } from './components/LeadList'
import { ColumnConfig } from '@/components/dataController'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentLeadFilters } from './hooks/useInvestmentLeadFilters'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface LeadViewProps extends BusinessAppContextProps {}

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // Read initial filters/search from URL synchronously
  const getInitialFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const filters: string[] = []
    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach(v => v && filters.push(`${prefix}:${v}`))
    }
    pushAll('leadStatus', 'status')
    pushAll('leadRating', 'rating')
    pushAll('leadSource', 'source')
    pushAll('owner', 'owner')
    pushAll('country', 'country')
    pushAll('region', 'region')
    pushAll('city', 'city')
    pushAll('company', 'company')
    pushAll('contact', 'contact')
    const search = urlParams.get('search') || ''
    return { search, filters }
  }
  const initial = getInitialFromUrl()

  // State management
  const [searchTerm, setSearchTerm] = useState(initial.search)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)
  type SortOrder = 'ASC' | 'DESC' | undefined
  const [sortField, setSortField] = useState<string | undefined>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC')
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initial.filters)
  // const [showDataFilter, setShowDataFilter] = useState(false);

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'lead', label: 'Lead', visible: true },
    { id: 'contact', label: 'Contact Info', visible: true },
    { id: 'address', label: 'Address', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'rating', label: 'Rating', visible: true },
    { id: 'source', label: 'Source', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Creation Date', visible: true }
  ])

  // Get visible columns for passing to table
  const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id)

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  const { filterGroups, filterLabelMap, handleFilterChange, createdAfter, createdBefore } = useInvestmentLeadFilters(
    context,
    selectedFilters,
    setSelectedFilters
  )

  // Hooks for data fetching
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context)

  // Data state
  const [leads, setLeads] = useState<InvestmentLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Lead statistics refresh function (will be defined by LeadStatistics component)
  const [refreshStats, setRefreshStats] = useState<(() => void) | null>(null)

  // Build query variables
  const queryVariables: InvestmentLeadQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentLeadQueryVariables> = {}
    const statusIds: string[] = []
    const statusCodes: string[] = []
    const ownerIds: string[] = []
    const ratingIds: string[] = []
    const sourceIds: string[] = []
    const countryIds: string[] = []
    const companyNames: string[] = []
    const regions: string[] = []
    const localities: string[] = []
    const contactFullNames: string[] = []
    let sensitive: boolean | undefined = undefined
    selectedFilters.forEach(f => {
      if (f.startsWith('status:')) {
        const val = f.slice(7)
        if (val.includes(':')) statusCodes.push(val)
        else statusIds.push(val)
      } else if (f.startsWith('owner:')) ownerIds.push(f.slice(6))
      else if (f.startsWith('rating:')) ratingIds.push(f.slice(7))
      else if (f.startsWith('source:')) sourceIds.push(f.slice(7))
      else if (f.startsWith('country:')) countryIds.push(f.slice(8))
      else if (f.startsWith('company:')) companyNames.push(f.slice(8))
      else if (f.startsWith('region:')) regions.push(f.slice(7))
      else if (f.startsWith('city:')) localities.push(f.slice(5))
      else if (f.startsWith('contact:')) contactFullNames.push(f.slice(8))
      else if (f === 'sensitive:true') sensitive = true
      else if (f === 'sensitive:false') sensitive = false
    })
    if (statusIds.length) filterVars.leadStatusIds = statusIds
    if (statusCodes.length) {
      const normalized = statusCodes.map(c => {
        const parts = String(c).split(':')
        return parts.length ? parts[parts.length - 1] : String(c)
      })
      ;(filterVars as any).leadStatusCodes = normalized
    }
    if (ownerIds.length) filterVars.ownerEmployeeIds = ownerIds
    if (ratingIds.length) (filterVars as any).leadRatingIds = ratingIds
    if (sourceIds.length) (filterVars as any).leadSourceIds = sourceIds
    if (countryIds.length) (filterVars as any).countryIds = countryIds
    if (companyNames.length) (filterVars as any).companyNames = companyNames
    if (regions.length) (filterVars as any).regions = regions
    if (localities.length) (filterVars as any).localities = localities
    if (contactFullNames.length) (filterVars as any).contactFullNames = contactFullNames
    if (typeof sensitive === 'boolean') filterVars.sensitive = sensitive
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      ...(sortField && sortOrder
        ? {
            orderBy: (sortField === 'leadCombined'
              ? [
                  { field: 'firstName', direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' },
                  { field: 'lastName', direction: 'ASC_NULLS_LAST' },
                  { field: 'companyName', direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }
                ]
              : [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]) as any
          }
        : {}),
      ...(createdAfter ? { createdAtFrom: createdAfter } : {}),
      ...(createdBefore ? { createdAtTo: createdBefore } : {}),
      ...filterVars
    }
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, createdAfter, createdBefore])

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentLeads(queryVariables)
      setLeads(result.InvestmentLead || [])
      setTotalCount(result.InvestmentLeadAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchInvestmentLeads, queryVariables])

  // Load data on mount and when variables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for process events and refresh data when investment lead processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        // Check for successful completion from different event structures
        if (event.detail?.resolution === 'success') {
          loadData() // Refresh lead list data
          if (refreshStats) {
            refreshStats() // Also refresh statistics if available
          }
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investmentLead) {
          loadData()
          if (refreshStats) {
            refreshStats()
          }
          return
        }

        // For continue events, check if payload contains successful data
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadData()
          if (refreshStats) {
            refreshStats()
          }
        }
      } catch (err) {
        // Log process event handling errors with context
        console.error('LeadView: Error handling process event:', {
          eventType: event?.type || 'unknown',
          eventDetail: event?.detail,
          error: err instanceof Error ? err.message : err,
          stack: err instanceof Error ? err.stack : undefined
        })
      }
    }

    // Listen to multiple possible event names (following Investment Record pattern)
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

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessEvent as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessEvent as EventListener)
      })
    }
  }, [loadData, refreshStats])

  // (Initial values already applied above)

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

  // Sync selected filters and search to URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)

    const setList = (key: string, values: string[]) => {
      urlParams.delete(key)
      values.forEach(v => urlParams.append(key, v))
    }

    const collect = (prefix: string) =>
      selectedFilters.filter(f => f.startsWith(`${prefix}:`)).map(f => f.slice(prefix.length + 1))

    setList('leadStatus', collect('status'))
    setList('leadRating', collect('rating'))
    setList('leadSource', collect('source'))
    setList('owner', collect('owner'))
    setList('country', collect('country'))
    setList('region', collect('region'))
    setList('city', collect('city'))
    setList('company', collect('company'))
    setList('contact', collect('contact'))

    if (searchTerm) urlParams.set('search', searchTerm)
    else urlParams.delete('search')

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [selectedFilters, searchTerm])

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // No full-screen spinner to avoid big refresh on search clear

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading leads: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div data-testid="investment-leads-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Leads</h1>
            <p className="gba:text-gray-600">Manage investment lead generation and qualification</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <LeadStatistics {...context} onRefreshReady={setRefreshStats} />
      </div>

      {/* Data Container with Lead List */}
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: 'Leads',
          listAmount: totalCount,
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'investment-leads-column-visibility'
          },
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentLead]}
              accessToken={accessToken}
              data-testid="add-lead-action-wrapper"
              emptyStateBehavior="hide"
            >
              <Button
                size="sm"
                variant="default"
                data-testid="add-lead-button"
                type="button"
                style={{ gap: 'var(--nw-spacing-xs)' }}
              >
                <Plus style={{ width: 'var(--nw-icon-size-sm)', height: 'var(--nw-icon-size-sm)' }} />
                {getTranslationFromI18nKeyAndLabel('crm:lead.addLead', 'Add Lead')}
              </Button>
            </AppAction>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <LeadList
            leads={leads}
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            isLoading={isLoading}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortField={sortField || 'createdAt'}
            sortOrder={sortOrder || 'ASC'}
            onClearFilters={() => setSelectedFilters([])}
            visibleColumns={visibleColumns}
            {...context}
          />
        }
      />
    </div>
  )
}

export default LeadView
