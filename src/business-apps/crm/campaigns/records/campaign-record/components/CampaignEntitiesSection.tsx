import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { DataDisplay, DataTable } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCampaignEntities } from '../hooks/useCampaignEntities'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { createCampaignEntityColumns, createCampaignEntitySortableColumns } from '../config/campaignEntityColumns'
import { campaignEntityFilterConfig } from '../config/campaignEntityFilters'
import { CampaignEntity } from '../types/CampaignRecordTypes'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

export interface CampaignEntitiesSectionProps extends BusinessAppContextProps {
  campaignId: string
}

/**
 * Entity row actions component (matching Campaign Management pattern)
 * Extracted to improve performance and testability
 */
interface EntityRowActionsProps {
  entity: CampaignEntity
  accessToken: string
}

const EntityRowActions: React.FC<EntityRowActionsProps> = ({ entity, accessToken }) => {
  // Get the appropriate context based on entity type
  const getFlowContext = (): FlowContextName[] => {
    switch (entity.type) {
      case 'lead':
        return [FlowContextName.customerLeadEntity]
      case 'account':
        return [FlowContextName.customerAccountEntity]
      case 'contact':
        return [FlowContextName.customerContactEntity]
      case 'opportunity':
        return [FlowContextName.customerOpportunityEntity]
      default:
        return []
    }
  }

  // Get external context data based on entity type
  const getExternalContextData = () => {
    switch (entity.type) {
      case 'lead':
        return { leadId: entity.id }
      case 'account':
        return { accountId: entity.id }
      case 'contact':
        return { contactId: entity.id }
      case 'opportunity':
        return { opportunityId: entity.id }
      default:
        return { entityId: entity.id }
    }
  }
  return (
    <AppAction
      variant="table-row"
      contexts={getFlowContext().map(context => ({
        context,
        contextData: getExternalContextData()
      }))}
      prefixDataTestId={`entity-actions-${entity.type}`}
      accessToken={accessToken}
      emptyState="enable"
      data-testid={`entity-actions-${entity.id}`}
    />
  )
}

/**
 * Filter predicate: Check if entity matches type filter
 */
const matchesTypeFilter = (entity: CampaignEntity, typeFilter: string[] | undefined): boolean => {
  if (!typeFilter || typeFilter.length === 0) {
    return true
  }
  return typeFilter.includes(entity.type)
}

/**
 * Filter predicate: Check if entity matches status filter
 */
const matchesStatusFilter = (entity: CampaignEntity, statusFilter: string[] | undefined): boolean => {
  if (!statusFilter || statusFilter.length === 0) {
    return true
  }

  // Only apply status filter to leads and opportunities
  if (entity.type === 'lead' || entity.type === 'opportunity') {
    if (!entity.status) {
      return false
    }
    const statusValue = entity.status.value?.toLowerCase()
    return statusFilter.some((filterStatus: string) => statusValue?.includes(filterStatus.toLowerCase()))
  }

  // Accounts and contacts are excluded when status filter is active
  if (entity.type === 'account' || entity.type === 'contact') {
    return false
  }

  return true
}

/**
 * Filter predicate: Check if entity matches date range filter
 */
const matchesDateRangeFilter = (entity: CampaignEntity, dateRange: { from?: string; to?: string }): boolean => {
  if (!dateRange) {
    return true
  }

  // dateRange is already normalized with from/to properties
  if (!dateRange.from && !dateRange.to) {
    return true
  }

  const entityDate = new Date(entity.creationDate)

  if (dateRange.from) {
    const fromDate = new Date(dateRange.from)
    fromDate.setHours(0, 0, 0, 0)
    if (entityDate < fromDate) {
      return false
    }
  }

  if (dateRange.to) {
    const toDate = new Date(dateRange.to)
    toDate.setHours(23, 59, 59, 999)
    if (entityDate > toDate) {
      return false
    }
  }

  return true
}

/**
 * Campaign Entities Section component using DataDisplay + DataTable (matching Campaign Management)
 */
export const CampaignEntitiesSection: React.FC<CampaignEntitiesSectionProps> = props => {
  const { campaignId } = props

  // Use the campaign entities hook
  const {
    entities,
    isLoading,
    error,
    currentPage,
    pageSize,
    search,
    setSearch,
    setPage,
    setPageSize,
    setSorting: setSortingInHook,
    refetch
  } = useCampaignEntities(props, campaignId)

  // State for DataDisplay
  const [searchTerm, setSearchTerm] = useState(search || '')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([])
  const [pagination, setPagination] = useState({ pageIndex: currentPage - 1, pageSize })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['name', 'type', 'createdAt', 'owner', 'status'])

  // Debounce timer ref
  const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null)

  // Extract unique statuses from both leads and opportunities for dynamic filter options
  const uniqueStatuses = useMemo(() => {
    const statusSet = new Set<string>()
    entities.forEach(entity => {
      // Get status from leads or opportunities
      if ((entity.type === 'lead' || entity.type === 'opportunity') && entity.status?.value) {
        statusSet.add(entity.status.value)
      }
    })

    // If we have dynamic statuses from data, use them
    if (statusSet.size > 0) {
      return Array.from(statusSet)
        .sort((a, b) => a.localeCompare(b))
        .map(status => ({
          id: status.toLowerCase(),
          label: status
        }))
    }

    // Otherwise, return empty array - config will use static fallback
    return []
  }, [entities])

  // Dynamic filter configuration with actual statuses from data or static fallback
  const dynamicFilterConfig = useMemo(() => {
    // Deep copy the config to avoid mutating the original
    const config = structuredClone(campaignEntityFilterConfig)

    // Update status options from actual data only if we have unique statuses
    const statusGroup = config.groups.find((g: { id: string }) => g.id === 'status-group')
    if (statusGroup && uniqueStatuses.length > 0) {
      const statusFilter = statusGroup.filters.find((f: { id: string }) => f.id === 'status')
      if (statusFilter?.config && 'options' in statusFilter.config) {
        // Replace with dynamic statuses from actual data
        statusFilter.config.options = uniqueStatuses
      }
    }
    // If no dynamic statuses (uniqueStatuses.length === 0), keep static options from config

    return config
  }, [uniqueStatuses])

  // Handle filter change for DataDisplay
  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      setSelectedFilters(filters)
      setPage(1) // Reset to first page when filters change
      setPagination(prev => ({ ...prev, pageIndex: 0 }))
    },
    [setPage]
  )

  // Handle sorting change for DataDisplay
  const handleSortingChange = useCallback(
    (newSorting: Array<{ id: string; desc: boolean }>) => {
      setSorting(newSorting)
      if (newSorting.length > 0) {
        const sort = newSorting[0]
        setSortingInHook(sort.id, sort.desc ? 'DESC' : 'ASC')
      } else {
        setSortingInHook(undefined, undefined)
      }
    },
    [setSortingInHook]
  )

  // Handle pagination change for DataDisplay
  const handlePaginationChange = useCallback(
    (newPagination: { pageIndex: number; pageSize: number }) => {
      setPagination(newPagination)
      setPage(newPagination.pageIndex + 1)
      // If page size changed, update it in the hook
      if (newPagination.pageSize !== pageSize) {
        setPageSize(newPagination.pageSize)
      }
    },
    [setPage, setPageSize, pageSize]
  )

  // Handle search change with debounce (500ms delay)
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchTerm(value)

      // Clear previous timer
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current)
      }

      // Set new timer for debounced search
      searchDebounceTimer.current = setTimeout(() => {
        setSearch(value)
        setPage(1) // Reset to first page on search
        setPagination(prev => ({ ...prev, pageIndex: 0 })) // Reset pagination state
      }, 500) // 500ms debounce delay
    },
    [setSearch, setPage]
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current)
      }
    }
  }, [])

  // Use the platform's useProcessCompletion hook for automatic refresh on flow completion
  useProcessCompletion({
    onSuccess: () => {
      setTimeout(() => {
        refetch()
      }, 500)
    }
  })

  // Apply client-side filters to entities (using extracted filter predicates)
  const filteredEntities = useMemo(() => {
    if (Object.keys(selectedFilters).length === 0) {
      return entities
    }

    return entities.filter(
      entity =>
        matchesTypeFilter(entity, selectedFilters.type) &&
        matchesStatusFilter(entity, selectedFilters.status) &&
        matchesDateRangeFilter(entity, selectedFilters.createdAtRange)
    )
  }, [entities, selectedFilters])

  // Calculate filtered total count
  const filteredTotalCount = useMemo(() => filteredEntities.length, [filteredEntities])

  // Apply pagination to filtered entities (client-side slicing)
  const paginatedEntities = useMemo(() => {
    const startIndex = pagination.pageIndex * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return filteredEntities.slice(startIndex, endIndex)
  }, [filteredEntities, pagination.pageIndex, pagination.pageSize])

  // Columns
  const columns = useMemo(() => createCampaignEntityColumns(), [])

  // Render actions for each entity row
  const renderEntityActions = useCallback(
    (row: { original: CampaignEntity }) => <EntityRowActions entity={row.original} accessToken={props.accessToken} />,
    [props.accessToken]
  )

  return (
    <div className="gba:w-full gba:pb-8" data-testid="campaign-entities-section-wrapper">
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('campaign.entities.title', 'Campaign Entities'),
            metadata: {
              count: filteredTotalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          'campaign.entities.search.placeholder',
          'Search entities...'
        )}
        onSearchChange={handleSearchChange}
        filters={selectedFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={handleFilterChange}
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('campaign.entities.filters.title', 'Filter Entities')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'campaign.entities.filters.description',
          'Apply filters to narrow down the entity list'
        )}
        sorting={sorting}
        sortableColumns={createCampaignEntitySortableColumns()}
        onSortingChange={handleSortingChange}
        availableColumns={[
          { id: 'name', label: 'Name' },
          { id: 'type', label: 'Type' },
          { id: 'createdAt', label: 'Creation Date' },
          { id: 'owner', label: 'Owner' },
          { id: 'status', label: 'Status' }
        ]}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        toolbarDensity="default"
      >
        <DataTable<CampaignEntity>
          data={paginatedEntities}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          loading={isLoading}
          error={error || undefined}
          totalCount={filteredTotalCount}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          pagination={pagination}
          onPaginationChange={handlePaginationChange}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage={getTranslationFromI18nKeyAndLabel('campaign.entities.empty', 'No entities found')}
          actions={renderEntityActions}
          data-testid="campaign-entities-list"
        />
      </DataDisplay>
    </div>
  )
}

export default CampaignEntitiesSection
