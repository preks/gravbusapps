import type { RestClient } from '@/common/network/rest/RestClient'
import { saveCompensationBudgetPlan, saveCompensationBudgetPlanEmployee } from './saveCompensationBudgetPlan'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'
import { buildExecuteEmployeeProposalBody } from '../utils/buildExecuteEmployeeProposalRestBody'
import { buildCompensationBudgetPlanUpdateExecutedBody } from '../utils/buildCompensationBudgetPlanExecuteRestBodies'
import type { CompensationBudgetPlanRowSnapshot } from '../utils/buildCompensationBudgetPlanExecuteRestBodies'
import { areAllEmployeeProposalsResolvedForExecution } from '../utils/compensationStatusFlow'

/**
 * HR "Execute cycle": mark APPROVED employee rows EXECUTED, then mark the compensation plan EXECUTED.
 * Salary/bonus BPMN (`adjustEmployeeSalary` / `grantEmployeeBonus`) are expected to be triggered by the
 * backend when appropriate, or via separate process integration — this client uses the same REST shapes
 * as the rest of compensation planning.
 */
export async function executeCompensationCycleForPlan(
  restClient: RestClient,
  accessToken: string,
  employeeRows: CompensationBudgetPlanEmployeeRestRow[],
  planSnapshot: CompensationBudgetPlanRowSnapshot
): Promise<void> {
  if (employeeRows.length === 0) {
    throw new Error('Execution blocked: no employee proposals were found for this cycle in the selected company.')
  }

  const statuses = employeeRows.map(r => r.budgetPlanStatus)
  if (!areAllEmployeeProposalsResolvedForExecution(statuses)) {
    throw new Error(
      'Execution blocked: every employee proposal must be APPROVED or REJECTED (no DRAFT, SUBMITTED, or SENT_BACK).'
    )
  }

  const approved = employeeRows.filter(r => r.budgetPlanStatus === 'BUDGET_PLAN_APPROVED')
  for (const row of approved) {
    const body = buildExecuteEmployeeProposalBody(row)
    await saveCompensationBudgetPlanEmployee(restClient, accessToken, body)
  }

  const planBody = buildCompensationBudgetPlanUpdateExecutedBody(planSnapshot)
  await saveCompensationBudgetPlan(restClient, accessToken, planBody)
}
