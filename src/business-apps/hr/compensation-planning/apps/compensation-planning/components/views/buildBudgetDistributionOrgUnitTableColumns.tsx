import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { formatLocaleDecimal } from '../../../../utils/budgetCalculations'
import type { BudgetDistributionOrgUnitTableRow } from './budgetDistributionOrgUnitTableRows'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetDistributionOrgUnitTableRows'
import type { TranslateFn } from './budgetSetupDisplayUtils'

function formatPercentCell(value: number): string {
  if (value == null || Number.isNaN(value) || value === 0) {
    return '—'
  }
  return `${formatLocaleDecimal(value, 0, 2)}%`
}

export function buildBudgetDistributionOrgUnitTableColumns(
  t: TranslateFn,
  formatEnum: (value: string | null | undefined) => string
): ColumnDef<BudgetDistributionOrgUnitTableRow>[] {
  return [
    {
      id: 'organizationalUnitName',
      accessorKey: 'organizationalUnitName',
      header: t('budget-distribution-table-col-org-unit-name'),
      accessorFn: row => row.organizationalUnitName?.trim().toLowerCase() ?? '',
      cell: ({ row }) => {
        const label = row.original.organizationalUnitName?.trim()
        return <span className="gba:text-sm gba:font-medium">{label || '—'}</span>
      },
      meta: { type: 'text' },
      size: 200,
      minSize: 140
    },
    {
      id: 'orgUnitBudgetStatus',
      accessorKey: 'orgUnitBudgetStatus',
      header: t('budget-setup-table-col-budget-plan-status'),
      size: 160,
      minSize: 120,
      meta: { type: 'text' },
      cell: ({ row }) => {
        const v = row.original.orgUnitBudgetStatus
        return <span className="gba:text-sm">{v ? formatEnum(v) : '—'}</span>
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

export const BUDGET_DISTRIBUTION_ORG_UNIT_VISIBLE_COLUMN_IDS = [
  'organizationalUnitName',
  'orgUnitBudgetStatus',
  'salaryBudgetAmount',
  'salaryBudgetPercent',
  'bonusBudgetAmount',
  'bonusBudgetPercent',
  'resolvedSalary',
  'resolvedBonus',
  'resolvedTotal'
] as const
