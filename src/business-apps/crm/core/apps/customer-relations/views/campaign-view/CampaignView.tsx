import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, DataTable, Button } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useSalesCampaignData } from './components/campaign-list/hooks/useSalesCampaignData'
import { useCampaignFilters } from './components/campaign-list/hooks/useCampaignFilters'
import { useGetCampaignTypes } from './components/campaign-list/hooks/useGetCampaignTypes'
import { CampaignStatistics } from './components'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { SalesCampaign } from './components/campaign-list/types/SalesCampaignTypes'
import { createCampaignColumns, createCampaignSortableColumns, campaignFilterConfig } from './config'

type CampaignViewProps = BusinessAppContextProps

const CampaignView: React.FC<CampaignViewProps> = props => {
  const { accessToken } = props

  // Use existing hooks - don't recreate!
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

  const campaignFilters = useCampaignFilters(props)
  const { campaignTypeOptions } = useGetCampaignTypes(props)

  // State for DataDisplay/DataTable
  const [searchTerm, setSearchTerm] = useState(campaignFilters.search)
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sorting, setSorting] = useState<Array<{ id: string; desc: boolean }>>([{ id: 'createdAt', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'name',
    'type',
    'startDate',
    'endDate',
    'status',
    'createdAt'
  ])

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...campaignFilterConfig }

    // Update types from existing filter data (if available)
    const typesGroup = config.groups.find(g => g.id === 'campaign-filters')
    if (typesGroup && campaignTypeOptions && campaignTypeOptions.length > 0) {
      const typeFilter = typesGroup.filters.find(f => f.id === 'types')
      if (typeFilter && typeFilter.config && 'options' in typeFilter.config) {
        typeFilter.config.options = campaignTypeOptions.map(t => ({
          id: t.id,
          label: t.label
        }))
      }
    }

    return config
  }, [campaignTypeOptions])

  // Sync search with existing filter hook
  useEffect(() => {
    if (searchTerm !== campaignFilters.search) {
      campaignFilters.setSearch(searchTerm)
    }
  }, [searchTerm])

  // Sync filters and trigger fetch
  useEffect(() => {
    if (!campaignFilters.filtersInitialized) return

    const campaignTypes = selectedFilters.types || []
    const status = selectedFilters.status || []

    // Convert filter values to existing filter format
    const filterArray: string[] = []
    if (Array.isArray(campaignTypes)) {
      filterArray.push(...campaignTypes)
    }
    if (Array.isArray(status)) {
      filterArray.push(...status)
    }

    // Trigger fetch with existing hook
    processFiltersAndFetch(
      campaignFilters.search,
      campaignFilters.selectedFilters, // Use existing filters
      campaignFilters.startDateAfter,
      campaignFilters.startDateBefore,
      campaignFilters.endDateAfter,
      campaignFilters.endDateBefore,
      campaignFilters.createdAfter,
      campaignFilters.createdBefore,
      sorting[0]?.id || '',
      sorting[0]?.desc ? 'DESC' : 'ASC',
      pagination.pageIndex * pagination.pageSize,
      pagination.pageSize
    )
  }, [searchTerm, selectedFilters, sorting, pagination, campaignFilters.filtersInitialized])

  // Handle row click
  const handleRowClick = useCallback((campaign: SalesCampaign) => {
    const url = buildPlatformUrl('/platform/crm/customer-relations', {
      view: 'campaigns',
      campaignId: campaign.id
    })
    navigateTo(url)
  }, [])

  // Columns
  const columns = useMemo(() => createCampaignColumns(), [])

  return (
    <div data-testid="campaign-view">
      {/* Statistics - use existing data */}
      {statistics && (
        <CampaignStatistics
          statistics={statistics}
          isLoading={statisticsLoading}
          error={statisticsError}
          onRetry={refetchStatistics}
        />
      )}

      {/* DataDisplay */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: getTranslationFromI18nKeyAndLabel('common:allCampaigns', 'All Campaigns'),
            metadata: {
              count: totalCount,
              isLoading: isLoading
            }
          }
        ]}
        currentSection="all"
        searchValue={searchTerm}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel('common:searchCampaigns', 'Search campaigns...')}
        onSearchChange={setSearchTerm}
        filters={selectedFilters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={setSelectedFilters}
        sorting={sorting}
        sortableColumns={createCampaignSortableColumns()}
        onSortingChange={setSorting}
        availableColumns={[
          { id: 'name', label: 'Campaign' },
          { id: 'type', label: 'Type' },
          { id: 'startDate', label: 'Start Date' },
          { id: 'endDate', label: 'End Date' },
          { id: 'status', label: 'Status' },
          { id: 'createdAt', label: 'Created' }
        ]}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          <AppAction
            contextsArray={[FlowContextName.customerCampaignCreate]}
            accessToken={accessToken}
            data-testid="add-campaign-action"
            emptyStateBehavior="hide"
          >
            <Button size="sm" variant="default" data-testid="add-campaign-button" type="button">
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('crm:campaign.addCampaign', 'Add Campaign')}
            </Button>
          </AppAction>
        }
        toolbarDensity="default"
        enableLiveFiltering={true}
        filterSheetTitle={getTranslationFromI18nKeyAndLabel('common:filterCampaigns', 'Filter Campaigns')}
        filterSheetDescription={getTranslationFromI18nKeyAndLabel(
          'common:filterCampaignsDescription',
          'Apply filters to narrow down the campaign list'
        )}
      >
        <DataTable<SalesCampaign>
          data={campaigns}
          columns={columns.filter(col => visibleColumns.includes(col.id as string))}
          loading={isLoading}
          error={error || undefined}
          totalCount={totalCount}
          sorting={sorting}
          onSortingChange={setSorting}
          pagination={pagination}
          onPaginationChange={setPagination}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          tableLayout="fixed"
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No campaigns found"
          actions={row => (
            <AppActionButton
              data-testid={`campaign-actions-${row.original.id}`}
              size="icon"
              contextsArray={[FlowContextName.customerCampaignEntity]}
              externalContextData={{ campaignId: row.original.id }}
              prefixDataTestId="campaign-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
              onClick={(e: any) => e.stopPropagation()}
            />
          )}
          onRowClick={handleRowClick}
          data-testid="campaign-list"
        />
      </DataDisplay>
    </div>
  )
}

export default CampaignView
