import React, { useMemo } from 'react'
import { Button, DataDisplay, DataTable, Spinner } from '@newwork/nw-design-system'
import { Plus, Download, Trash2 } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import { OpportunityStatistics } from './components/OpportunityStatistics'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { navigateTo } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useOpportunityData } from './hooks/useOpportunityData'
import { useOpportunityFilterOptions } from './hooks/useOpportunityFilterOptions'
import { createOpportunityColumns, createOpportunitySortableColumns, opportunityFilterConfig } from './config'

export type OpportunityViewProps = BusinessAppContextProps

export const OpportunityView: React.FC<OpportunityViewProps> = context => {
  const { accessToken } = context

  // Data management
  const opportunityData = useOpportunityData(context)

  // Filter options
  const filterOptions = useOpportunityFilterOptions(context)

  // Create columns
  const opportunityColumns = useMemo(() => createOpportunityColumns(), [])

  // Dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...opportunityFilterConfig }

    // Update Owner filter with dynamic data
    const opportunityFiltersGroup = config.groups.find(g => g.id === 'opportunity-filters')
    if (opportunityFiltersGroup && filterOptions.owners.length > 0) {
      const ownerFilter = opportunityFiltersGroup.filters.find(f => f.id === 'owners')
      if (ownerFilter && ownerFilter.config && 'options' in ownerFilter.config) {
        ownerFilter.config.options = filterOptions.owners
      }
    }

    // Update Pipeline filter with dynamic data
    if (opportunityFiltersGroup && filterOptions.pipelines.length > 0) {
      const pipelineFilter = opportunityFiltersGroup.filters.find(f => f.id === 'pipelines')
      if (pipelineFilter && pipelineFilter.config && 'options' in pipelineFilter.config) {
        pipelineFilter.config.options = filterOptions.pipelines
      }
    }

    // Update Stage filter with dynamic data
    if (opportunityFiltersGroup && filterOptions.stages.length > 0) {
      const stageFilter = opportunityFiltersGroup.filters.find(f => f.id === 'stages')
      if (stageFilter && stageFilter.config && 'options' in stageFilter.config) {
        stageFilter.config.options = filterOptions.stages
      }
    }

    // Update Status filter with dynamic data
    if (opportunityFiltersGroup && filterOptions.statuses.length > 0) {
      const statusFilter = opportunityFiltersGroup.filters.find(f => f.id === 'statuses')
      if (statusFilter && statusFilter.config && 'options' in statusFilter.config) {
        statusFilter.config.options = filterOptions.statuses
      }
    }

    // Update Account filter with dynamic data
    if (opportunityFiltersGroup && filterOptions.accounts.length > 0) {
      const accountFilter = opportunityFiltersGroup.filters.find(f => f.id === 'accounts')
      if (accountFilter && accountFilter.config && 'options' in accountFilter.config) {
        accountFilter.config.options = filterOptions.accounts
      }
    }

    return config
  }, [filterOptions])

  // Transform data to flatten nested objects for DataTable
  const transformedOpportunityData = useMemo(() => {
    return opportunityData.data.map(opportunity => ({
      ...opportunity,
      pipelineValue: opportunity.opportunityPipeline?.value || opportunity.opportunityPipeline?.code || '',
      stageValue: opportunity.opportunityPipelineStage?.value || opportunity.opportunityPipelineStage?.code || '',
      statusValue: opportunity.opportunityStatus?.value || opportunity.opportunityStatus?.code || '',
      accountName: opportunity.account?.name || '',
      ownerEmployeeName: opportunity.ownerEmployee?.displayName || ''
    }))
  }, [opportunityData.data])

  // Handle row click
  const handleRowClick = (opportunity: InvestmentOpportunity) => {
    navigateTo(`/platform/irm/opportunity-record?opportunityId=${opportunity.id}`)
  }

  // Initial loading state
  if (opportunityData.loading && opportunityData.data.length === 0 && !filterOptions.isLoading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div data-testid="investment-opportunities-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Opportunities</h1>
            <p className="gba:text-gray-600">Track and manage investment opportunities through your sales pipeline</p>
          </div>
        </div>

        {/* Statistics Cards */}
        <OpportunityStatistics {...context} />
      </div>

      {/* Data Display with DataTable */}
      <DataDisplay
        titleSections={[
          {
            id: 'all',
            label: 'All Opportunities',
            metadata: { count: opportunityData.total, subtitle: 'All investment opportunities' }
          }
        ]}
        currentSection="all"
        onSectionChange={() => {}} // Single tab, no section change needed
        primaryAction={
          <AppAction
            contextsArray={[FlowContextName.createInvestmentOpportunity]}
            accessToken={accessToken}
            data-testid="add-opportunity-action"
            emptyStateBehavior="hide"
            deferMainContextRequestsUntilClick={false}
          >
            <Button size="sm" variant="default" data-testid="add-opportunity-button" type="button">
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('crm:opportunity.addOpportunity', 'Add Opportunity')}
            </Button>
          </AppAction>
        }
        searchValue={opportunityData.search}
        searchPlaceholder="Search opportunities..."
        onSearchChange={opportunityData.setSearch}
        filters={opportunityData.filters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={newFilters => {
          opportunityData.setFilters(newFilters)
        }}
        enableLiveFiltering={true}
        filterSheetTitle="Filter Investment Opportunities"
        filterSheetDescription="Apply filters to narrow down the investment opportunity list"
        toolbarDensity="default"
        sorting={opportunityData.sorting}
        sortableColumns={createOpportunitySortableColumns()}
        onSortingChange={opportunityData.setSorting}
        availableColumns={opportunityColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={opportunityData.visibleColumns}
        onVisibleColumnsChange={opportunityData.setVisibleColumns}
        selectedCount={opportunityData.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            icon: <Download className="gba:w-4 gba:h-4" />,
            variant: 'secondary' as const,
            onClick: () => {
              console.log('Export selected opportunities:', opportunityData.selectedRows)
            }
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            icon: <Trash2 className="gba:w-4 gba:h-4" />,
            variant: 'destructive' as const,
            onClick: () => {
              console.log('Delete selected opportunities:', opportunityData.selectedRows)
            }
          }
        ]}
        onClearSelection={() => opportunityData.setSelectedRows([])}
      >
        <DataTable<InvestmentOpportunity>
          data={transformedOpportunityData}
          columns={opportunityColumns.filter(col => opportunityData.visibleColumns.includes(col.id!))}
          loading={opportunityData.loading}
          error={opportunityData.error?.message}
          totalCount={opportunityData.total}
          sorting={opportunityData.sorting}
          onSortingChange={opportunityData.setSorting}
          pagination={opportunityData.pagination}
          onPaginationChange={opportunityData.setPagination}
          selectedRows={opportunityData.selectedRows}
          onSelectionChange={opportunityData.setSelectedRows}
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No investment opportunities found"
          actions={row => (
            <AppActionMenu
              data-testid={`opportunity-actions-menu-${row.original.id}`}
              contextsArray={[FlowContextName.investmentOpportunityEntity]}
              externalContextData={{ opportunityId: row.original.id }}
              prefixDataTestId="investment-opportunity-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="Opportunity actions"
                data-testid={`opportunity-actions-trigger-${row.original.id}`}
                onClick={e => e.stopPropagation()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </Button>
            </AppActionMenu>
          )}
          onRowClick={handleRowClick}
        />
      </DataDisplay>
    </div>
  )
}

export default OpportunityView
