import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { DataDisplay, DataTable, Button } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  useSalesCampaignData,
  useCampaignFilters,
  useGetCampaignTypes,
  CampaignStatistics,
  createCampaignColumns,
  createCampaignSortableColumns,
  campaignFilterConfig
} from '@/business-apps/crm/campaigns/apps/campaign-management'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { SalesCampaign } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'

type CampaignViewProps = BusinessAppContextProps

// Extracted campaign actions component
const CampaignRowActions: React.FC<{
  campaignId: string
  accessToken: string
}> = ({ campaignId, accessToken }) => (
  <AppActionMenu
    contextsArray={[FlowContextName.customerCampaignEntity]}
    externalContextData={{ campaignId }}
    prefixDataTestId="campaign-actions"
    accessToken={accessToken}
    emptyStateBehavior="enable"
    deferMainContextRequestsUntilClick
  >
    <Button variant="ghost" size="icon" data-testid={`campaign-actions-${campaignId}`}>
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
)

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
    if (typesGroup && campaignTypeOptions?.length > 0) {
      const typeFilter = typesGroup.filters.find(f => f.id === 'types')
      if (typeFilter?.config && 'options' in typeFilter.config) {
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
    const url = buildPlatformUrl('/platform/crm/campaign-record', {
      campaignId: campaign.id,
      source: 'customer-relations'
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
          actions={row => <CampaignRowActions campaignId={row.original.id} accessToken={accessToken} />}
          onRowClick={handleRowClick}
          data-testid="campaign-list"
        />
      </DataDisplay>
    </div>
  )
}

export default CampaignView
