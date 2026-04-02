import type { CompensationBudgetPlanOrganizationalUnitRow } from '../../hooks/useBudgetDistributionOrgUnitBudget'
import { resolveAbsoluteBudget } from '../../../../utils/budgetCalculations'
import { formatCurrencyCell, sortNumberOrFallback } from './budgetSetupPlanTableRows'

/** Table row: DB budget columns from `compensation_budget_plan_organizational_unit` (+ resolved amounts vs team baseline). */
export interface BudgetDistributionOrgUnitTableRow {
  id: string
  compensationBudgetPlanId: string
  organizationalUnitId: string
  organizationalUnitName: string | null
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  orgUnitBudgetStatus: string | null
  resolvedSalary: number | null
  resolvedBonus: number | null
  resolvedTotal: number | null
  displayCurrency: string
}

export function buildBudgetDistributionOrgUnitTableRows(
  sourceRows: CompensationBudgetPlanOrganizationalUnitRow[],
  teamSalaryBaseline: number,
  defaultCurrencyCode: string
): BudgetDistributionOrgUnitTableRow[] {
  return sourceRows.map(row => {
    const baseline = teamSalaryBaseline
    const displayCurrency = defaultCurrencyCode

    const salPct = row.salaryBudgetPercent
    const salAmt = row.salaryBudgetAmount
    const bonPct = row.bonusBudgetPercent
    const bonAmt = row.bonusBudgetAmount
    const salaryType = salPct > 0 ? ('percentage' as const) : ('absolute' as const)
    const salaryValue = salPct > 0 ? salPct : salAmt
    const bonusType = bonPct > 0 ? ('percentage' as const) : ('absolute' as const)
    const bonusValue = bonPct > 0 ? bonPct : bonAmt
    const resolvedSalary = resolveAbsoluteBudget(salaryType, salaryValue, baseline)
    const resolvedBonus = resolveAbsoluteBudget(bonusType, bonusValue, baseline)
    const resolvedTotal = resolvedSalary + resolvedBonus

    return {
      id: row.id,
      compensationBudgetPlanId: row.compensationBudgetPlanId,
      organizationalUnitId: row.organizationalUnitId,
      organizationalUnitName: row.organizationalUnitName,
      salaryBudgetAmount: row.salaryBudgetAmount,
      salaryBudgetPercent: row.salaryBudgetPercent,
      bonusBudgetAmount: row.bonusBudgetAmount,
      bonusBudgetPercent: row.bonusBudgetPercent,
      orgUnitBudgetStatus: row.budgetPlanStatus || null,
      resolvedSalary,
      resolvedBonus,
      resolvedTotal,
      displayCurrency
    }
  })
}

export { formatCurrencyCell, sortNumberOrFallback }
