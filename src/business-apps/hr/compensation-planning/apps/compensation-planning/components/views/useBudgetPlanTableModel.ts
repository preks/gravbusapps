import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { BUDGET_PLAN_TABLE_VISIBLE_COLUMN_IDS, buildBudgetPlanTableColumns } from './buildBudgetPlanTableColumns'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function useBudgetPlanTableModel(t: TranslateFn, sourceRows: CompensationBudgetPlanRow[]) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'fiscalYear', desc: true }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_PLAN_TABLE_VISIBLE_COLUMN_IDS])

  const formatStatus = useCallback((v: string) => formatBudgetPlanStatusLabelForDisplay(v, t) || v, [t])

  const filteredRows = useMemo(() => {
    let list = sourceRows
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
        const desc = (row.description ?? '').toLowerCase()
        return (
          row.name.toLowerCase().includes(q) ||
          desc.includes(q) ||
          statusLabel.includes(q) ||
          String(row.fiscalYear).includes(q)
        )
      })
    }
    return list
  }, [sourceRows, debouncedSearch, t])

  const hasActiveFilters = debouncedSearch.trim() !== ''
  const emptyMessage = hasActiveFilters ? t('budget-plan-table-empty-filtered') : t('budget-plan-table-empty')

  const filtersObject = useMemo(() => ({}), [])

  const handleFilterChangeFromDisplay = useCallback(() => {}, [])

  const columns = useMemo(() => buildBudgetPlanTableColumns(t, formatStatus), [t, formatStatus])

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<CompensationBudgetPlanRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: t('budget-plan-table-col-name') },
      { id: 'fiscalYear', label: t('budget-plan-table-col-fiscal-year') },
      { id: 'budgetPlanStatus', label: t('budget-plan-table-col-status') },
      { id: 'startDate', label: t('budget-plan-table-col-start-date') },
      { id: 'endDate', label: t('budget-plan-table-col-end-date') },
      { id: 'effectiveDate', label: t('budget-plan-table-col-effective-date') },
      { id: 'description', label: t('budget-plan-table-col-description') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, sorting])

  const filterConfiguration = useMemo(() => [], [])

  return {
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
  }
}
