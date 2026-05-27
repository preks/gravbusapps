import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate } from '@/common/utils/windowUtils'
import type { CompensationBudgetPlanRow } from '../../hooks/useBudgetPlansTable'
import type { TranslateFn } from './budgetSetupDisplayUtils'
function formatPlanDate(value: string | null | undefined): string {
  if (value == null || value === '') {
    return '—'
  }
  return formatDate(value, 'date.medium') ?? '—'
}

export function buildBudgetPlanTableColumns(
  t: TranslateFn,
  formatStatus: (v: string) => string
): ColumnDef<CompensationBudgetPlanRow>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: t('budget-plan-table-col-name'),
      cell: ({ row }) => <span className="gba:text-sm gba:font-medium">{row.original.name || '—'}</span>,
      meta: { type: 'text' },
      size: 200,
      minSize: 140
    },
    {
      id: 'budgetPlanStatus',
      accessorKey: 'budgetPlanStatus',
      header: t('budget-plan-table-col-status'),
      cell: ({ row }) => <span className="gba:text-sm">{formatStatus(row.original.budgetPlanStatus)}</span>,
      meta: { type: 'text' }
    },
    {
      id: 'startDate',
      accessorKey: 'startDate',
      header: t('budget-plan-table-col-start-date'),
      cell: ({ row }) => <span className="gba:text-sm gba:tabular-nums">{formatPlanDate(row.original.startDate)}</span>,
      meta: { type: 'text' }
    },
    {
      id: 'endDate',
      accessorKey: 'endDate',
      header: t('budget-plan-table-col-end-date'),
      cell: ({ row }) => <span className="gba:text-sm gba:tabular-nums">{formatPlanDate(row.original.endDate)}</span>,
      meta: { type: 'text' }
    },
    {
      id: 'effectiveDate',
      accessorKey: 'effectiveDate',
      header: t('budget-plan-table-col-effective-date'),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatPlanDate(row.original.effectiveDate)}</span>
      ),
      meta: { type: 'text' }
    },
    {
      id: 'description',
      accessorKey: 'description',
      header: t('budget-plan-table-col-description'),
      cell: ({ row }) => {
        const d = row.original.description?.trim()
        return <span className="gba:text-sm gba:text-muted-foreground">{d || '—'}</span>
      },
      meta: { type: 'text' },
      size: 240,
      minSize: 120
    }
  ]
}

export const BUDGET_PLAN_TABLE_VISIBLE_COLUMN_IDS = [
  'name',
  'budgetPlanStatus',
  'startDate',
  'endDate',
  'effectiveDate',
  'description'
] as const
