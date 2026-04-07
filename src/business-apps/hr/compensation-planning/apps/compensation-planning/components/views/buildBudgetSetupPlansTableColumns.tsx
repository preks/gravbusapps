import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { BudgetPlanStatusApi } from '../../../../types/budgetPlanGraphqlEnums'
import { BudgetPlanStatusBadge } from '../shared/BudgetPlanStatusBadge'
import type { BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetSetupPlanTableRows'
import type { TranslateFn } from './budgetSetupDisplayUtils'

/** Same size as body (`text-sm`); muted + medium weight so headers stay legible without shrinking. */
const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_HEADER_RIGHT = `${TABLE_HEADER_CLASS} gba:block gba:w-full gba:text-right`
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
/** Mirrors SortingHeader inner padding so body aligns with sortable headers (see overview plans table columns). */
const TABLE_BODY_LEFT = `${TABLE_BODY} gba:block gba:w-full gba:text-left gba:pl-2`
const TABLE_BODY_NUM_RIGHT = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-right gba:pr-2`

function budgetSetupColumnHeader(t: TranslateFn, messageKey: string, align: 'left' | 'right' = 'left') {
  return function BudgetSetupColumnHeaderLabel() {
    const className = align === 'right' ? TABLE_HEADER_RIGHT : TABLE_HEADER_CLASS
    return <span className={className}>{t(messageKey)}</span>
  }
}

function formatPercentCell(value: number): string {
  if (value == null || Number.isNaN(value) || value === 0) {
    return '—'
  }
  return `${formatNumberFunction(String(value), '0.00[,]00')}%`
}

/**
 * Column size hints for TanStack Table (sorting, resizing). With `tableLayout="auto"` on the DataTable,
 * columns grow to content; these still set sensible minimums if the layout is fixed elsewhere.
 */
const STATUS_META = { align: 'left' as const, type: 'text' as const }

const COL = {
  chosenPlan: { size: 260, minSize: 220 },
  status: { size: 180, minSize: 160 },
  salaryAmount: { size: 280, minSize: 260 },
  salaryPercent: { size: 220, minSize: 200 },
  salaryBaseline: { size: 340, minSize: 320 }
} as const

export function buildBudgetSetupPlansTableColumns(
  t: TranslateFn,
  formatBudgetPlanStatus: (value: string | null | undefined) => string,
  onEditRow: (row: BudgetSetupPlanTableRow) => void
): ColumnDef<BudgetSetupPlanTableRow>[] {
  return [
    {
      id: 'budgetPlanLabel',
      accessorKey: 'budgetPlanLabel',
      header: budgetSetupColumnHeader(t, 'budget-setup-table-col-chosen-budget-plan'),
      size: COL.chosenPlan.size,
      minSize: COL.chosenPlan.minSize,
      meta: { type: 'text' },
      cell: ({ row }) => <span className={TABLE_BODY_LEFT}>{row.original.budgetPlanLabel}</span>
    },
    {
      id: 'companyBudgetStatus',
      accessorKey: 'companyBudgetStatus',
      header: budgetSetupColumnHeader(t, 'budget-setup-table-col-budget-plan-status'),
      size: COL.status.size,
      minSize: COL.status.minSize,
      meta: STATUS_META,
      sortingFn: (a, b) => {
        const la = formatBudgetPlanStatus(a.original.companyBudgetStatus) || ''
        const lb = formatBudgetPlanStatus(b.original.companyBudgetStatus) || ''
        return la.localeCompare(lb)
      },
      cell: ({ row }) => {
        const v = row.original.companyBudgetStatus
        if (!v) {
          return <span className={TABLE_BODY_LEFT}>—</span>
        }
        return (
          <div className="gba:flex gba:min-w-0 gba:w-full gba:justify-start gba:text-left gba:pl-2">
            <BudgetPlanStatusBadge status={v as BudgetPlanStatusApi} />
          </div>
        )
      }
    },
    {
      id: 'salaryBudgetAmount',
      accessorKey: 'salaryBudgetAmount',
      header: budgetSetupColumnHeader(t, 'budget-setup-table-col-salary-budget-amount', 'right'),
      size: COL.salaryAmount.size,
      minSize: COL.salaryAmount.minSize,
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
      id: 'salaryBudgetPercent',
      accessorKey: 'salaryBudgetPercent',
      header: budgetSetupColumnHeader(t, 'budget-setup-table-col-salary-budget-percent', 'right'),
      size: COL.salaryPercent.size,
      minSize: COL.salaryPercent.minSize,
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.salaryBudgetPercent),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatPercentCell(row.original.salaryBudgetPercent)}</span>
      )
    },
    {
      id: 'salaryBaseline',
      accessorKey: 'salaryBaseline',
      header: budgetSetupColumnHeader(t, 'budget-setup-table-col-salary-baseline', 'right'),
      size: COL.salaryBaseline.size,
      minSize: COL.salaryBaseline.minSize,
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.salaryBaseline),
      cell: ({ row }) => {
        const r = row.original
        return <span className={TABLE_BODY_NUM_RIGHT}>{formatCurrencyCell(r.salaryBaseline, r.displayCurrency)}</span>
      }
    },
    {
      id: 'actions',
      header: () => null,
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
                data-testid={`budget-setup-row-actions-${row.original.id}`}
                aria-label={t('compensation-planning-row-menu-aria-label')}
              >
                <DotsThreeVerticalIcon className="gba:size-4" weight="bold" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  onEditRow(row.original)
                }}
                data-testid={`budget-setup-row-edit-${row.original.id}`}
              >
                {t('compensation-planning-action-edit')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ]
}

export const BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS = [
  'budgetPlanLabel',
  'companyBudgetStatus',
  'salaryBudgetAmount',
  'salaryBudgetPercent',
  'salaryBaseline',
  'actions'
] as const
