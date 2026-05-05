import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../hooks/useBudgetSetupForCompany'
import { resolveCompanySalaryIncreasePool } from '../../../../utils/budgetCalculations'
import { roundMoney2 } from '../../../../utils/budgetAmountPercentSync'
import { formatBudgetPlanChosenLabel } from './budgetSetupPlanTableRows'
import { formatCurrencyRefForDisplay } from '../../utils/displayFormatUtils'

export interface SubmissionsOrgUnitGraphqlRow {
  id: string
  version: number
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
}

export interface SubmissionsEmployeeSalaryAdjustmentRow {
  employeeId: string
  newAnnualGrossSalary: number
  requestedPercent: number
}

/** One row per `compensation_budget_plan_organizational_unit` (joined for display). */
export interface SubmissionsOrgUnitTableRow {
  /** `compensation_budget_plan_organizational_unit.id` (REST/GraphQL org-unit budget row; pass as plan OU id). */
  id: string
  /** Optimistic locking — required for REST UPDATE. */
  version: number
  /** Organizational unit entity id (org chart). */
  organizationalUnitId: string
  organizationalUnitName: string
  /** Parent `compensation_budget_plan_company.id`. */
  compensationBudgetPlanCompanyId: string
  budgetPlanLabel: string
  displayCurrency: string
  /** HR slice per department (`salary_budget_amount`), rounded for display. */
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  /** Employee-level roll-up (`allocation_amount`); empty until distributed to employees. */
  allocationAmount: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  /**
   * Department salary budget as a share of the parent company salary-increase pool.
   * Display-only — derived from `salary_budget_amount` vs company pool.
   */
  allocationShareOfCompanyPoolPercent: number | null
  budgetPlanStatus: string
  /** Compensation cycle effective date used by salary adjustment execution. */
  effectiveDate: string | null
  /** Aggregated annual salary for employees in this org unit (workforce baseline). */
  organizationalUnitCurrentTotalSalary: number
  /** Sum of employee `proposed_new_salary` for this org-unit budget row (GraphQL does not expose OU-level field). */
  proposedNewSalary: number
  /** Employee-level salary adjustments to execute when the submitted department is selected. */
  salaryAdjustments: SubmissionsEmployeeSalaryAdjustmentRow[]
}

export function buildSubmissionsOrgUnitTableRows(
  orgRows: SubmissionsOrgUnitGraphqlRow[],
  companyRowById: Map<string, CompensationBudgetPlanCompanyRow>,
  plans: CompensationBudgetPlanListItem[],
  orgUnitNameById: Map<string, string>,
  teamOrgUnitNameById: ReadonlyMap<string, string>,
  orgUnitCurrentTotalSalaryById: ReadonlyMap<string, number>,
  proposedNewSalarySumByOrgUnitBudgetRowId: ReadonlyMap<string, number>,
  salaryAdjustmentsByOrgUnitBudgetRowId: ReadonlyMap<string, SubmissionsEmployeeSalaryAdjustmentRow[]>,
  defaultCurrencyCode: string
): SubmissionsOrgUnitTableRow[] {
  return orgRows.map(raw => {
    const companyRow = companyRowById.get(raw.compensationBudgetPlanCompanyId)
    const displayCurrency =
      (companyRow && formatCurrencyRefForDisplay(companyRow.currencyRef?.trim())) || defaultCurrencyCode
    const budgetPlanLabel = companyRow
      ? formatBudgetPlanChosenLabel(companyRow.compensationBudgetPlanId, plans)
      : raw.compensationBudgetPlanCompanyId
    const effectiveDate =
      companyRow == null
        ? null
        : (plans.find(plan => plan.id === companyRow.compensationBudgetPlanId)?.effectiveDate ?? null)

    const ouId = raw.organizationalUnitId
    const nameFromChart = orgUnitNameById.get(ouId)?.trim()
    const nameFromTeam = teamOrgUnitNameById.get(ouId)?.trim()

    const salaryBudget = roundMoney2(raw.salaryBudgetAmount)
    const alloc = roundMoney2(raw.allocationAmount)
    const companyPool =
      companyRow == null
        ? 0
        : resolveCompanySalaryIncreasePool({
            salaryBudgetAmount: companyRow.salaryBudgetAmount,
            salaryBudgetPercent: companyRow.salaryBudgetPercent,
            currentTotalSalaryCost: companyRow.currentTotalSalaryCost
          })
    const allocationShareOfCompanyPoolPercent =
      companyPool > 0 && Number.isFinite(salaryBudget) ? Math.round((10000 * salaryBudget) / companyPool) / 100 : null

    return {
      id: raw.id,
      version: raw.version,
      organizationalUnitId: ouId,
      organizationalUnitName: nameFromChart || nameFromTeam || ouId,
      compensationBudgetPlanCompanyId: raw.compensationBudgetPlanCompanyId,
      budgetPlanLabel,
      displayCurrency,
      salaryBudgetAmount: salaryBudget,
      salaryBudgetPercent: raw.salaryBudgetPercent,
      allocationAmount: alloc,
      bonusBudgetAmount: raw.bonusBudgetAmount,
      bonusBudgetPercent: raw.bonusBudgetPercent,
      allocationShareOfCompanyPoolPercent,
      budgetPlanStatus: raw.budgetPlanStatus ?? '',
      effectiveDate,
      organizationalUnitCurrentTotalSalary: roundMoney2(orgUnitCurrentTotalSalaryById.get(ouId) ?? 0),
      proposedNewSalary: roundMoney2(proposedNewSalarySumByOrgUnitBudgetRowId.get(raw.id) ?? 0),
      salaryAdjustments: salaryAdjustmentsByOrgUnitBudgetRowId.get(raw.id) ?? []
    }
  })
}
