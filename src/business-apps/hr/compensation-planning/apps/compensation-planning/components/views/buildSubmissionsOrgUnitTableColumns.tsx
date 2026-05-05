import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@newwork/nw-design-system'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'
import { BudgetPlanStatusBadge } from '../shared/BudgetPlanStatusBadge'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetSetupPlanTableRows'
import type { TranslateFn } from './budgetSetupDisplayUtils'

const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_HEADER_RIGHT = `${TABLE_HEADER_CLASS} gba:block gba:w-full gba:text-right`
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
const TABLE_BODY_NUM_RIGHT = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-right`
const SUBMITTED_STATUS = 'BUDGET_PLAN_SUBMITTED'

function submissionsColumnHeader(t: TranslateFn, messageKey: string, align: 'left' | 'right' = 'left') {
  return function SubmissionsColumnHeaderLabel() {
    const className = align === 'right' ? TABLE_HEADER_RIGHT : TABLE_HEADER_CLASS
    return <span className={className}>{t(messageKey)}</span>
  }
}

/** Computed allocation share: show percent including 0%; em dash only when unknown (no company pool). */
function formatAllocationSharePercentCell(value: number | null): string {
  if (value == null || Number.isNaN(value)) {
    return '—'
  }
  return `${formatNumberFunction(String(value), '0.00[,]00')}%`
}

const STATUS_META = { align: 'left' as const, type: 'text' as const }

const COL = {
  selection: { size: 48, minSize: 44 },
  orgUnit: { size: 190, minSize: 160 },
  plan: { size: 180, minSize: 150 },
  status: { size: 140, minSize: 120 },
  money: { size: 160, minSize: 140 },
  percent: { size: 130, minSize: 110 },
  proposedNewSalary: { size: 170, minSize: 145 },
  ouCurrentSalary: { size: 170, minSize: 145 }
} as const

export interface SubmissionsOrgUnitSelectionParams {
  selectedIds: ReadonlySet<string>
  busy: boolean
  selectableRowIds: ReadonlySet<string>
  onToggleRow: (id: string, checked: boolean) => void
  t: TranslateFn
}

function buildSelectionColumn(selection: SubmissionsOrgUnitSelectionParams): ColumnDef<SubmissionsOrgUnitTableRow> {
  const { selectedIds, busy, selectableRowIds, onToggleRow, t: translate } = selection

  return {
    id: 'selection',
    size: COL.selection.size,
    minSize: COL.selection.minSize,
    enableSorting: false,
    meta: { align: 'left', type: 'text' },
    header: () => <span className="gba:sr-only">{translate('submissions-select-row-header')}</span>,
    cell: ({ row }) => {
      const r = row.original
      const canSelect = selectableRowIds.has(r.id) && r.budgetPlanStatus === SUBMITTED_STATUS
      if (!canSelect) {
        return null
      }
      return (
        <div
          className="gba:flex gba:items-center"
          onClick={event => event.stopPropagation()}
          data-testid={`submissions-row-selection-${r.id}`}
        >
          <Checkbox
            checked={selectedIds.has(r.id)}
            disabled={busy}
            onCheckedChange={checked => onToggleRow(r.id, checked === true)}
            aria-label={translate('submissions-select-row-aria', { name: r.organizationalUnitName })}
            data-testid={`submissions-row-select-${r.id}`}
          />
        </div>
      )
    }
  }
}

export function buildSubmissionsOrgUnitTableColumns(
  t: TranslateFn,
  formatBudgetPlanStatus: (value: string | null | undefined) => string,
  selection?: SubmissionsOrgUnitSelectionParams
): ColumnDef<SubmissionsOrgUnitTableRow>[] {
  const columns: ColumnDef<SubmissionsOrgUnitTableRow>[] = [
    {
      id: 'organizationalUnitName',
      accessorKey: 'organizationalUnitName',
      header: submissionsColumnHeader(t, 'submissions-table-col-org-unit'),
      size: COL.orgUnit.size,
      minSize: COL.orgUnit.minSize,
      meta: { type: 'text' },
      cell: ({ row }) => <span className={`${TABLE_BODY} gba:font-medium`}>{row.original.organizationalUnitName}</span>
    },
    {
      id: 'budgetPlanLabel',
      accessorKey: 'budgetPlanLabel',
      header: submissionsColumnHeader(t, 'submissions-table-col-company-budget-plan'),
      size: COL.plan.size,
      minSize: COL.plan.minSize,
      meta: { type: 'text' },
      cell: ({ row }) => <span className={TABLE_BODY}>{row.original.budgetPlanLabel}</span>
    },
    {
      id: 'budgetPlanStatus',
      accessorKey: 'budgetPlanStatus',
      header: submissionsColumnHeader(t, 'budget-setup-table-col-budget-plan-status'),
      size: COL.status.size,
      minSize: COL.status.minSize,
      meta: STATUS_META,
      sortingFn: (a, b) => {
        const la = formatBudgetPlanStatus(a.original.budgetPlanStatus) || ''
        const lb = formatBudgetPlanStatus(b.original.budgetPlanStatus) || ''
        return la.localeCompare(lb)
      },
      cell: ({ row }) => {
        const v = row.original.budgetPlanStatus
        if (v) {
          return (
            <div className="gba:flex gba:min-w-0 gba:w-full gba:justify-start gba:text-left gba:pl-2">
              <BudgetPlanStatusBadge status={v as BudgetPlanStatusApi} label={formatBudgetPlanStatus(v)} />
            </div>
          )
        }
        return <span className={`${TABLE_BODY} gba:pl-2`}>—</span>
      }
    },
    {
      id: 'salaryBudgetAmount',
      accessorKey: 'salaryBudgetAmount',
      header: submissionsColumnHeader(t, 'submissions-table-col-department-salary-budget', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.salaryBudgetAmount),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrencyCell(r.salaryBudgetAmount, r.displayCurrency)}</span>
        )
      }
    },
    {
      id: 'allocationAmount',
      accessorKey: 'allocationAmount',
      header: submissionsColumnHeader(t, 'submissions-table-col-org-unit-allocation-amount', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.allocationAmount),
      cell: ({ row }) => {
        const r = row.original
        const isOverDepartmentBudget = r.allocationAmount > r.salaryBudgetAmount
        const overBudgetClasses = isOverDepartmentBudget
          ? 'gba:font-semibold gba:text-destructive gba:rounded gba:px-1.5 gba:py-0.5 gba:bg-destructive/10'
          : ''
        return (
          <span
            className={`${TABLE_BODY_NUM_RIGHT} ${overBudgetClasses}`}
            title={isOverDepartmentBudget ? t('submissions-allocation-exceeds-department-budget-hint') : undefined}
            data-testid={isOverDepartmentBudget ? 'submissions-allocation-amount-over-department-budget' : undefined}
          >
            {formatCurrencyCell(r.allocationAmount, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'allocationShareOfCompanyPoolPercent',
      accessorKey: 'allocationShareOfCompanyPoolPercent',
      header: submissionsColumnHeader(t, 'submissions-table-col-allocation-share-percent', 'right'),
      size: COL.percent.size,
      minSize: COL.percent.minSize,
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.allocationShareOfCompanyPoolPercent),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>
          {formatAllocationSharePercentCell(row.original.allocationShareOfCompanyPoolPercent)}
        </span>
      )
    },
    {
      id: 'proposedNewSalary',
      accessorKey: 'proposedNewSalary',
      header: submissionsColumnHeader(t, 'submissions-table-col-proposed-new-salary', 'right'),
      size: COL.proposedNewSalary.size,
      minSize: COL.proposedNewSalary.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.proposedNewSalary),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrencyCell(r.proposedNewSalary, r.displayCurrency)}</span>
        )
      }
    },
    {
      id: 'organizationalUnitCurrentTotalSalary',
      accessorKey: 'organizationalUnitCurrentTotalSalary',
      header: submissionsColumnHeader(t, 'submissions-table-col-org-unit-current-total-salary', 'right'),
      size: COL.ouCurrentSalary.size,
      minSize: COL.ouCurrentSalary.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.organizationalUnitCurrentTotalSalary),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className={TABLE_BODY_NUM_RIGHT}>
            {formatCurrencyCell(r.organizationalUnitCurrentTotalSalary, r.displayCurrency)}
          </span>
        )
      }
    }
  ]

  if (selection) {
    return [buildSelectionColumn(selection), ...columns]
  }

  return columns
}

export const SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS = [
  'organizationalUnitName',
  'budgetPlanLabel',
  'budgetPlanStatus',
  'salaryBudgetAmount',
  'allocationAmount',
  'allocationShareOfCompanyPoolPercent',
  'proposedNewSalary',
  'organizationalUnitCurrentTotalSalary'
] as const
