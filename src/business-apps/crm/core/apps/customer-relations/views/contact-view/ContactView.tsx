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
  defaultContactFilterConfig
} from '@/common/components/common-relations/view-layouts/contact-layout/config'
import { useCustomerContacts } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerContactQueryVariables } from '@/common/data/customer/queries/customerContactQueries'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import { ContactStatisticsWithTrend } from './components/ContactStatistics'
import { useContactStatisticsWithTrend as useCustomerContactStatistics } from '@/common/data/customer/hooks/useCustomerContactStatistics'
import { applyBasicFilters, applyDateFilter } from './utils/customerContactQueryHelpers'

export type ContactViewProps = BusinessAppContextProps

/**
 * Get sorting configuration for Customer Contacts
 * Handles nested sorting for catalog entries and relations
 */
const getSortingConfig = (columnId: string, descending: boolean) => {
  const direction = descending ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

  const sortMapping: Record<string, any> = {
    // Direct fields
    contact: [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ],
    firstName: [{ field: 'firstName', direction }],
    lastName: [{ field: 'lastName', direction }],
    fullName: [{ field: 'fullName', direction }],
    department: [{ field: 'department', direction }],
    jobPosition: [{ field: 'jobPosition', direction }],
    createdAt: [{ field: 'createdAt', direction }],
    updatedAt: [{ field: 'updatedAt', direction }],

    // Owner Employee - sort by displayName
    ownerEmployee: [
      {
        field: { ownerEmployee: { displayName: direction } } as any,
        direction
      }
    ]
  }

  return sortMapping[columnId] || null
}

export const ContactView: React.FC<ContactViewProps> = context => {
  const { accessToken } = context

  // Data Hooks
  const { fetchCustomerContacts } = useCustomerContacts(context)
  const contactStatistics = useCustomerContactStatistics({ ...context, sourceApp: 'CRM' })

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

  // Filter Configuration: Use static config (TODO: implement dynamic filters)
  const filterConfig = useMemo(() => {
    return defaultContactFilterConfig
  }, [])

  // Query Variables
  const queryVariables = useMemo(() => {
    const vars: CustomerContactQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    applyBasicFilters(vars, selectedFilters)
    applyDateFilter(vars, selectedFilters)

    if (sorting.length > 0) {
      const sortConfig = getSortingConfig(sorting[0].id, sorting[0].desc)

      console.log('=== [SORTING DEBUG] ===', {
        columnId: sorting[0].id,
        sortConfig,
        direction: sorting[0].desc ? 'DESC' : 'ASC'
      })

      if (sortConfig) {
        vars.orderBy = sortConfig
      }
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    console.log('=== [QUERY VARIABLES DEBUG] ===', vars)

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting])

  // Load Data
  const loadData = useCallback(
    async (showLoading: boolean = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchCustomerContacts(queryVariables)

        console.log('=== [CONTACTS LOADED DEBUG] ===', {
          totalContacts: result.contacts?.length || 0,
          totalCount: result.total || 0,
          firstContact: result.contacts?.[0],
          firstContactCommunicationChannels: result.contacts?.[0]?.communicationChannels,
          firstContactAccountContacts: result.contacts?.[0]?.accountContacts
        })

        setContacts(result.contacts || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        console.error('=== [LOAD ERROR] ===', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
        setIsInitialLoad(false)
      }
    },
    [accessToken, fetchCustomerContacts, queryVariables]
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
    const url = buildPlatformUrl('/platform/crm/contact-record', { contactId: contact.id })
    navigateTo(url)
  }, [])

  const handleRefresh = useCallback(() => {
    loadData(false)
  }, [loadData])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CommonContact }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.customerContactEntity]}
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

  // Statistics
  const renderStatistics = useCallback(() => {
    if (!contactStatistics.trendData) return null
    return (
      <ContactStatisticsWithTrend
        trendData={contactStatistics.trendData}
        isLoading={contactStatistics.isLoading}
        error={contactStatistics.error}
        onRetry={handleRefresh}
      />
    )
  }, [contactStatistics, handleRefresh])

  // Primary Action (Add Button)
  const primaryAction = useMemo(
    () => (
      <AppAction
        data-testid="contact-create-button"
        contextsArray={[FlowContextName.customerContactCreate]}
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
      renderStatistics={renderStatistics}
      primaryAction={primaryAction}
      dataTestId="customer-contact-view"
    />
  )
}

export default ContactView
