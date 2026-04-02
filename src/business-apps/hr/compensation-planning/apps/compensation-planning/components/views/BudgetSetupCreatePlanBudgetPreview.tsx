import React from 'react'
import { formatCurrency, resolveAbsoluteBudget } from '../../../../utils/budgetCalculations'

export interface BudgetSetupCreatePlanBudgetPreviewProps {
  baselineAnnual: number
  salaryAmount: number
  salaryPercent: number
  bonusAmount: number
  bonusPercent: number
  currencyCode: string
  loading: boolean
  labels: {
    title: string
    baseline: string
    resolvedSalary: string
    resolvedBonus: string
    loadingHint: string
  }
}

function resolvedPool(amount: number, percent: number, baseline: number): number {
  const type = Math.abs(percent) > 1e-9 ? 'percentage' : 'absolute'
  const value = type === 'percentage' ? percent : amount
  return resolveAbsoluteBudget(type, value, baseline)
}

export const BudgetSetupCreatePlanBudgetPreview: React.FC<BudgetSetupCreatePlanBudgetPreviewProps> = ({
  baselineAnnual,
  salaryAmount,
  salaryPercent,
  bonusAmount,
  bonusPercent,
  currencyCode,
  loading,
  labels
}) => {
  const base = Number.isFinite(baselineAnnual) ? baselineAnnual : 0
  const salaryResolved = resolvedPool(salaryAmount, salaryPercent, base)
  const bonusResolved = resolvedPool(bonusAmount, bonusPercent, base)

  if (loading) {
    return (
      <div
        className="gba:rounded-md gba:border gba:border-border gba:bg-muted/40 gba:p-4 gba:text-sm gba:text-muted-foreground"
        data-testid="budget-setup-create-plan-budget-preview-loading"
      >
        {labels.loadingHint}
      </div>
    )
  }

  return (
    <div
      className="gba:space-y-3 gba:rounded-md gba:border gba:border-border gba:bg-muted/30 gba:p-4"
      data-testid="budget-setup-create-plan-budget-preview"
    >
      <p className="gba:text-sm gba:font-semibold">{labels.title}</p>
      <div className="gba:flex gba:flex-col gba:gap-2 gba:text-sm">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <span className="gba:text-muted-foreground">{labels.baseline}</span>
          <span className="gba:font-medium gba:tabular-nums">{formatCurrency(base, currencyCode)}</span>
        </div>
        <div className="gba:border-t gba:border-border gba:pt-2" />
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <span className="gba:font-medium">{labels.resolvedSalary}</span>
          <span className="gba:text-lg gba:font-semibold gba:tabular-nums">
            {formatCurrency(salaryResolved, currencyCode)}
          </span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          <span className="gba:font-medium">{labels.resolvedBonus}</span>
          <span className="gba:text-lg gba:font-semibold gba:tabular-nums">
            {formatCurrency(bonusResolved, currencyCode)}
          </span>
        </div>
      </div>
    </div>
  )
}
