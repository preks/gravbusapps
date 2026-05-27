import React from 'react'
import { DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { useBudgetPlanTableModel } from './useBudgetPlanTableModel'
import translations from '../../_i18n'

export interface BudgetPlanTableProps {
  rows: CompensationBudgetPlanRow[]
  loading: boolean
  error: string | null
  toolbarCompany?: React.ReactNode
  toolbarEnd?: React.ReactNode
}

export const BudgetPlanTable: React.FC<BudgetPlanTableProps> = ({
  rows,
  loading,
  error,
  toolbarCompany,
  toolbarEnd
}) => {
  const { t } = useTranslation(translations)
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
  } = useBudgetPlanTableModel(t, rows)

  return (
    <DataDisplay
      data-testid="budget-plan-table-display"
      titleSections={[
        {
          id: 'budget-plans',
          label: t('budget-plan-table-section-title'),
          metadata: { count: filteredRows.length, isLoading: loading }
        }
      ]}
      currentSection="budget-plans"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('budget-plan-table-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('budget-plan-filter-sheet-title')}
      filterSheetDescription={t('budget-plan-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
      secondaryActions={
        <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          {toolbarCompany}
          {toolbarEnd}
        </div>
      }
    >
      <TooltipProvider>
        <DataTable<CompensationBudgetPlanRow>
          data={filteredRows}
          columns={visibleTableColumns}
          loading={loading}
          error={error ?? undefined}
          sorting={sorting}
          onSortingChange={setSorting}
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
          emptyMessage={emptyMessage}
          data-testid="budget-plan-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
