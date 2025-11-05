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
  createLeadColumnToGraphQLMapping
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { defaultLeadFilterConfig } from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { LeadStatisticsLayout } from '@/common/components/common-relations/view-layouts/lead-layout/components/LeadStatisticsLayout'
import { applyLeadFilters } from '@/common/components/common-relations/view-layouts/lead-layout/utils/queryHelpers'
import { useLeadStatisticsWithTrend as useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'

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

  // Hooks
  const { fetchCustomerLeads } = useCustomerLeads(context)
  const leadStatistics = useCustomerLeadStatistics({ ...context, sourceApp: 'CRM' })

  // Column to GraphQL mapping (CRM overrides)
  const mapColumnToGraphQLField = useMemo(
    () =>
      createLeadColumnToGraphQLMapping({
        status: 'leadStatus.value',
        rating: 'leadRating.value',
        source: 'leadSource.value',
        industry: 'industry.value' // CRM uses 'industry' not 'industryClass'
      }),
    []
  )

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
      if (columnId === 'contactInfo' || columnId === 'location') {
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
  }, [pagination, searchTerm, selectedFilters, sorting, mapColumnToGraphQLField])

  // Load Data
  const loadData = useCallback(
    async (showLoading = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchCustomerLeads(queryVariables)
        setLeads((result.leads as any) || [])
        setTotalCount(result.total || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      } finally {
        if (showLoading) setIsLoading(false)
      }
    },
    [accessToken, fetchCustomerLeads, queryVariables]
  )

  // Initial load
  useEffect(() => {
    if (accessToken) {
      loadData(true)
    }
  }, [accessToken, loadData])

  // Reload data without loading state when filters/search/pagination/sorting change
  useEffect(() => {
    if (accessToken) {
      loadData(false)
    }
  }, [queryVariables, accessToken, loadData])

  // Process completion
  const handleProcessComplete = useCallback(() => {
    loadData(false)
  }, [loadData])

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

  // Filter Config
  const filterConfig = useMemo(() => defaultLeadFilterConfig, [])

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
