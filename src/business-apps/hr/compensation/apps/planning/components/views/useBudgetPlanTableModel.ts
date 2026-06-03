import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import { BUDGET_PLAN_STATUS_OPTIONS } from '../../../../types/budgetPlanGraphqlEnums'
import { BUDGET_PLAN_TABLE_VISIBLE_COLUMN_IDS, buildBudgetPlanTableColumns } from './buildBudgetPlanTableColumns'
import { buildBudgetPlanTableFilterConfiguration } from './buildBudgetPlanTableFilterConfiguration'
import {
  effectiveDateMatchesFilter,
  parseDateRangeFilterValue,
  planPeriodOverlapsFilter
} from './budgetPlanTableFilterHelpers'
import { formatBudgetPlanStatusLabelForDisplay } from './budgetSetupDisplayUtils'
import type { TranslateFn } from './budgetSetupDisplayUtils'

export function useBudgetPlanTableModel(t: TranslateFn, sourceRows: CompensationBudgetPlanRow[]) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [...BUDGET_PLAN_TABLE_VISIBLE_COLUMN_IDS])

  const [planPeriodFrom, setPlanPeriodFrom] = useState<string | null>(null)
  const [planPeriodTo, setPlanPeriodTo] = useState<string | null>(null)
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [effectiveFrom, setEffectiveFrom] = useState<string | null>(null)
  const [effectiveTo, setEffectiveTo] = useState<string | null>(null)

  const formatStatus = useCallback((v: string) => formatBudgetPlanStatusLabelForDisplay(v, t) || v, [t])

  const statusFilterOptions = useMemo(
    () =>
      BUDGET_PLAN_STATUS_OPTIONS.map(id => ({
        id,
        label: formatBudgetPlanStatusLabelForDisplay(id, t) || id
      })),
    [t]
  )

  const filterConfiguration = useMemo(
    () => buildBudgetPlanTableFilterConfiguration(t, statusFilterOptions),
    [t, statusFilterOptions]
  )

  const filteredRows = useMemo(() => {
    let list = sourceRows
    const q = debouncedSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(row => {
        const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
        const desc = (row.description ?? '').toLowerCase()
        return row.name.toLowerCase().includes(q) || desc.includes(q) || statusLabel.includes(q)
      })
    }

    if (planPeriodFrom != null || planPeriodTo != null) {
      list = list.filter(row => planPeriodOverlapsFilter(row, planPeriodFrom, planPeriodTo))
    }

    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses)
      list = list.filter(row => set.has(row.budgetPlanStatus))
    }

    if (effectiveFrom != null || effectiveTo != null) {
      list = list.filter(row => effectiveDateMatchesFilter(row, effectiveFrom, effectiveTo))
    }

    return list
  }, [sourceRows, debouncedSearch, t, planPeriodFrom, planPeriodTo, selectedStatuses, effectiveFrom, effectiveTo])

  const hasActiveFilters = useMemo(
    () =>
      debouncedSearch.trim() !== '' ||
      planPeriodFrom != null ||
      planPeriodTo != null ||
      selectedStatuses.length > 0 ||
      effectiveFrom != null ||
      effectiveTo != null,
    [debouncedSearch, planPeriodFrom, planPeriodTo, selectedStatuses.length, effectiveFrom, effectiveTo]
  )

  const emptyMessage = hasActiveFilters ? t('budget-plan-table-empty-filtered') : t('budget-plan-table-empty')

  const filtersObject = useMemo(() => {
    const obj: Record<string, unknown> = {}
    if (planPeriodFrom != null || planPeriodTo != null) {
      obj.planPeriodRange = [planPeriodFrom, planPeriodTo]
    }
    if (selectedStatuses.length > 0) {
      obj.budgetPlanStatuses = selectedStatuses
    }
    if (effectiveFrom != null || effectiveTo != null) {
      obj.effectiveDateRange = [effectiveFrom, effectiveTo]
    }
    return obj
  }, [planPeriodFrom, planPeriodTo, selectedStatuses, effectiveFrom, effectiveTo])

  const handleFilterChangeFromDisplay = useCallback((filters: Record<string, unknown>) => {
    const planParsed = parseDateRangeFilterValue(filters.planPeriodRange as [unknown, unknown] | null)
    if (planParsed == null) {
      setPlanPeriodFrom(null)
      setPlanPeriodTo(null)
    } else {
      setPlanPeriodFrom(planParsed.from)
      setPlanPeriodTo(planParsed.to)
    }

    setSelectedStatuses((filters.budgetPlanStatuses as string[] | undefined) ?? [])

    const effParsed = parseDateRangeFilterValue(filters.effectiveDateRange as [unknown, unknown] | null)
    if (effParsed == null) {
      setEffectiveFrom(null)
      setEffectiveTo(null)
    } else {
      setEffectiveFrom(effParsed.from)
      setEffectiveTo(effParsed.to)
    }
  }, [])

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
  }, [debouncedSearch, sorting, planPeriodFrom, planPeriodTo, selectedStatuses, effectiveFrom, effectiveTo])

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
