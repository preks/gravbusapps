import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { formatCurrencyCodeAmountFirst, formatCurrencyRefForDisplay } from '../../utils/displayFormatUtils'

const SORT_FALLBACK = Number.NEGATIVE_INFINITY

export function formatBudgetPlanChosenLabel(planId: string, plans: CompensationBudgetPlanListItem[]): string {
  const plan = plans.find(p => p.id === planId)
  if (!plan) {
    return planId
  }
  return `${plan.name} (${String(plan.fiscalYear)})`
}

/** Table row: fields sourced from `compensation_budget_plan_company`. */
export interface BudgetSetupPlanTableRow {
  id: string
  compensationBudgetPlanId: string
  /** Resolved from `plans` for display (name + fiscal year). */
  budgetPlanLabel: string
  companyId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  companyBudgetStatus: string | null
  salaryBaseline: number | null
  currencyRef: string | null
  displayCurrency: string
}

export function buildBudgetSetupPlanTableRows(
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[],
  selectedCompanyId: string,
  defaultCurrencyCode: string,
  plans: CompensationBudgetPlanListItem[]
): BudgetSetupPlanTableRow[] {
  return companyBudgetPlanRows
    .filter(companyRow => companyRow.companyId === selectedCompanyId)
    .map(companyRow => {
      const displayCurrency = formatCurrencyRefForDisplay(companyRow.currencyRef?.trim()) || defaultCurrencyCode
      const budgetPlanLabel = formatBudgetPlanChosenLabel(companyRow.compensationBudgetPlanId, plans)

      return {
        id: companyRow.id,
        compensationBudgetPlanId: companyRow.compensationBudgetPlanId,
        budgetPlanLabel,
        companyId: companyRow.companyId,
        salaryBudgetAmount: companyRow.salaryBudgetAmount,
        salaryBudgetPercent: companyRow.salaryBudgetPercent,
        companyBudgetStatus: companyRow.budgetPlanStatus || null,
        salaryBaseline: companyRow.currentTotalSalaryCost,
        currencyRef: companyRow.currencyRef,
        displayCurrency
      }
    })
}

export function formatCurrencyCell(amount: number | null, currency: string): string {
  return formatCurrencyCodeAmountFirst(amount, currency)
}

export function sortNumberOrFallback(value: number | null | undefined): number {
  if (value == null || Number.isNaN(value)) {
    return SORT_FALLBACK
  }
  return value
}
