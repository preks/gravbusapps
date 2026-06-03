import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import {
  formatBudgetPlanStatusLabelForDisplay,
  type TranslateFn
} from '../../planning/components/views/budgetSetupDisplayUtils'
import {
  MANAGER_TEAM_SUBMITTED_PROPOSALS_DATA_COLUMN_IDS,
  buildSupervisorSubmittedProposalsTableColumns
} from './buildSupervisorSubmittedProposalsTableColumns'
import type { SupervisorProposalTableRow } from './supervisorProposalTableRow'

/**
 * Data table state for the manager team’s submitted proposals (read-only; no selection column).
 */
export function useManagerTeamSubmittedProposalsTableModel(
  t: TranslateFn,
  sourceRows: CompensationBudgetPlanEmployeeRestRow[],
  getEmployeeLabel: (employeeId: string) => string,
  currencyCode: string,
  onEditSentBackFromMenu: (row: SupervisorProposalTableRow) => void
) {
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'employeeDisplayName', desc: false }])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => [
    ...MANAGER_TEAM_SUBMITTED_PROPOSALS_DATA_COLUMN_IDS
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
      const amounts = [
        String(row.proposedSalaryIncreaseAmount),
        String(row.proposedSalaryIncreasePercent),
        String(row.proposedNewSalary)
      ].join(' ')
      const statusLabel = formatBudgetPlanStatusLabelForDisplay(row.budgetPlanStatus, t).toLowerCase()
      const rawStatus = (row.budgetPlanStatus ?? '').toLowerCase()
      return name.includes(q) || amounts.includes(q) || statusLabel.includes(q) || rawStatus.includes(q)
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
    () =>
      buildSupervisorSubmittedProposalsTableColumns(t, currencyCode, undefined, {
        onEditSentBack: onEditSentBackFromMenu
      }),
    [t, currencyCode, onEditSentBackFromMenu]
  )

  const visibleTableColumns = useMemo(
    () =>
      columns.filter(col => {
        const id = String((col as ColumnDef<SupervisorProposalTableRow> & { id?: string }).id ?? '')
        return visibleColumns.includes(id)
      }),
    [columns, visibleColumns]
  )

  const sortableColumns = useMemo(
    () => [
      { id: 'employeeDisplayName', label: t('supervisor-review-col-employee') },
      { id: 'budgetPlanStatus', label: t('supervisor-review-col-status') },
      { id: 'proposedSalaryIncreasePercent', label: t('supervisor-review-col-increase-pct') },
      { id: 'proposedSalaryIncreaseAmount', label: t('supervisor-review-col-increase-amount') },
      { id: 'proposedNewSalary', label: t('supervisor-review-col-new-salary') },
      { id: 'actions', label: t('manager-team-proposals-col-actions') }
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
