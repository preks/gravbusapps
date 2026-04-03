import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { BudgetSetupPlanTableRow } from './budgetSetupPlanTableRows'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetSetupPlanTableRows'
import type { TranslateFn } from './budgetSetupDisplayUtils'

function formatPercentCell(value: number): string {
  if (value == null || Number.isNaN(value) || value === 0) {
    return '—'
  }
  return `${formatNumberFunction(String(value), '0.00[,]00')}%`
}

export function buildBudgetSetupPlansTableColumns(
  t: TranslateFn,
  formatBudgetPlanStatus: (value: string | null | undefined) => string,
  formatDistributionMethod: (value: string | null | undefined) => string
): ColumnDef<BudgetSetupPlanTableRow>[] {
  return [
    {
      id: 'companyBudgetStatus',
      accessorKey: 'companyBudgetStatus',
      header: t('budget-setup-table-col-budget-plan-status'),
      size: 160,
      minSize: 120,
      meta: { type: 'text' },
      cell: ({ row }) => {
        const v = row.original.companyBudgetStatus
        return <span className="gba:text-sm">{v ? formatBudgetPlanStatus(v) : '—'}</span>
      }
    },
    {
      id: 'salaryBudgetAmount',
      accessorKey: 'salaryBudgetAmount',
      header: t('budget-setup-table-col-salary-budget-amount'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.salaryBudgetAmount),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:tabular-nums gba:font-mono gba:text-muted-foreground">
            {formatCurrencyCell(r.salaryBudgetAmount, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'salaryBudgetPercent',
      accessorKey: 'salaryBudgetPercent',
      header: t('budget-setup-table-col-salary-budget-percent'),
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.salaryBudgetPercent),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatPercentCell(row.original.salaryBudgetPercent)}</span>
      )
    },
    {
      id: 'bonusBudgetAmount',
      accessorKey: 'bonusBudgetAmount',
      header: t('budget-setup-table-col-bonus-budget-amount'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.bonusBudgetAmount),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:tabular-nums gba:font-mono gba:text-muted-foreground">
            {formatCurrencyCell(r.bonusBudgetAmount, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'bonusBudgetPercent',
      accessorKey: 'bonusBudgetPercent',
      header: t('budget-setup-table-col-bonus-budget-percent'),
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.bonusBudgetPercent),
      cell: ({ row }) => (
        <span className="gba:text-sm gba:tabular-nums">{formatPercentCell(row.original.bonusBudgetPercent)}</span>
      )
    },
    {
      id: 'distributionMethod',
      accessorKey: 'distributionMethod',
      header: t('budget-setup-table-col-distribution'),
      meta: { type: 'text' },
      cell: ({ row }) => {
        const v = row.original.distributionMethod
        return <span className="gba:text-sm">{v ? formatDistributionMethod(v) : '—'}</span>
      }
    },
    {
      id: 'headcount',
      accessorKey: 'headcount',
      header: t('budget-setup-table-col-headcount'),
      meta: { align: 'right', type: 'number' },
      accessorFn: row => sortNumberOrFallback(row.headcount),
      cell: ({ row }) => {
        const hc = row.original.headcount
        if (hc == null) {
          return <span className="gba:text-sm gba:tabular-nums">—</span>
        }
        return <span className="gba:text-sm gba:tabular-nums">{formatNumberFunction(String(hc), '0,0')}</span>
      }
    },
    {
      id: 'salaryBaseline',
      accessorKey: 'salaryBaseline',
      header: t('budget-setup-table-col-salary-baseline'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.salaryBaseline),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:tabular-nums gba:font-mono gba:text-muted-foreground">
            {formatCurrencyCell(r.salaryBaseline, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'currencyRef',
      accessorKey: 'currencyRef',
      header: t('budget-setup-table-col-currency'),
      meta: { type: 'text' },
      cell: ({ row }) => (
        <span className="gba:text-sm gba:font-mono gba:text-muted-foreground">{row.original.currencyRef ?? '—'}</span>
      )
    },
    {
      id: 'resolvedSalary',
      accessorKey: 'resolvedSalary',
      header: t('budget-setup-table-col-resolved-salary'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.resolvedSalary),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:tabular-nums gba:font-mono gba:text-muted-foreground">
            {formatCurrencyCell(r.resolvedSalary, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'resolvedBonus',
      accessorKey: 'resolvedBonus',
      header: t('budget-setup-table-col-resolved-bonus'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.resolvedBonus),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:tabular-nums gba:font-mono gba:text-muted-foreground">
            {formatCurrencyCell(r.resolvedBonus, r.displayCurrency)}
          </span>
        )
      }
    },
    {
      id: 'resolvedTotal',
      accessorKey: 'resolvedTotal',
      header: t('budget-setup-table-col-resolved-total'),
      meta: { align: 'right', type: 'currency' },
      accessorFn: row => sortNumberOrFallback(row.resolvedTotal),
      cell: ({ row }) => {
        const r = row.original
        return (
          <span className="gba:text-sm gba:font-medium gba:tabular-nums gba:font-mono">
            {formatCurrencyCell(r.resolvedTotal, r.displayCurrency)}
          </span>
        )
      }
    }
  ]
}

export const BUDGET_SETUP_PLANS_VISIBLE_COLUMN_IDS = [
  'companyBudgetStatus',
  'salaryBudgetAmount',
  'salaryBudgetPercent',
  'bonusBudgetAmount',
  'bonusBudgetPercent',
  'distributionMethod',
  'headcount',
  'salaryBaseline',
  'currencyRef',
  'resolvedSalary',
  'resolvedBonus',
  'resolvedTotal'
] as const
