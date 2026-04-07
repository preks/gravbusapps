import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { buildOverviewPlansTableColumns, OVERVIEW_PLANS_VISIBLE_COLUMN_IDS } from './buildOverviewPlansTableColumns'
import { buildOverviewPlansFilterConfiguration } from './buildOverviewPlansFilterConfiguration'
import { formatBudgetPlanStatusLabelForDisplay, type TranslateFn } from './budgetSetupDisplayUtils'

export function useOverviewPlansTableModel(t: TranslateFn, plans: CompensationBudgetPlanRow[]) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedFiscalYearIds, setSelectedFiscalYearIds] = useState<string[]>([])
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...OVERVIEW_PLANS_VISIBLE_COLUMN_IDS])

  const statusOptions = useMemo(() => {
    const ids = new Set<string>()
    for (const p of plans) {
      if (p.budgetPlanStatus) {
        ids.add(p.budgetPlanStatus)
      }
    }
    return [...ids]
      .sort((a, b) => a.localeCompare(b))
      .map(id => ({ id, label: formatBudgetPlanStatusLabelForDisplay(id, t) || id }))
  }, [plans, t])

  const fiscalYearOptions = useMemo(() => {
    const years = new Set<number>()
    for (const p of plans) {
      years.add(p.fiscalYear)
    }
    return [...years].sort((a, b) => b - a).map(y => ({ id: String(y), label: String(y) }))
  }, [plans])

  const filterConfiguration = useMemo(
    () => buildOverviewPlansFilterConfiguration(t, statusOptions, fiscalYearOptions),
    [t, statusOptions, fiscalYearOptions]
  )

  const filteredRows = useMemo(() => {
    let list = [...plans]

    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(plan => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(plan.budgetPlanStatus, t).toLowerCase()
        const desc = (plan.description ?? '').toLowerCase()
        return (
          plan.name.toLowerCase().includes(q) ||
          desc.includes(q) ||
          statusLabel.includes(q) ||
          String(plan.fiscalYear).includes(q) ||
          (plan.startDate ?? '').toLowerCase().includes(q) ||
          (plan.endDate ?? '').toLowerCase().includes(q) ||
          (plan.effectiveDate ?? '').toLowerCase().includes(q)
        )
      })
    }

    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses)
      list = list.filter(plan => set.has(plan.budgetPlanStatus))
    }

    if (selectedFiscalYearIds.length > 0) {
      const yearSet = new Set(selectedFiscalYearIds.map(id => Number.parseInt(id, 10)).filter(n => !Number.isNaN(n)))
      list = list.filter(plan => yearSet.has(plan.fiscalYear))
    }

    return list
  }, [plans, debouncedSearch, selectedStatuses, selectedFiscalYearIds, t])

  const hasActiveFilters = useMemo(
    () => debouncedSearch.trim() !== '' || selectedStatuses.length > 0 || selectedFiscalYearIds.length > 0,
    [debouncedSearch, selectedStatuses, selectedFiscalYearIds]
  )

  const emptyMessage = hasActiveFilters ? t('overview-plans-table-empty-filtered') : t('overview-plans-empty-hint')

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (selectedStatuses.length > 0) {
      obj.budgetPlanStatuses = selectedStatuses
    }
    if (selectedFiscalYearIds.length > 0) {
      obj.fiscalYears = selectedFiscalYearIds
    }
    return obj
  }, [selectedStatuses, selectedFiscalYearIds])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const statuses = (filters.budgetPlanStatuses as string[] | undefined) ?? []
    setSelectedStatuses(statuses)
    const years = (filters.fiscalYears as string[] | undefined) ?? []
    setSelectedFiscalYearIds(years)
  }, [])

  const columns = useMemo(() => buildOverviewPlansTableColumns(t), [t])

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col =>
        visibleColumns.includes(String((col as ColumnDef<CompensationBudgetPlanRow> & { id?: string }).id ?? ''))
      ),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'name', label: t('overview-plans-col-name') },
      { id: 'budgetPlanStatus', label: t('overview-plans-col-status') },
      { id: 'fiscalYear', label: t('overview-plans-col-fiscal-year') },
      { id: 'startDate', label: t('overview-plans-col-start') },
      { id: 'endDate', label: t('overview-plans-col-end') },
      { id: 'effectiveDate', label: t('overview-plans-col-effective') }
    ],
    [t]
  )

  const availableColumnsForDisplay = useMemo(() => sortableColumns, [sortableColumns])

  const handlePaginationChange = useCallback((next: { pageIndex: number; pageSize: number }) => {
    setPagination(next)
  }, [])

  useEffect(() => {
    setPagination(p => ({ ...p, pageIndex: 0 }))
  }, [debouncedSearch, selectedStatuses, selectedFiscalYearIds, sorting])

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
