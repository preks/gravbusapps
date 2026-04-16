import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@newwork/nw-design-system'
import { formatCurrency, formatPercentage } from '@/common/utils/numberFormatter'
import { BudgetPlanStatusBadge } from '../../compensation-planning/components/shared/BudgetPlanStatusBadge'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'
import { sortNumberOrFallback } from '../../compensation-planning/components/views/budgetSetupPlanTableRows'
import {
  formatBudgetPlanStatusLabelForDisplay,
  type TranslateFn
} from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import type { SupervisorProposalTableRow } from './supervisorProposalTableRow'

const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_HEADER_RIGHT = `${TABLE_HEADER_CLASS} gba:block gba:w-full gba:text-right`
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
const TABLE_BODY_NUM_RIGHT = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-right`

function columnHeader(t: TranslateFn, messageKey: string, align: 'left' | 'right' = 'left') {
  return function SupervisorProposalColumnHeader() {
    const className = align === 'right' ? TABLE_HEADER_RIGHT : TABLE_HEADER_CLASS
    return <span className={className}>{t(messageKey)}</span>
  }
}

const COL = {
  selection: { size: 48, minSize: 44 },
  employee: { size: 220, minSize: 160 },
  pct: { size: 120, minSize: 100 },
  money: { size: 140, minSize: 120 },
  status: { size: 180, minSize: 160 }
} as const

const STATUS_META = { align: 'left' as const, type: 'text' as const }

export interface SupervisorSubmittedProposalsSelectionParams {
  selectedIds: ReadonlySet<string>
  busy: boolean
  allSubmittedSelected: boolean
  someSubmittedSelected: boolean
  /** Employee budget row ids that may be selected (submitted only; drafts are read-only in the grid). */
  selectableRowIds: ReadonlySet<string>
  submittedRowCount: number
  onToggleRow: (id: string, checked: boolean) => void
  onSelectAllSubmitted: (select: boolean) => void
  getEmployeeLabel: (employeeId: string) => string
  t: TranslateFn
}

export function buildSupervisorSubmittedProposalsTableColumns(
  t: TranslateFn,
  currencyCode: string,
  selection: SupervisorSubmittedProposalsSelectionParams
): ColumnDef<SupervisorProposalTableRow>[] {
  const {
    selectedIds,
    busy,
    allSubmittedSelected,
    someSubmittedSelected,
    selectableRowIds,
    submittedRowCount,
    onToggleRow,
    onSelectAllSubmitted,
    getEmployeeLabel,
    t: translate
  } = selection

  const selectionColumn: ColumnDef<SupervisorProposalTableRow> = {
    id: 'selection',
    size: COL.selection.size,
    minSize: COL.selection.minSize,
    enableSorting: false,
    meta: { align: 'left', type: 'text' },
    header: () => (
      <Checkbox
        checked={allSubmittedSelected}
        ref={el => {
          if (el) {
            ;(el as HTMLButtonElement & { indeterminate?: boolean }).indeterminate = someSubmittedSelected
          }
        }}
        disabled={busy || submittedRowCount === 0}
        onCheckedChange={checked => onSelectAllSubmitted(checked === true)}
        aria-label={translate('supervisor-review-select-all-aria')}
        data-testid="supervisor-review-select-all"
      />
    ),
    cell: ({ row }) => {
      const r = row.original
      const canSelect = selectableRowIds.has(r.id)
      return (
        <Checkbox
          checked={selectedIds.has(r.id)}
          disabled={busy || !canSelect}
          onCheckedChange={checked => onToggleRow(r.id, checked === true)}
          aria-label={
            canSelect
              ? translate('supervisor-review-row-select-aria', {
                  name: getEmployeeLabel(r.employeeId)
                })
              : translate('supervisor-review-row-draft-checkbox-aria', {
                  name: getEmployeeLabel(r.employeeId)
                })
          }
          data-testid={`supervisor-review-row-select-${r.id}`}
        />
      )
    }
  }

  return [
    selectionColumn,
    {
      id: 'employeeDisplayName',
      accessorKey: 'employeeDisplayName',
      header: columnHeader(t, 'supervisor-review-col-employee'),
      size: COL.employee.size,
      minSize: COL.employee.minSize,
      meta: { type: 'text' },
      cell: ({ row }) => <span className={`${TABLE_BODY} gba:font-medium`}>{row.original.employeeDisplayName}</span>
    },
    {
      id: 'proposedSalaryIncreasePercent',
      accessorKey: 'proposedSalaryIncreasePercent',
      header: columnHeader(t, 'supervisor-review-col-increase-pct', 'right'),
      size: COL.pct.size,
      minSize: COL.pct.minSize,
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.proposedSalaryIncreasePercent),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatPercentage(row.original.proposedSalaryIncreasePercent, 1)}</span>
      )
    },
    {
      id: 'proposedSalaryIncreaseAmount',
      accessorKey: 'proposedSalaryIncreaseAmount',
      header: columnHeader(t, 'supervisor-review-col-increase-amount', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.proposedSalaryIncreaseAmount),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>
          {formatCurrency(row.original.proposedSalaryIncreaseAmount, currencyCode)}
        </span>
      )
    },
    {
      id: 'proposedNewSalary',
      accessorKey: 'proposedNewSalary',
      header: columnHeader(t, 'supervisor-review-col-new-salary', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.proposedNewSalary),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrency(row.original.proposedNewSalary, currencyCode)}</span>
      )
    },
    {
      id: 'budgetPlanStatus',
      accessorKey: 'budgetPlanStatus',
      header: columnHeader(t, 'supervisor-review-col-status'),
      size: COL.status.size,
      minSize: COL.status.minSize,
      meta: STATUS_META,
      sortingFn: (a, b) => {
        const la = formatBudgetPlanStatusLabelForDisplay(a.original.budgetPlanStatus, t) || ''
        const lb = formatBudgetPlanStatusLabelForDisplay(b.original.budgetPlanStatus, t) || ''
        return la.localeCompare(lb)
      },
      cell: ({ row }) => {
        const v = row.original.budgetPlanStatus
        if (v) {
          return (
            <div className="gba:flex gba:min-w-0 gba:w-full gba:justify-start gba:text-left gba:pl-2">
              <BudgetPlanStatusBadge status={v as BudgetPlanStatusApi} />
            </div>
          )
        }
        return <span className={`${TABLE_BODY} gba:pl-2`}>—</span>
      }
    }
  ]
}

/** Data column ids (excludes selection) for column visibility. */
export const SUPERVISOR_SUBMITTED_PROPOSALS_DATA_COLUMN_IDS = [
  'employeeDisplayName',
  'proposedSalaryIncreasePercent',
  'proposedSalaryIncreaseAmount',
  'proposedNewSalary',
  'budgetPlanStatus'
] as const
