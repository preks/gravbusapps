import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import {
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
  LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET_IDS
} from '../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../utils/budgetPlanGraphqlDebug'
import { mapCompensationBudgetPlanEmployeeGraphql } from '../utils/mapCompensationBudgetPlanEmployeeGraphql'
import type { CompensationBudgetPlanEmployeeRestRow } from '../types/compensationBudgetPlanEmployeeRestRow'
import { graphqlUnknownToString } from '../utils/graphqlUnknownToString'

function mapCompanyRowId(raw: Record<string, unknown>): { id: string; compensationBudgetPlanId: string } {
  return {
    id: graphqlUnknownToString(raw.id),
    compensationBudgetPlanId: graphqlUnknownToString(raw.compensationBudgetPlanId)
  }
}

function mapOrgRowId(raw: Record<string, unknown>): string {
  return graphqlUnknownToString(raw.id)
}

/**
 * Loads all employee budget rows for a compensation cycle (`planId`) in a company by reusing the same
 * company-budget → org-unit chain as submissions.
 */
export async function fetchCompensationBudgetPlanEmployeesForPlanAndCompany(
  graphqlClient: GraphQLClient,
  companyId: string,
  planId: string
): Promise<CompensationBudgetPlanEmployeeRestRow[]> {
  const companyResult = await graphqlClient.request<{
    CompensationBudgetPlanCompany: Record<string, unknown>[]
  }>(LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY, { companyId })

  const companyRows = (companyResult.CompensationBudgetPlanCompany ?? []).map(mapCompanyRowId)
  const matchingCompanyBudgetIds = companyRows.filter(r => r.compensationBudgetPlanId === planId).map(r => r.id)

  if (matchingCompanyBudgetIds.length === 0) {
    return []
  }

  const orgResult = await graphqlClient.request<{
    CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
  }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET_IDS, {
    compensationBudgetPlanCompanyIds: matchingCompanyBudgetIds
  })

  const orgUnitBudgetIds = (orgResult.CompensationBudgetPlanOrganizationalUnit ?? []).map(mapOrgRowId).filter(Boolean)
  if (orgUnitBudgetIds.length === 0) {
    return []
  }

  try {
    const empResult = await graphqlClient.request<{
      CompensationBudgetPlanEmployee: Record<string, unknown>[]
    }>(LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS, { orgUnitBudgetIds })
    return (empResult.CompensationBudgetPlanEmployee ?? []).map(r => mapCompensationBudgetPlanEmployeeGraphql(r))
  } catch (err) {
    logBudgetGraphqlFailure('ListCompensationBudgetPlanEmployeesByOrgUnitIds', err)
    throw err
  }
}
