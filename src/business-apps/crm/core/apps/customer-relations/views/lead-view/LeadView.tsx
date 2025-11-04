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
import type { CommonLead } from '@/common/data/relations/types/commonLeadTypes'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import { useCustomerLeads } from '@/common/data/customer/hooks/useCustomerLeads'
import {
  defaultLeadColumns,
  defaultLeadSortableColumns,
  defaultVisibleLeadColumns,
  defaultAvailableLeadColumns,
  defaultLeadFilterConfig
} from '@/common/components/common-relations/view-layouts/lead-layout/config'
import { LeadStatisticsWithTrend } from './components/LeadStatistics'
import { useLeadStatisticsWithTrend as useCustomerLeadStatistics } from '@/common/data/customer/hooks/useCustomerLeadStatistics'
import { applyBasicFilters, applyDateFilter } from './utils/customerLeadQueryHelpers'

export type LeadViewProps = BusinessAppContextProps

/**
 * Get sorting configuration for Customer Leads
 * Handles nested sorting for catalog entries and relations
 */
const getSortingConfig = (columnId: string, descending: boolean) => {
  const direction = descending ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'

  const sortMapping: Record<string, any> = {
    // Direct fields
    lead: [
      { field: 'firstName', direction },
      { field: 'lastName', direction }
    ],
    firstName: [{ field: 'firstName', direction }],
    lastName: [{ field: 'lastName', direction }],
    fullName: [{ field: 'fullName', direction }],
    companyName: [{ field: 'companyName', direction }],
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

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // State
  const [leads, setLeads] = useState<CommonLead[]>([])
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

  // Query Variables
  const queryVariables = useMemo(() => {
    const vars: CustomerLeadQueryVariables = {
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      search: searchTerm.trim() || undefined
    }

    applyBasicFilters(vars, selectedFilters)
    applyDateFilter(vars, selectedFilters)

    if (sorting.length > 0) {
      const sortConfig = getSortingConfig(sorting[0].id, sorting[0].desc)

      if (sortConfig) {
        vars.orderBy = sortConfig
      }
    } else {
      vars.orderBy = [{ field: 'createdAt' as any, direction: 'DESC_NULLS_LAST' }]
    }

    return vars
  }, [pagination, searchTerm, selectedFilters, sorting])

  // Load Data
  const loadData = useCallback(
    async (showLoading = true) => {
      if (!accessToken) return

      if (showLoading) setIsLoading(true)
      setError(null)

      try {
        const result = await fetchCustomerLeads(queryVariables)
        setLeads(result.leads || [])
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
  }, [accessToken, queryVariables, loadData])

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

  const handleRowClick = useCallback((lead: CommonLead) => {
    const url = buildPlatformUrl('/platform/crm/lead-record', {
      leadId: lead.id
    })
    navigateTo(url)
  }, [])

  // Columns
  const columns = useMemo(() => defaultLeadColumns(), [])

  // Row Actions
  const renderRowActions = useCallback(
    (row: { original: CommonLead }) => (
      <AppActionMenu
        contextsArray={[FlowContextName.customerLeadEntity]}
        externalContextData={{ leadId: row.original.id }}
        prefixDataTestId="lead-actions"
        accessToken={accessToken}
        emptyStateBehavior="enable"
        deferMainContextRequestsUntilClick
        onClick={e => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" data-testid={`lead-actions-${row.original.id}`}>
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
    () =>
      leadStatistics.trendData ? (
        <LeadStatisticsWithTrend
          trendData={leadStatistics.trendData}
          mostCommonLeadSource="N/A"
          isLoading={leadStatistics.isLoading}
          error={leadStatistics.error}
          onRetry={() => loadData(false)}
        />
      ) : null,
    [leadStatistics, loadData]
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
    <LeadLayout
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
