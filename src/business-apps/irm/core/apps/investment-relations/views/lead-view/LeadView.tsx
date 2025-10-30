'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, DataDisplay, DataTable, Button } from '@newwork/nw-design-system'
import { Plus } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentLead } from '@/common/data/investment/types'
import { useLeadData } from './hooks/useLeadData'
import { LeadStatistics } from './components/LeadStatistics'
import { createLeadColumns, createLeadSortableColumns } from './config/leadColumns'
import { leadFilterConfig } from './config/leadFilters'
import { useLeadFilterOptions } from './hooks/useLeadFilterOptions'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { navigateTo } from '@/common/utils/navigationUtils'

export type LeadViewProps = BusinessAppContextProps

export const LeadView: React.FC<LeadViewProps> = context => {
  const { accessToken } = context

  // Selected lead for detail view (if needed in future)
  const [selectedLead, setSelectedLead] = useState<InvestmentLead | null>(null)

  // Get dynamic filter data
  const { statuses, ratings, sources, owners, countries, regions, cities } = useLeadFilterOptions(context)

  // Create dynamic filter configuration
  const dynamicFilterConfig = useMemo(() => {
    const config = { ...leadFilterConfig }

    // Update Status filter with dynamic data
    const statusGroup = config.groups.find(g => g.id === 'status-group')
    if (statusGroup && statuses.length > 0) {
      const statusFilter = statusGroup.filters.find(f => f.id === 'leadStatuses')
      if (statusFilter && statusFilter.config && 'options' in statusFilter.config) {
        statusFilter.config.options = statuses.map(status => ({
          id: status.id,
          label: status.value
        }))
      }
    }

    // Update Rating filter with dynamic data
    const ratingGroup = config.groups.find(g => g.id === 'rating-group')
    if (ratingGroup && ratings.length > 0) {
      const ratingFilter = ratingGroup.filters.find(f => f.id === 'leadRatings')
      if (ratingFilter && ratingFilter.config && 'options' in ratingFilter.config) {
        ratingFilter.config.options = ratings.map(rating => ({
          id: rating.id,
          label: rating.value
        }))
      }
    }

    // Update Source filter with dynamic data
    const sourceGroup = config.groups.find(g => g.id === 'source-group')
    if (sourceGroup && sources.length > 0) {
      const sourceFilter = sourceGroup.filters.find(f => f.id === 'leadSources')
      if (sourceFilter && sourceFilter.config && 'options' in sourceFilter.config) {
        sourceFilter.config.options = sources.map(source => ({
          id: source.id,
          label: source.value
        }))
      }
    }

    // Update Owner filter with dynamic data
    const ownerGroup = config.groups.find(g => g.id === 'owner-group')
    if (ownerGroup && owners.length > 0) {
      const ownerFilter = ownerGroup.filters.find(f => f.id === 'owners')
      if (ownerFilter && ownerFilter.config && 'options' in ownerFilter.config) {
        ownerFilter.config.options = owners.map(owner => ({
          id: owner.id,
          label: owner.value
        }))
      }
    }

    // Update Geography filters with dynamic data
    const geographyGroup = config.groups.find(g => g.id === 'geography-group')
    if (geographyGroup) {
      if (countries.length > 0) {
        const countryFilter = geographyGroup.filters.find(f => f.id === 'countries')
        if (countryFilter && countryFilter.config && 'options' in countryFilter.config) {
          countryFilter.config.options = countries.map(country => ({
            id: country.id,
            label: country.value
          }))
        }
      }

      if (regions.length > 0) {
        const regionFilter = geographyGroup.filters.find(f => f.id === 'regions')
        if (regionFilter && regionFilter.config && 'options' in regionFilter.config) {
          regionFilter.config.options = regions.map(region => ({
            id: region.id,
            label: region.value
          }))
        }
      }

      if (cities.length > 0) {
        const cityFilter = geographyGroup.filters.find(f => f.id === 'cities')
        if (cityFilter && cityFilter.config && 'options' in cityFilter.config) {
          cityFilter.config.options = cities.map(city => ({
            id: city.id,
            label: city.value
          }))
        }
      }
    }

    return config
  }, [statuses, ratings, sources, owners, countries, regions, cities])

  // Data hook for lead list
  const leadData = useLeadData(context)

  // Get columns
  const leadColumns = useMemo(() => createLeadColumns(), [])

  // Helper function to safely convert to string
  const safeString = (value: any): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'object') return ''
    return String(value)
  }

  // Transform lead data to flatten catalog objects for DataTable
  const transformedLeadData = useMemo(() => {
    return leadData.data.map(lead => ({
      ...lead,
      leadStatusValue: safeString(lead.leadStatus?.value || lead.leadStatus?.code),
      leadRatingValue: safeString(lead.leadRating?.value),
      leadSourceValue: safeString(lead.leadSource?.value),
      ownerEmployeeName: safeString(lead.ownerEmployee?.displayName),
      cityValue: safeString(lead.locality)
    }))
  }, [leadData.data])

  // Statistics refresh function
  const [refreshStats, setRefreshStats] = useState<(() => void) | null>(null)

  // Handle lead selection
  const handleSelectLead = useCallback((lead: InvestmentLead) => {
    setSelectedLead(lead)
  }, [])

  // Handle row click - navigate to lead record
  const handleRowClick = useCallback(
    (lead: InvestmentLead) => {
      navigateTo(`/platform/irm/lead-record?leadId=${lead.id}`)
      handleSelectLead(lead)
    },
    [handleSelectLead]
  )

  // Process completion event handling
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          leadData.refetch?.()
          if (refreshStats) refreshStats()
          return
        }

        // Also check for different event structure
        const response = event.detail?.response
        if (response?.detail?.resolution === 'success' || response?.investmentLead) {
          leadData.refetch?.()
          if (refreshStats) refreshStats()
          return
        }

        // For continue events
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          leadData.refetch?.()
          if (refreshStats) refreshStats()
        }
      } catch {
        // Silently handle errors in process completion
      }
    }

    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'leadCompletion',
      'leadCompleted'
    ]

    eventNames.forEach(eventName => {
      window.addEventListener(eventName, handleProcessEvent as EventListener)
    })

    return () => {
      eventNames.forEach(eventName => {
        window.removeEventListener(eventName, handleProcessEvent as EventListener)
      })
    }
  }, [leadData.refetch, refreshStats])

  return (
    <div data-testid="investment-leads-view" className="gba:p-6">
      <div className="gba:mb-8" data-testid="investment-leads-header">
        <div className="gba:flex gba:justify-between gba:items-start" data-testid="investment-leads-title-section">
          <div>
            <h1
              className="gba:text-4xl gba:font-bold gba:text-black gba:mb-3 gba:tracking-tight"
              data-testid="investment-leads-title"
            >
              Investment Leads
            </h1>
            <p
              className="gba:text-lg gba:text-gray-500 gba:font-normal gba:leading-relaxed"
              data-testid="investment-leads-subtitle"
            >
              Manage investment lead generation and qualification
            </p>
          </div>
        </div>
      </div>

      {/* Statistics - decoupled from table data */}
      <LeadStatistics {...context} onRefreshReady={setRefreshStats} />

      {/* Data Display with DataTable */}
      <DataDisplay
        // Title sections for integrated look
        titleSections={[
          {
            id: 'all',
            label: 'All Leads',
            metadata: {
              count: leadData.total,
              subtitle: 'All investment leads'
            }
          }
        ]}
        currentSection="all"
        // Primary action - Add Lead
        primaryAction={
          <AppAction
            contextsArray={[FlowContextName.createInvestmentLead]}
            accessToken={accessToken}
            emptyStateBehavior="hide"
            deferMainContextRequestsUntilClick={false}
          >
            <Button variant="default" size="sm">
              <Plus className="gba:w-4 gba:h-4" />
              {getTranslationFromI18nKeyAndLabel('crm:lead.addLead', 'Add Lead')}
            </Button>
          </AppAction>
        }
        // Search
        searchValue={leadData.search}
        searchPlaceholder="Search leads..."
        onSearchChange={leadData.setSearch}
        // Filters
        filters={leadData.filters}
        filterConfiguration={dynamicFilterConfig}
        onFilterChange={newFilters => {
          leadData.setFilters(newFilters)
        }}
        // Live filtering for real-time updates
        enableLiveFiltering={true}
        // Custom filter sheet labels
        filterSheetTitle="Filter Investment Leads"
        filterSheetDescription="Apply filters to narrow down the investment lead list"
        // Toolbar density
        toolbarDensity="default"
        // Sorting
        sorting={leadData.sorting}
        sortableColumns={createLeadSortableColumns()}
        onSortingChange={leadData.setSorting}
        // Column visibility
        availableColumns={leadColumns.map(col => ({
          id: col.id!,
          label: col.header as string
        }))}
        visibleColumns={leadData.visibleColumns}
        onVisibleColumnsChange={leadData.setVisibleColumns}
        // Selection & bulk actions
        selectedCount={leadData.selectedRows.length}
        bulkActions={[
          {
            id: 'export',
            label: 'Export Selected',
            onClick: () => console.log('Export selected leads:', leadData.selectedRows)
          },
          {
            id: 'assign',
            label: 'Bulk Assign',
            onClick: () => console.log('Bulk assign leads:', leadData.selectedRows)
          },
          {
            id: 'delete',
            label: 'Delete Selected',
            onClick: () => console.log('Delete selected leads:', leadData.selectedRows)
          }
        ]}
        onClearSelection={() => leadData.setSelectedRows([])}
      >
        <DataTable<InvestmentLead>
          // Data
          data={transformedLeadData}
          columns={leadColumns.filter(col => leadData.visibleColumns.includes(col.id!))}
          loading={leadData.loading}
          error={leadData.error?.message}
          totalCount={leadData.total}
          // Controlled State
          sorting={leadData.sorting}
          onSortingChange={leadData.setSorting}
          pagination={leadData.pagination}
          onPaginationChange={leadData.setPagination}
          selectedRows={leadData.selectedRows}
          onSelectionChange={leadData.setSelectedRows}
          // Features
          enablePagination
          enableSorting
          enableSelection={false}
          enableColumnPinning
          enableResizing={false}
          // UI
          rowsPerPageOptions={[10, 20, 50, 100]}
          showPageNumbers
          maxVisiblePages={7}
          emptyMessage="No investment leads found"
          // Row Actions - Using AppActionMenu for flow integration
          actions={row => (
            <AppActionMenu
              data-testid={`lead-actions-menu-${row.original.id}`}
              contextsArray={[FlowContextName.investmentLeadEntity]}
              externalContextData={{ leadId: row.original.id }}
              prefixDataTestId="investment-lead-actions"
              accessToken={accessToken}
              emptyStateBehavior="enable"
              deferMainContextRequestsUntilClick
            >
              <Button
                size="icon"
                variant="ghost"
                aria-label="Lead actions"
                data-testid={`lead-actions-trigger-${row.original.id}`}
                onClick={e => e.stopPropagation()}
              >
                <svg
                  className="gba:w-4 gba:h-4 gba:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </Button>
            </AppActionMenu>
          )}
          // Row Click
          onRowClick={handleRowClick}
        />
      </DataDisplay>

      {/* Lead Details Sheet (optional - for future enhancement) */}
      {selectedLead && (
        <Sheet
          open={!!selectedLead}
          onOpenChange={open => {
            if (!open) setSelectedLead(null)
          }}
          title="Lead Details"
        >
          <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
            <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
              <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
                {selectedLead?.firstName || selectedLead?.companyName || 'Lead Details'}
              </SheetTitle>
            </SheetHeader>
            <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
              <div className="gba:p-4">
                <p className="gba:text-sm gba:text-muted-foreground">
                  Lead details will be displayed here in a future update.
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

export default LeadView
