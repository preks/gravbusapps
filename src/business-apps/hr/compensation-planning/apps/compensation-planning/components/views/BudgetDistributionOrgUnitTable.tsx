import React, { useMemo } from 'react'
import { DataDisplay, DataTable, TooltipProvider, useTranslation } from '@newwork/nw-design-system'
import type { CompensationBudgetPlanOrganizationalUnitRow } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import type { BudgetDistributionOrgUnitTableRow } from './budgetDistributionOrgUnitTableRows'
import { useBudgetDistributionOrgUnitTableModel } from './useBudgetDistributionOrgUnitTableModel'
import translations from '../../_i18n'

export interface BudgetDistributionOrgUnitTableProps {
  sourceRows: CompensationBudgetPlanOrganizationalUnitRow[]
  teamSalaryBaseline: number
  currencyCode: string
  loading: boolean
  error: string | null
  hasSelectedPlan: boolean
}

export const BudgetDistributionOrgUnitTable: React.FC<BudgetDistributionOrgUnitTableProps> = ({
  sourceRows,
  teamSalaryBaseline,
  currencyCode,
  loading,
  error,
  hasSelectedPlan
}) => {
  const { t } = useTranslation(translations)
  const displayError = useMemo(() => {
    if (error) return error
    return undefined
  }, [error])

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
  } = useBudgetDistributionOrgUnitTableModel(t, sourceRows, teamSalaryBaseline, currencyCode, hasSelectedPlan)

  return (
    <DataDisplay
      data-testid="budget-distribution-org-units-display"
      titleSections={[
        {
          id: 'org-unit-budgets',
          label: t('budget-distribution-table-section-title'),
          metadata: { count: filteredRows.length, isLoading: loading }
        }
      ]}
      currentSection="org-unit-budgets"
      toolbarDensity="default"
      searchValue={searchInput}
      searchPlaceholder={t('budget-distribution-table-search-placeholder')}
      onSearchChange={setSearchInput}
      filters={filtersObject}
      filterConfiguration={filterConfiguration}
      onFilterChange={handleFilterChangeFromDisplay}
      enableLiveFiltering
      filterSheetTitle={t('budget-distribution-table-filter-sheet-title')}
      filterSheetDescription={t('budget-distribution-table-filter-sheet-description')}
      sorting={sorting}
      sortableColumns={sortableColumns}
      onSortingChange={setSorting}
      availableColumns={availableColumnsForDisplay}
      visibleColumns={visibleColumns}
      onVisibleColumnsChange={setVisibleColumns}
    >
      <TooltipProvider>
        <DataTable<BudgetDistributionOrgUnitTableRow>
          data={filteredRows}
          columns={visibleTableColumns}
          loading={loading}
          error={displayError}
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
          data-testid="budget-distribution-org-units-table"
        />
      </TooltipProvider>
    </DataDisplay>
  )
}
