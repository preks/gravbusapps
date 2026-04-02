import type { CompensationBudgetPlanCompanyRow } from '../../hooks/useBudgetSetupForCompany'
import { formatCurrency, resolveAbsoluteBudget } from '../../../../utils/budgetCalculations'

const SORT_FALLBACK = Number.NEGATIVE_INFINITY

/** Table row: fields sourced only from `compensation_budget_plan_company` (+ derived resolved amounts). */
export interface BudgetSetupPlanTableRow {
  id: string
  compensationBudgetPlanId: string
  companyId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  companyBudgetStatus: string | null
  distributionMethod: string | null
  headcount: number | null
  salaryBaseline: number | null
  currencyRef: string | null
  resolvedSalary: number | null
  resolvedBonus: number | null
  resolvedTotal: number | null
  displayCurrency: string
}

export function buildBudgetSetupPlanTableRows(
  companyRowsByPlanId: Record<string, CompensationBudgetPlanCompanyRow>,
  selectedCompanyId: string,
  teamSalaryBaseline: number,
  defaultCurrencyCode: string
): BudgetSetupPlanTableRow[] {
  return Object.values(companyRowsByPlanId)
    .filter(companyRow => companyRow.companyId === selectedCompanyId)
    .map(companyRow => {
      const baseline = companyRow.currentTotalSalaryCost > 0 ? companyRow.currentTotalSalaryCost : teamSalaryBaseline
      const displayCurrency = companyRow.currencyRef?.trim() || defaultCurrencyCode

      const salPct = companyRow.salaryBudgetPercent
      const salAmt = companyRow.salaryBudgetAmount
      const bonPct = companyRow.bonusBudgetPercent
      const bonAmt = companyRow.bonusBudgetAmount
      const salaryType = salPct > 0 ? ('percentage' as const) : ('absolute' as const)
      const salaryValue = salPct > 0 ? salPct : salAmt
      const bonusType = bonPct > 0 ? ('percentage' as const) : ('absolute' as const)
      const bonusValue = bonPct > 0 ? bonPct : bonAmt
      const resolvedSalary = resolveAbsoluteBudget(salaryType, salaryValue, baseline)
      const resolvedBonus = resolveAbsoluteBudget(bonusType, bonusValue, baseline)
      const resolvedTotal = resolvedSalary + resolvedBonus

      return {
        id: companyRow.id,
        compensationBudgetPlanId: companyRow.compensationBudgetPlanId,
        companyId: companyRow.companyId,
        salaryBudgetAmount: companyRow.salaryBudgetAmount,
        salaryBudgetPercent: companyRow.salaryBudgetPercent,
        bonusBudgetAmount: companyRow.bonusBudgetAmount,
        bonusBudgetPercent: companyRow.bonusBudgetPercent,
        companyBudgetStatus: companyRow.budgetPlanStatus || null,
        distributionMethod: companyRow.distributionMethod || null,
        headcount: companyRow.headcount,
        salaryBaseline: companyRow.currentTotalSalaryCost,
        currencyRef: companyRow.currencyRef,
        resolvedSalary,
        resolvedBonus,
        resolvedTotal,
        displayCurrency
      }
    })
}

export function formatCurrencyCell(amount: number | null, currency: string): string {
  return formatCurrency(amount, currency)
}

export function sortNumberOrFallback(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) {
    return SORT_FALLBACK
  }
  return value
}
