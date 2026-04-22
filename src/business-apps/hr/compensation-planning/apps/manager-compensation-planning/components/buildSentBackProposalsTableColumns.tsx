import type { ColumnDef } from '@tanstack/react-table'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import { BudgetPlanStatusBadge } from '../../compensation-planning/components/shared/BudgetPlanStatusBadge'
import type { BudgetPlanStatusApi } from '../../../types/budgetPlanGraphqlEnums'
import { sortNumberOrFallback } from '../../compensation-planning/components/views/budgetSetupPlanTableRows'
import {
  formatBudgetPlanStatusLabelForDisplay,
  type TranslateFn
} from '../../compensation-planning/components/views/budgetSetupDisplayUtils'
import type { SentBackProposalTableRow } from './sentBackProposalTableRow'

const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_HEADER_RIGHT = `${TABLE_HEADER_CLASS} gba:block gba:w-full gba:text-right`
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
const TABLE_BODY_NUM_RIGHT = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-right`

function columnHeader(t: TranslateFn, messageKey: string, align: 'left' | 'right' = 'left') {
  return function SentBackColumnHeader() {
    const className = align === 'right' ? TABLE_HEADER_RIGHT : TABLE_HEADER_CLASS
    return <span className={className}>{t(messageKey)}</span>
  }
}

const COL = {
  employee: { size: 220, minSize: 180 },
  status: { size: 170, minSize: 150 },
  money: { size: 140, minSize: 120 },
  pct: { size: 110, minSize: 96 },
  actions: { size: 56, minSize: 48 }
} as const

const STATUS_META = { align: 'left' as const, type: 'text' as const }

export function buildSentBackProposalsTableColumns(
  t: TranslateFn,
  currencyCode: string,
  onEditRow: (row: SentBackProposalTableRow) => void
): ColumnDef<SentBackProposalTableRow>[] {
  return [
    {
      id: 'employeeDisplayName',
      accessorKey: 'employeeDisplayName',
      header: columnHeader(t, 'sent-back-col-employee'),
      size: COL.employee.size,
      minSize: COL.employee.minSize,
      meta: { type: 'text' },
      cell: ({ row }) => <span className={`${TABLE_BODY} gba:font-medium`}>{row.original.employeeDisplayName}</span>
    },
    {
      id: 'budgetPlanStatus',
      accessorKey: 'budgetPlanStatus',
      header: columnHeader(t, 'sent-back-col-status'),
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
        return (
          <div className="gba:flex gba:min-w-0 gba:w-full gba:justify-start gba:text-left">
            <BudgetPlanStatusBadge
              status={v as BudgetPlanStatusApi}
              label={formatBudgetPlanStatusLabelForDisplay(v, t)}
            />
          </div>
        )
      }
    },
    {
      id: 'allocationAmount',
      accessorKey: 'allocationAmount',
      header: columnHeader(t, 'sent-back-col-allocation', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.allocationAmount),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrency(row.original.allocationAmount, currencyCode)}</span>
      )
    },
    {
      id: 'proposedSalaryIncreaseAmount',
      accessorKey: 'proposedSalaryIncreaseAmount',
      header: columnHeader(t, 'sent-back-col-increase-amount', 'right'),
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
      id: 'proposedSalaryIncreasePercent',
      accessorKey: 'proposedSalaryIncreasePercent',
      header: columnHeader(t, 'sent-back-col-increase-pct', 'right'),
      size: COL.pct.size,
      minSize: COL.pct.minSize,
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.proposedSalaryIncreasePercent),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>
          {`${row.original.proposedSalaryIncreasePercent.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`}
        </span>
      )
    },
    {
      id: 'proposedNewSalary',
      accessorKey: 'proposedNewSalary',
      header: columnHeader(t, 'sent-back-col-new-salary', 'right'),
      size: COL.money.size,
      minSize: COL.money.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.proposedNewSalary),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrency(row.original.proposedNewSalary, currencyCode)}</span>
      )
    },
    {
      id: 'actions',
      header: () => null,
      size: COL.actions.size,
      minSize: COL.actions.minSize,
      meta: { align: 'right' as const, type: 'text' as const },
      enableSorting: false,
      cell: ({ row }) => (
        <div className="gba:flex gba:w-full gba:justify-end gba:pr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gba:h-8 gba:w-8 gba:p-0"
                data-testid={`sent-back-row-actions-${row.original.id}`}
                aria-label={t('sent-back-row-menu-aria')}
              >
                <DotsThreeVerticalIcon className="gba:size-4" weight="bold" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onEditRow(row.original)}
                data-testid={`sent-back-row-edit-${row.original.id}`}
              >
                {t('sent-back-action-edit')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ]
}

export const SENT_BACK_PROPOSALS_VISIBLE_COLUMN_IDS = [
  'employeeDisplayName',
  'budgetPlanStatus',
  'allocationAmount',
  'proposedSalaryIncreaseAmount',
  'proposedSalaryIncreasePercent',
  'proposedNewSalary',
  'actions'
] as const
