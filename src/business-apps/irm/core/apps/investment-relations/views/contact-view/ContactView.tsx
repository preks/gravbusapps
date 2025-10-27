import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Button, Spinner, Alert } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import type { InvestmentContact } from '@/common/data/investment/types'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import { DataContainer } from '@/components/layout/dataContainer/DataContainer'
import { ContactStatistics } from './components/ContactStatistics'
import { ContactList } from './components/ContactList'
import { ColumnConfig } from '@/components/dataController'
import { useInvestmentContactFilters } from './hooks/useInvestmentContactFilters'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Read initial filters/search from URL (before first render)
  const getInitialFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const filters: string[] = []
    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach(v => v && filters.push(`${prefix}:${v}`))
    }
    pushAll('contactType', 'type')
    pushAll('owner', 'owner')
    pushAll('account', 'account')
    pushAll('department', 'department')
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
  const { filterGroups, filterLabelMap, handleFilterChange, birthDateAfter, birthDateBefore, filtersInitialized } =
    useInvestmentContactFilters(context, selectedFilters, setSelectedFilters)

  // Hooks for data fetching
  const { fetchInvestmentContacts } = useGetInvestmentContacts(context)

  // Data state
  const [contacts, setContacts] = useState<InvestmentContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'contact', label: 'Contact', visible: true },
    { id: 'contactInfo', label: 'Contact Info', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'position', label: 'Position', visible: true },
    { id: 'department', label: 'Department', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Creation Date', visible: true }
  ])

  // Get visible columns for passing to table
  const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id)

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  // Build query variables
  const queryVariables: InvestmentContactQueryVariables = useMemo(() => {
    const vars: Partial<InvestmentContactQueryVariables> = {}
    const ownerIds: string[] = []
    const accountIds: string[] = []
    const fullNames: string[] = []
    const typeVals: string[] = []
    const departmentVals: string[] = []
    let hasEmail = false,
      missingEmail = false,
      hasPhone = false,
      missingPhone = false

    selectedFilters.forEach(f => {
      if (f.startsWith('owner:')) ownerIds.push(f.slice(6))
      else if (f.startsWith('contact:')) fullNames.push(f.slice(8))
      else if (f.startsWith('account:')) accountIds.push(f.slice(8))
      else if (f.startsWith('type:')) typeVals.push(f.slice(5))
      else if (f.startsWith('department:')) departmentVals.push(f.slice(11))
      else if (f === 'info:HAS_EMAIL') hasEmail = true
      else if (f === 'info:MISSING_EMAIL') missingEmail = true
      else if (f === 'info:HAS_PHONE') hasPhone = true
      else if (f === 'info:MISSING_PHONE') missingPhone = true
    })

    if (ownerIds.length) vars.ownerEmployeeIds = ownerIds
    if (accountIds.length) vars.accountIds = accountIds
    if (fullNames.length) vars.fullNames = fullNames
    if (typeVals.length) vars.contactTypes = typeVals
    if (departmentVals.length) vars.departments = departmentVals

    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      ...(sortField && sortOrder
        ? {
            orderBy: [
              { field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }
            ] as any
          }
        : {}),
      ...(birthDateAfter ? { birthDateFrom: birthDateAfter } : {}),
      ...(birthDateBefore ? { birthDateTo: birthDateBefore } : {}),
      ...(hasEmail ? { hasEmail: true } : {}),
      ...(missingEmail ? { missingEmail: true } : {}),
      ...(hasPhone ? { hasPhone: true } : {}),
      ...(missingPhone ? { missingPhone: true } : {}),
      ...vars
    }
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, birthDateAfter, birthDateBefore])

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken || !filtersInitialized) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentContacts(queryVariables)
      setContacts(result.InvestmentContact || [])
      setTotalCount(result.InvestmentContactAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, filtersInitialized, fetchInvestmentContacts, queryVariables])

  // Load data on mount and when variables change
  useEffect(() => {
    loadData()
  }, [loadData])

  // Listen for process events and refresh data when investment contact processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        // Check for successful completion from different event structures (MATCHING ACCOUNT VIEW PATTERN)
        if (event.detail?.resolution === 'success') {
          loadData() // Refresh contact list data
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investmentContact) {
          loadData()
          return
        }

        // For continue events, check if payload contains successful data
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadData()
        }
      } catch (err) {
        // Log process event handling errors with context
        console.error('ContactView: Error handling process event:', {
          eventType: event?.type || 'unknown',
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        })
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
    setList('contact', collect('contact'))
    setList('account', collect('account'))
    setList('type', collect('type'))
    setList('department', collect('department'))

    if (searchTerm) urlParams.set('search', searchTerm)
    else urlParams.delete('search')

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [selectedFilters, searchTerm])

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // Loading state
  if (isLoading && contacts.length === 0) {
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
          <span>Error loading contacts: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div data-testid="investment-contacts-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Contacts</h1>
            <p className="gba:text-gray-600">Manage investment client contacts and relationships</p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <ContactStatistics {...context} />
      </div>

      {/* Data Container with Contact List */}
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
                <span>Contacts</span>
                <span className="gba:flex gba:items-center gba:gap-2">
                  <span className="gba:text-gray-500">({totalCount})</span>
                </span>
              </div>
            </div>
          ),
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'investment-contacts-column-visibility'
          },
          actions: (
            <AppAction
              contextsArray={[FlowContextName.investmentCreateContact]}
              accessToken={accessToken}
              data-testid="add-contact-action"
              emptyStateBehavior="hide"
            >
              <Button size="sm" variant="default" data-testid="add-contact-button" type="button">
                <Plus size={16} />
                {getTranslationFromI18nKeyAndLabel('crm:contact.addContact', 'Add Contact')}
              </Button>
            </AppAction>
          )
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange
        }}
        dataBody={
          <ContactList
            contacts={contacts}
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
    </div>
  )
}

export default ContactView
