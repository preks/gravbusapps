import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { SubmissionsOrgUnitTableRow } from './submissionsOrgUnitTableRows'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetSetupPlanTableRows'
import type { TranslateFn } from './budgetSetupDisplayUtils'

const TABLE_HEADER_CLASS = 'gba:text-sm gba:font-medium gba:text-muted-foreground gba:leading-normal'
const TABLE_HEADER_RIGHT = `${TABLE_HEADER_CLASS} gba:block gba:w-full gba:text-right`
const TABLE_BODY = 'gba:text-sm gba:font-normal gba:text-foreground gba:leading-normal'
const TABLE_BODY_NUM = `${TABLE_BODY} gba:tabular-nums`
const TABLE_BODY_NUM_RIGHT = `${TABLE_BODY_NUM} gba:block gba:w-full gba:text-right`

function submissionsColumnHeader(t: TranslateFn, messageKey: string, align: 'left' | 'right' = 'left') {
  return function SubmissionsColumnHeaderLabel() {
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

const COL = {
  orgUnit: { size: 220, minSize: 180 },
  plan: { size: 260, minSize: 220 },
  status: { size: 180, minSize: 160 },
  money: { size: 200, minSize: 180 },
  percent: { size: 160, minSize: 140 }
} as const

export function buildSubmissionsOrgUnitTableColumns(
  t: TranslateFn,
  formatBudgetPlanStatus: (value: string | null | undefined) => string
): ColumnDef<SubmissionsOrgUnitTableRow>[] {
  return [
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
      meta: { type: 'text' },
      cell: ({ row }) => {
        const v = row.original.budgetPlanStatus
        return <span className={TABLE_BODY}>{v ? formatBudgetPlanStatus(v) : '—'}</span>
      }
    },
    {
      id: 'salaryBudgetAmount',
      accessorKey: 'salaryBudgetAmount',
      header: submissionsColumnHeader(t, 'budget-setup-table-col-salary-budget-amount', 'right'),
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
      id: 'salaryBudgetPercent',
      accessorKey: 'salaryBudgetPercent',
      header: submissionsColumnHeader(t, 'budget-setup-table-col-salary-budget-percent', 'right'),
      size: COL.percent.size,
      minSize: COL.percent.minSize,
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.salaryBudgetPercent),
      cell: ({ row }) => (
        <span className={TABLE_BODY_NUM_RIGHT}>{formatPercentCell(row.original.salaryBudgetPercent)}</span>
      )
    }
  ]
}

export const SUBMISSIONS_ORG_UNIT_TABLE_VISIBLE_COLUMN_IDS = [
  'organizationalUnitName',
  'budgetPlanLabel',
  'budgetPlanStatus',
  'salaryBudgetAmount',
  'salaryBudgetPercent'
] as const
