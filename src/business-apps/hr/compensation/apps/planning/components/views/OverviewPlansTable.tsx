import React, { useCallback } from 'react'
import { Button, DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import { useDataTablePaginationLabels } from '@/business-apps/hr/core/apps/shared/utils/dataTablePaginationLabels'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import translations from '../../_i18n'
import { useOverviewPlansTableModel } from './useOverviewPlansTableModel'

export interface OverviewPlansTableProps {
  plans: CompensationBudgetPlanRow[]
  plansLoading: boolean
  onCreatePlan: () => void
  onEditPlan: (plan: CompensationBudgetPlanRow) => void
  onOpenPlan: (plan: CompensationBudgetPlanRow) => void
}

export function OverviewPlansTable({
  plans,
  plansLoading,
  onCreatePlan,
  onEditPlan,
  onOpenPlan
}: Readonly<OverviewPlansTableProps>) {
  const { t } = useTranslation(translations)
  const paginationLabels = useDataTablePaginationLabels()
  const {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filterConfiguration,
    filteredRows,
    filtersObject,
    handleFilterChangeFromDisplay,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  } = useOverviewPlansTableModel(t, plans, onEditPlan)

  const handleRowClick = useCallback(
    (plan: CompensationBudgetPlanRow) => {
      onOpenPlan(plan)
    },
    [onOpenPlan]
  )

  return (
    <div className="gba:space-y-4" data-testid="overview-plans-table-section">
      <DataDisplay
        data-testid="overview-plans-display"
        titleSections={[
          {
            id: 'overview-plans',
            label: t('overview-plans-title'),
            metadata: { count: filteredRows.length, isLoading: plansLoading }
          }
        ]}
        currentSection="overview-plans"
        toolbarDensity="default"
        searchValue={searchInput}
        searchPlaceholder={t('overview-plans-table-search-placeholder')}
        onSearchChange={setSearchInput}
        filters={filtersObject}
        filterConfiguration={filterConfiguration}
        onFilterChange={handleFilterChangeFromDisplay}
        enableLiveFiltering
        filterSheetTitle={t('overview-plans-table-filter-sheet-title')}
        filterSheetDescription={t('overview-plans-table-filter-sheet-description')}
        sorting={sorting}
        sortableColumns={sortableColumns}
        onSortingChange={setSorting}
        availableColumns={availableColumnsForDisplay}
        visibleColumns={visibleColumns}
        onVisibleColumnsChange={setVisibleColumns}
        primaryAction={
          <div className="gba:flex gba:min-w-0 gba:items-center gba:pl-2 gba:md:pl-3">
            <Button
              type="button"
              className="gba:shrink-0"
              onClick={onCreatePlan}
              data-testid="overview-create-plan-button"
            >
              {t('overview-plans-new-button')}
            </Button>
          </div>
        }
      >
        <TooltipProvider>
          <DataTable<CompensationBudgetPlanRow>
            data={filteredRows}
            columns={visibleTableColumns}
            loading={plansLoading}
            sorting={sorting}
            onSortingChange={setSorting}
            pagination={pagination}
            onPaginationChange={handlePaginationChange}
            enablePagination
            enableSorting
            enableSelection={false}
            enableColumnPinning
            enableResizing={false}
            tableLayout="auto"
            rowsPerPageOptions={[10, 20, 50, 100]}
            showPageNumbers
            maxVisiblePages={7}
            paginationLabels={paginationLabels}
            emptyMessage={emptyMessage}
            onRowClick={handleRowClick}
            data-testid="overview-plans-table"
          />
        </TooltipProvider>
      </DataDisplay>
    </div>
  )
}
