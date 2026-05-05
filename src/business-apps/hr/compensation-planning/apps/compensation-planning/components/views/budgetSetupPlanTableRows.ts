import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { formatCurrencyCodeAmountFirst, formatCurrencyRefForDisplay } from '../../utils/displayFormatUtils'

const SORT_FALLBACK = Number.NEGATIVE_INFINITY

export interface BudgetSetupCompanyOption {
  id: string
  name: string
  code?: string
}

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
  companyLabel: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  companyBudgetStatus: string | null
  salaryBaseline: number | null
  currencyRef: string | null
  displayCurrency: string
}

export function buildBudgetSetupPlanTableRows(
  companyBudgetPlanRows: CompensationBudgetPlanCompanyRow[],
  selectedCompanyId: string | null,
  defaultCurrencyCode: string,
  plans: CompensationBudgetPlanListItem[],
  /** When null, no rows (user must select a cycle). Otherwise only this plan’s row for the company. */
  selectedCompensationPlanId: string | null,
  companies: BudgetSetupCompanyOption[] = []
): BudgetSetupPlanTableRow[] {
  if (selectedCompensationPlanId == null) {
    return []
  }
  const companyById = new Map(companies.map(company => [company.id, company]))

  return companyBudgetPlanRows
    .filter(companyRow => selectedCompanyId == null || companyRow.companyId === selectedCompanyId)
    .filter(companyRow => companyRow.compensationBudgetPlanId === selectedCompensationPlanId)
    .map(companyRow => {
      const displayCurrency = formatCurrencyRefForDisplay(companyRow.currencyRef?.trim()) || defaultCurrencyCode
      const budgetPlanLabel = formatBudgetPlanChosenLabel(companyRow.compensationBudgetPlanId, plans)
      const company = companyById.get(companyRow.companyId)
      const companyLabel = company?.name ? company.name : companyRow.companyId

      return {
        id: companyRow.id,
        compensationBudgetPlanId: companyRow.compensationBudgetPlanId,
        budgetPlanLabel,
        companyId: companyRow.companyId,
        companyLabel,
        salaryBudgetAmount: companyRow.salaryBudgetAmount,
        salaryBudgetPercent: companyRow.salaryBudgetPercent,
        allocationAmount: companyRow.allocationAmount,
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
