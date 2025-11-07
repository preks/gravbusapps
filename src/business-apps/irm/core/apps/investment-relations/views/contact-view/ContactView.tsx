import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@newwork/nw-design-system'
import type { ColumnDef } from '@tanstack/react-table'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ContactLayout } from '@/common/components/common-relations/view-layouts/contact-layout'
import type { CommonContact } from '@/common/data/relations/types/commonContactTypes'
import {
  defaultContactColumns,
  defaultContactSortableColumns,
  defaultVisibleContactColumns,
  defaultAvailableContactColumns,
  defaultContactFilterConfig,
  buildDynamicFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useInvestmentContacts } from '@/common/data/investment/hooks/useInvestmentContacts'
import { useInvestmentContactStatistics } from '@/common/data/investment/hooks/useInvestmentContactStatistics'
import { useContactFilterOptions } from './hooks/useContactFilterOptions'
import type { InvestmentContactQueryVariables } from '@/common/data/investment/queries/investmentContactQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import type { ContactStatisticsData } from '@/common/components/common-relations/view-layouts/contact-layout/components/ContactStatisticsLayout'

export type ContactViewProps = BusinessAppContextProps

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchInvestmentContacts } = useInvestmentContacts(context)
  const contactStatistics = useInvestmentContactStatistics(context)

  // View State
  const [contacts, setContacts] = useState<CommonContact[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Filter State
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})

  // Table State
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleContactColumns)

  // Columns: Use default columns
  const columns = useMemo<ColumnDef<CommonContact>[]>(() => {
    return defaultContactColumns()
  }, [])

  // Filter Configuration - Dynamic with filter options
  const contactFilters = useContactFilterOptions(context)
  const filterConfig = useMemo(() => {
    return buildDynamicFilterConfig(defaultContactFilterConfig, {
      owners: contactFilters.owners,
      departments: [], // TODO: Add departments to useContactFilterOptions if needed
      jobPositions: [], // TODO: Add jobPositions to useContactFilterOptions if needed
      academicTitles: [], // TODO: Add academicTitles to useContactFilterOptions if needed
      salutations: [], // TODO: Add salutations to useContactFilterOptions if needed
      languages: [] // TODO: Add languages to useContactFilterOptions if needed
    })
  }, [contactFilters.owners])

  // Query Variables
  const queryVariables = useMemo(() => {
    const vars: InvestmentContactQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    // Apply basic filters
    if (selectedFilters.ownerEmployeeIds?.length) {
      vars.ownerEmployeeIds = selectedFilters.ownerEmployeeIds
    }
    if (selectedFilters.academicTitleIds?.length) {
      vars.academicTitleIds = selectedFilters.academicTitleIds
    }
    if (selectedFilters.salutationIds?.length) {
      vars.salutationIds = selectedFilters.salutationIds
    }
    if (selectedFilters.languageIds?.length) {
      vars.languageIds = selectedFilters.languageIds
    }
    if (selectedFilters.accountIds?.length) {
      vars.accountIds = selectedFilters.accountIds
    }
    if (selectedFilters.departments?.length) {
      vars.departments = selectedFilters.departments
    }

    // Apply date filters
    if (selectedFilters.createdAtFrom) {
      vars.createdAtFrom = selectedFilters.createdAtFrom
    }
    if (selectedFilters.createdAtTo) {
      vars.createdAtTo = selectedFilters.createdAtTo
    }

    // Apply sorting
    if (sorting.length > 0) {
      const columnId = sorting[0].id
      const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

      // Handle composite columns that need multiple sort fields
      if (columnId === 'contact') {
        // Sort by firstName, then lastName
        vars.orderBy = [
          { field: 'firstName', direction },
          { field: 'lastName', direction }
        ]
      } else {
        // Use descriptor-based sorting (handles nested paths like account.name, ownerEmployee.displayName)
        // The buildOrderBy function in queryHelpers will use INVESTMENT_CONTACT_DESCRIPTORS to resolve the correct GraphQL path
        vars.orderBy = [{ field: columnId as any, direction }]
      }
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting])

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchInvestmentContacts(queryVariables)

        console.log('=== [IRM CONTACTS LOADED DEBUG] ===', {
          totalContacts: result.contacts?.length || 0,
          totalCount: result.total || 0,
          firstContact: result.contacts?.[0],
          firstContactCommunicationChannels: result.contacts?.[0]?.communicationChannels,
          firstContactAccountContacts: result.contacts?.[0]?.accountContacts,
          firstContactInvestmentAccountContact: result.contacts?.[0]?.investmentAccountContact
        })

        setContacts(result.contacts || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        console.error('=== [IRM LOAD ERROR] ===', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, fetchInvestmentContacts, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (!accessToken || !isInitialLoad) return
    loadData(true)
  }, [accessToken, isInitialLoad, loadData])

  // Reload data when filters/search/sort change (skip initial load)
  useEffect(() => {
    if (isInitialLoad || !accessToken) return
    loadData(false)
  }, [queryVariables, isInitialLoad, accessToken, loadData])

  // Process Completion Handlers
  const handleProcessComplete = useCallback(() => {
    loadData(false)
  }, [loadData])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  useEffect(() => {
    const events = ['taskCompletion', 'contactCompletion']
    const handlers = events.map(eventName => {
      const handler = () => handleProcessComplete()
      globalThis.addEventListener(eventName, handler)
      return { eventName, handler }
    })

    return () => {
      for (const { eventName, handler } of handlers) {
        globalThis.removeEventListener(eventName, handler)
      }
    }
  }, [handleProcessComplete])

  // Event Handlers
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleFilterChange = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback((contact: CommonContact) => {
    if (!contact.id) return
    const url = buildPlatformUrl('/platform/irm/contact-record', { contactId: contact.id })
    navigateTo(url)
  }, [])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CommonContact }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.investmentContactEntity]}
        externalContextData={{ contactId: row.original.id }}
        prefixDataTestId="contact-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Button variant="ghost" size="icon" data-testid={`contact-actions-${row.original.id}`}>
          <svg className="gba:h-4 gba:w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
          </svg>
        </Button>
      </AppActionMenu>
    ),
    [accessToken]
  )

  // Statistics - Transform hook data to ContactStatisticsData format
  const contactStatisticsData: ContactStatisticsData | undefined = useMemo(() => {
    if (!contactStatistics.trendData) return undefined
    return {
      recentContacts: contactStatistics.trendData.recentContacts,
      activeContacts: contactStatistics.trendData.activeContacts,
      emailEngagements: contactStatistics.trendData.emailEngagements,
      contactsThisYear: contactStatistics.trendData.contactsThisYear,
      isLoading: contactStatistics.isLoading,
      error: contactStatistics.error,
      refetch: contactStatistics.refetch
    }
  }, [contactStatistics])

  // Primary Action (Add Button)
  const primaryAction = useMemo(
    () => (
      <AppAction
        data-testid="contact-create-button"
        contextsArray={[FlowContextName.investmentContactCreate]}
        prefixDataTestId="contact-create"
        accessToken={accessToken}
        emptyStateBehavior="enable"
      >
        <Button>Add Contact</Button>
      </AppAction>
    ),
    [accessToken]
  )

  return (
    <ContactLayout
      contacts={contacts}
      totalCount={totalCount}
      loading={isLoading}
      error={error}
      columns={columns}
      visibleColumns={visibleColumns}
      availableColumns={defaultAvailableContactColumns}
      onVisibleColumnsChange={setVisibleColumns}
      searchTerm={searchTerm}
      onSearchChange={handleSearch}
      filterConfig={filterConfig}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterChange}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={defaultContactSortableColumns}
      pagination={pagination}
      onPaginationChange={setPagination}
      onRowClick={handleRowClick}
      renderRowActions={renderRowActions}
      contactStatistics={contactStatisticsData}
      primaryAction={primaryAction}
      dataTestId="investment-contact-view"
    />
  )
}

export default ContactView
