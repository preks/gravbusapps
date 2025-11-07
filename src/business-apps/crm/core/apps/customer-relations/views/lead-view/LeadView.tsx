import { useState, useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LeadLayout } from '@/common/components/common-relations/view-layouts/lead-layout'
import { Button } from '@newwork/nw-design-system'
import { Plus, MoreVertical } from 'lucide-react'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'
import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import {
  defaultLeadColumns,
  defaultLeadSortableColumns,
  defaultVisibleLeadColumns,
  defaultAvailableLeadColumns,
  defaultLeadFilterConfig,
  buildDynamicFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { useCustomerLeadFilters } from '@/common/data/customer/hooks/useCustomerLeadFilters'
import { LeadStatisticsLayout } from '@/common/components/common-relations/view-layouts/lead-layout/components/LeadStatisticsLayout'
import { applyLeadFilters } from '@/common/components/common-relations/view-layouts/lead-layout/utils/queryHelpers'
import { useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // State
  const [leads, setLeads] = useState<CustomerLead[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultVisibleLeadColumns)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Hooks
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics(context)
  const leadFilters = useCustomerLeadFilters(context)

  // Query Variables
  const queryVariables = useMemo(() => {
    const vars: CustomerLeadQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    applyLeadFilters(vars, selectedFilters)

    if (sorting.length > 0) {
      const columnId = sorting[0].id
      const direction = sorting[0].desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

      // Non-sortable columns
      if (columnId === 'communicationChannels' || columnId === 'location') {
        // These are computed fields - use default sort
        vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
      }
      // Build nested orderBy for catalog/employee fields
      else if (columnId === 'status') {
        vars.orderBy = [{ field: { leadStatus: { value: direction as any } }, direction } as any]
      } else if (columnId === 'rating') {
        vars.orderBy = [{ field: { leadRating: { value: direction as any } }, direction } as any]
      } else if (columnId === 'source') {
        vars.orderBy = [{ field: { leadSource: { value: direction as any } }, direction } as any]
      } else if (columnId === 'industry') {
        vars.orderBy = [{ field: { industry: { value: direction as any } }, direction } as any]
      } else if (columnId === 'ownerEmployee') {
        vars.orderBy = [{ field: { ownerEmployee: { displayName: direction as any } }, direction } as any]
      } else if (columnId === 'lead') {
        vars.orderBy = [
          { field: 'firstName', direction },
          { field: 'lastName', direction }
        ]
      } else {
        // Scalar fields
        vars.orderBy = [{ field: columnId as any, direction }]
      }
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting])

  // Load Data - Stabilized: queryVariables as parameter, not dependency
  const loadData = useCallback(
    async (variables: CustomerLeadQueryVariables, showLoading = true) => {
      if (!accessToken) {
        return
      }

      if (showLoading) {
        setIsLoading(true)
      }
      setError(null)

      try {
        const result = await fetchCustomerLeads(variables)
        setLeads((result.leads as any) || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
      } finally {
        if (showLoading) {
          setIsLoading(false)
        }
        setIsInitialLoad(false)
      }
    },
    [accessToken, fetchCustomerLeads]
  )

  // Initial load - Only runs once when accessToken is available and isInitialLoad is true
  useEffect(() => {
    if (!accessToken || !isInitialLoad) {
      return
    }

    loadData(queryVariables, true)
  }, [accessToken, isInitialLoad, loadData, queryVariables])

  // Reload data without loading state when filters/search/pagination/sorting change
  // Only runs after initial load is complete (isInitialLoad === false)
  useEffect(() => {
    if (isInitialLoad || !accessToken) {
      return
    }

    loadData(queryVariables, false)
  }, [queryVariables, loadData, accessToken, isInitialLoad])

  // Process completion
  const handleProcessComplete = useCallback(() => {
    if (!accessToken) return
    loadData(queryVariables, false)
  }, [accessToken, loadData, queryVariables])

  useProcessCompletion({ onSuccess: handleProcessComplete })

  useEffect(() => {
    const events = ['taskCompletion', 'leadCompletion']
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

  const handleFilterUpdate = useCallback((filters: Record<string, any>) => {
    setSelectedFilters(filters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleRowClick = useCallback((lead: CustomerLead) => {
    const url = buildPlatformUrl('/platform/crm/lead-record', {
      leadId: lead.id
    })
    navigateTo(url)
  }, [])

  // Columns
  const columns = useMemo(() => defaultLeadColumns() as any, [])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CustomerLead }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.customerLeadEntity]}
        externalContextData={{ leadId: row.original.id }}
        prefixDataTestId="lead-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
      >
        <Button
          variant="ghost"
          size="icon"
          data-testid={`lead-actions-${row.original.id}`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <MoreVertical className="gba:h-4 gba:w-4" />
        </Button>
      </AppActionMenu>
    ),
    [accessToken]
  )

  // Filter Config - Dynamic with filter options
  const filterConfig = useMemo(() => {
    return buildDynamicFilterConfig(defaultLeadFilterConfig, {
      owners: leadFilters.owners,
      statuses: leadFilters.statuses,
      ratings: leadFilters.ratings,
      sources: leadFilters.sources,
      salutations: [], // TODO: Add salutations to useCustomerLeadFilters if needed
      industries: [] // TODO: Add industries to useCustomerLeadFilters if needed
    })
  }, [leadFilters.owners, leadFilters.statuses, leadFilters.ratings, leadFilters.sources])

  // Statistics
  const renderStatistics = useCallback(
    () => <LeadStatisticsLayout statistics={leadStatistics} data-testid="customer-lead-statistics" />,
    [leadStatistics]
  )

  // Primary Action
  const primaryAction = useMemo(
    () => (
      <AppAction
        contextsArray={[FlowContextName.customerLeadCreate]}
        accessToken={accessToken}
        data-testid="add-lead-action"
        emptyStateBehavior="hide"
      >
        <Button size="sm" variant="default" data-testid="add-lead-button" type="button">
          <Plus className="gba:h-4 gba:w-4" />
          Add Lead
        </Button>
      </AppAction>
    ),
    [accessToken]
  )

  return (
    <LeadLayout<CustomerLead>
      leads={leads}
      totalCount={totalCount}
      loading={isLoading}
      error={error}
      columns={columns}
      visibleColumns={visibleColumns}
      availableColumns={defaultAvailableLeadColumns}
      onVisibleColumnsChange={setVisibleColumns}
      searchTerm={searchTerm}
      onSearchChange={handleSearch}
      filterConfig={filterConfig}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterUpdate}
      sorting={sorting}
      onSortingChange={setSorting}
      sortableColumns={defaultLeadSortableColumns}
      pagination={pagination}
      onPaginationChange={setPagination}
      onRowClick={handleRowClick}
      renderRowActions={renderRowActions}
      renderStatistics={renderStatistics}
      primaryAction={primaryAction}
      dataTestId="customer-lead-view"
    />
  )
}

export default LeadView
