import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { formatBudgetPlanChosenLabel } from './budgetSetupPlanTableRows'
import { formatCurrencyRefForDisplay } from '../../utils/displayFormatUtils'

export interface SubmissionsOrgUnitGraphqlRow {
  id: string
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
}

/** One row per `compensation_budget_plan_organizational_unit` (joined for display). */
export interface SubmissionsOrgUnitTableRow {
  id: string
  organizationalUnitId: string
  organizationalUnitName: string
  budgetPlanLabel: string
  displayCurrency: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  budgetPlanStatus: string
}

export function buildSubmissionsOrgUnitTableRows(
  orgRows: SubmissionsOrgUnitGraphqlRow[],
  companyRowById: Map<string, CompensationBudgetPlanCompanyRow>,
  plans: CompensationBudgetPlanListItem[],
  orgUnitNameById: Map<string, string>,
  teamOrgUnitNameById: ReadonlyMap<string, string>,
  defaultCurrencyCode: string
): SubmissionsOrgUnitTableRow[] {
  return orgRows.map(raw => {
    const companyRow = companyRowById.get(raw.compensationBudgetPlanCompanyId)
    const displayCurrency =
      (companyRow && formatCurrencyRefForDisplay(companyRow.currencyRef?.trim())) || defaultCurrencyCode
    const budgetPlanLabel = companyRow
      ? formatBudgetPlanChosenLabel(companyRow.compensationBudgetPlanId, plans)
      : raw.compensationBudgetPlanCompanyId

    const ouId = raw.organizationalUnitId
    const nameFromChart = orgUnitNameById.get(ouId)?.trim()
    const nameFromTeam = teamOrgUnitNameById.get(ouId)?.trim()

    return {
      id: raw.id,
      organizationalUnitId: ouId,
      organizationalUnitName: nameFromChart || nameFromTeam || ouId,
      budgetPlanLabel,
      displayCurrency,
      salaryBudgetAmount: raw.salaryBudgetAmount,
      salaryBudgetPercent: raw.salaryBudgetPercent,
      budgetPlanStatus: raw.budgetPlanStatus ?? ''
    }
  })
}
