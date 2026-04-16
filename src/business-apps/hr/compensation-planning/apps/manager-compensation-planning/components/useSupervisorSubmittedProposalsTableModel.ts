import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import {
  formatBudgetPlanStatusLabelForDisplay,
  type TranslateFn
} from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import {
  SUPERVISOR_SUBMITTED_PROPOSALS_DATA_COLUMN_IDS,
  buildSupervisorSubmittedProposalsTableColumns,
  type SupervisorSubmittedProposalsSelectionParams
} from './buildSupervisorSubmittedProposalsTableColumns'
import type { SupervisorProposalTableRow } from './supervisorProposalTableRow'

export function useSupervisorSubmittedProposalsTableModel(
  t: TranslateFn,
  sourceRows: CompensationBudgetPlanEmployeeRestRow[],
  getEmployeeLabel: (employeeId: string) => string,
  currencyCode: string,
  selectionParams: SupervisorSubmittedProposalsSelectionParams
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employeeDisplayName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...SUPERVISOR_SUBMITTED_PROPOSALS_DATA_COLUMN_IDS
  ])

  const enrichedRows: SupervisorProposalTableRow[] = useMemo(
    () =>
      sourceRows.map(r => ({
        ...r,
        employeeDisplayName: getEmployeeLabel(r.employeeId)
      })),
    [sourceRows, getEmployeeLabel]
  )

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase()
    if (q === '') {
      return enrichedRows
    }
    return enrichedRows.filter(row => {
      const name = row.employeeDisplayName.toLowerCase()
      const just = (row.justification ?? '').toLowerCase()
      const amounts = [
        String(row.proposedSalaryIncreaseAmount),
        String(row.proposedSalaryIncreasePercent),
        String(row.proposedNewSalary)
      ].join(' ')
      const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
      const rawStatus = (row.budgetPlanStatus ?? '').toLowerCase()
      return (
        name.includes(q) || just.includes(q) || amounts.includes(q) || statusLabel.includes(q) || rawStatus.includes(q)
      )
    })
  }, [debouncedSearch, enrichedRows, t])

  const hasActiveSearch = debouncedSearch.trim() !== ''

  const emptyMessage = useMemo(() => {
    if (filteredRows.length === 0 && hasActiveSearch) {
      return t('supervisor-review-table-empty-filtered')
    }
    return t('supervisor-review-table-empty-none')
  }, [filteredRows.length, hasActiveSearch, t])

  const columns = useMemo(
    () => buildSupervisorSubmittedProposalsTableColumns(t, currencyCode, selectionParams),
    [t, currencyCode, selectionParams]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col => {
        const id = String((col as ColumnDef<SupervisorProposalTableRow> & { id?: string }).id ?? '')
        if (id === 'selection') {
          return true
        }
        return visibleColumns.includes(id)
      }),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'employeeDisplayName', label: t('supervisor-review-col-employee') },
      { id: 'proposedSalaryIncreasePercent', label: t('supervisor-review-col-increase-pct') },
      { id: 'proposedSalaryIncreaseAmount', label: t('supervisor-review-col-increase-amount') },
      { id: 'proposedNewSalary', label: t('supervisor-review-col-new-salary') },
      { id: 'budgetPlanStatus', label: t('supervisor-review-col-status') },
      { id: 'justification', label: t('supervisor-review-col-justification') }
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

  return {
    searchInput,
    setSearchInput,
    sorting,
    setSorting,
    pagination,
    visibleColumns,
    setVisibleColumns,
    filteredRows,
    emptyMessage,
    visibleTableColumns,
    sortableColumns,
    availableColumnsForDisplay,
    handlePaginationChange
  }
}
