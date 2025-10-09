import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataContainer } from '@/components/layout/dataContainer'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignData } from './components/campaign-list/hooks/useSalesCampaignData'
import { useCampaignFilters } from './components/campaign-list/hooks/useCampaignFilters'
import { CampaignStatistics, CampaignsTable, AddCampaignModal } from './components'

import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { ColumnConfig } from '@/components/dataController'
// Removed NewCampaignData type import as inline handler is used
import type { SalesCampaign } from './components/campaign-list/types/SalesCampaignTypes'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PlusSquareIcon } from '@phosphor-icons/react'
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion'

interface CampaignManagementContentProps extends BusinessAppContextProps {
  onBack?: () => void
}

const CampaignManagementContent: React.FC<CampaignManagementContentProps> = props => {
  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting] = useState(false)

  // Use the centralized campaign filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    startDateAfter: filterStartDateAfter,
    startDateBefore: filterStartDateBefore,
    endDateAfter: filterEndDateAfter,
    endDateBefore: filterEndDateBefore,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleStartDateRangeChange,
    handleEndDateRangeChange,
    handleCreatedDateRangeChange: filterHandleCreatedDateRangeChange,
    filtersInitialized
  } = useCampaignFilters(props)

  const {
    campaigns,
    isLoading,
    error,
    totalCount,
    statistics,
    statisticsLoading,
    statisticsError,
    processFiltersAndFetch,
    refetchStatistics
  } = useSalesCampaignData(props)

  // Table state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [sortField, setSortField] = useState('')
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | ''>('')
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'name', label: 'Name', visible: true },
    { id: 'type', label: 'Type', visible: true },
    { id: 'startDate', label: 'Start Date', visible: true },
    { id: 'endDate', label: 'End Date', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'createdAt', label: 'Created', visible: true }
  ])
  const visibleColumns = useMemo(() => columnConfig.filter(c => c.visible).map(c => c.id), [columnConfig])
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(col => (col.id === columnId ? { ...col, visible } : col)))
  }, [])

  // Handle pagination changes
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      setCurrentPage(page)
      if (newPageSize) {
        setPageSize(newPageSize)
      }

      processFiltersAndFetch(
        search,
        selectedFilters,
        filterStartDateAfter,
        filterStartDateBefore,
        filterEndDateAfter,
        filterEndDateBefore,
        filterCreatedAfter,
        filterCreatedBefore,
        sortField,
        sortOrder
      )
    },
    [
      pageSize,
      search,
      selectedFilters,
      filterStartDateAfter,
      filterStartDateBefore,
      filterEndDateAfter,
      filterEndDateBefore,
      filterCreatedAfter,
      filterCreatedBefore,
      sortField,
      sortOrder,
      processFiltersAndFetch
    ]
  )

  // Handle sorting changes
  const handleSortingChange = useCallback(
    (field: string, order: 'ASC' | 'DESC' | '') => {
      setSortField(field)
      setSortOrder(order)

      processFiltersAndFetch(
        search,
        selectedFilters,
        filterStartDateAfter,
        filterStartDateBefore,
        filterEndDateAfter,
        filterEndDateBefore,
        filterCreatedAfter,
        filterCreatedBefore,
        field, // sortField
        order // sortOrder
      )
    },
    [
      search,
      selectedFilters,
      filterStartDateAfter,
      filterStartDateBefore,
      filterEndDateAfter,
      filterEndDateBefore,
      filterCreatedAfter,
      filterCreatedBefore,
      currentPage,
      pageSize,
      processFiltersAndFetch
    ]
  )

  // Handle table changes (legacy - for backward compatibility)
  const handleTableChange = useCallback(
    (pagination: any, _filters: any) => {
      const newPage = pagination.current || 1
      const newPageSize = pagination.pageSize || 20
      handlePaginationChange(newPage, newPageSize)
    },
    [handlePaginationChange]
  )

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      selected ? addFilter(filterId) : removeFilter(filterId)
    },
    [addFilter, removeFilter]
  )

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // This is called by DataController's "Clear all filters" button or individual filter removal
      if (filters.length === 0) {
        // Clear all filters
        resetFilters()
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(f => !filters.includes(f))
        removedFilters.forEach(filterId => removeFilter(filterId))
      }
    },
    [resetFilters, selectedFilters, removeFilter]
  )

  // Effect to handle filter changes
  useEffect(() => {
    if (filtersInitialized) {
      processFiltersAndFetch(
        search,
        selectedFilters,
        filterStartDateAfter,
        filterStartDateBefore,
        filterEndDateAfter,
        filterEndDateBefore,
        filterCreatedAfter,
        filterCreatedBefore,
        sortField,
        sortOrder
      )
    }
  }, [
    search,
    selectedFilters,
    filterStartDateAfter,
    filterStartDateBefore,
    filterEndDateAfter,
    filterEndDateBefore,
    filterCreatedAfter,
    filterCreatedBefore,
    sortField,
    sortOrder,
    currentPage,
    pageSize,
    filtersInitialized,
    processFiltersAndFetch
  ])

  // AppAction handles add via flow context

  // Refresh list and statistics after process completion
  useProcessCompletion({
    onSuccess: () => {
      processFiltersAndFetch(
        search,
        selectedFilters,
        filterStartDateAfter,
        filterStartDateBefore,
        filterEndDateAfter,
        filterEndDateBefore,
        filterCreatedAfter,
        filterCreatedBefore,
        sortField,
        sortOrder
      )
      refetchStatistics()
    }
  })

  const handleCloseModal = useCallback(() => {
    setIsAddModalOpen(false)
  }, [])

  // Removed handleSubmitCampaign; creation handled via AppAction elsewhere

  // Navigation handlers
  const handleCampaignRowClick = useCallback((campaign: SalesCampaign) => {
    // Navigate to campaign record screen with campaign ID and source parameters
    const url = buildPlatformUrl('/platform/crm/campaign-record', {
      campaignId: campaign.id,
      source: 'customer-relations'
    })
    navigateTo(url)
  }, [])

  return (
    <>
      <div data-testid="campaign-management-content">
        {/* Statistics Section */}
        <div className="gba:mb-6" data-testid="campaign-statistics-section">
          <CampaignStatistics
            statistics={
              statistics || { totalCampaigns: 0, activeCampaigns: 0, completedCampaigns: 0, averageDuration: 0 }
            }
            isLoading={statisticsLoading}
            error={statisticsError}
            onRetry={refetchStatistics}
          />
        </div>

        {/* Campaigns Table Section */}
        <DataContainer
          dataControllerProps={{
            search,
            setSearch,
            debounceDelay: 500,
            filter: selectedFilters,
            setFilter: handleSetFilter,
            filterLabelMap,
            dateRange: {
              createdAfter: filterCreatedAfter,
              createdBefore: filterCreatedBefore,
              onClear: () => {
                filterHandleCreatedDateRangeChange(undefined, undefined)
                // Also clear start and end date ranges when clearing all
                handleStartDateRangeChange(undefined, undefined)
                handleEndDateRangeChange(undefined, undefined)
              }
            },
            listTitle: (
              <div className="gba:flex gba:items-center gba:gap-4">
                <div className="gba:flex gba:items-center gba:gap-2">
                  <span>Campaigns</span>
                  <span className="gba:text-gray-500">({totalCount})</span>
                </div>
              </div>
            ),
            columnVisibility: {
              columns: columnConfig,
              onColumnVisibilityChange: handleColumnVisibilityChange,
              'data-testid': 'campaigns-column-visibility'
            },
            actions: (
              <AppAction
                contextsArray={[FlowContextName.customerCampaignCreate]}
                accessToken={props.accessToken}
                data-testid="add-campaign-action"
                emptyStateBehavior="hide"
              >
                <div
                  className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:rounded gba:gap-1 gba:cursor-pointer"
                  data-testid="add-campaign-trigger"
                >
                  <PlusSquareIcon />
                  Add
                </div>
              </AppAction>
            )
          }}
          dataFilterProps={{
            filterGroups: filterGroups,
            onFilterChange: handleFilterChange
          }}
          dataBody={
            <div data-testid="campaigns-table-container">
              <CampaignsTable
                campaigns={campaigns}
                isLoading={isLoading}
                error={error}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                sortField={sortField}
                sortOrder={sortOrder}
                onTableChange={handleTableChange}
                onPaginationChange={handlePaginationChange}
                onSortingChange={handleSortingChange}
                onRowClick={handleCampaignRowClick}
                accessToken={props.accessToken}
                visibleColumns={visibleColumns}
              />
            </div>
          }
        />
      </div>

      {/* Add Campaign Modal */}
      <AddCampaignModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        onSubmit={async () => {}}
        isLoading={isSubmitting}
        {...props}
      />
    </>
  )
}

interface CampaignManagementProps extends BusinessAppContextProps {
  onBack?: () => void
}

const CampaignManagement: React.FC<CampaignManagementProps> = props => {
  return <CampaignManagementContent {...props} />
}

export default CampaignManagement
