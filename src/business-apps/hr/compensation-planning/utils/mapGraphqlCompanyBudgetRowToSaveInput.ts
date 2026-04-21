import type { SaveCompensationBudgetPlanCompanyRowInput } from '../api/saveCompensationBudgetPlan'
import type { CompensationBudgetPlanCompanyRow } from '../apps/compensation-planning/hooks/useBudgetSetupForCompany'
import { roundMoney2 } from './budgetAmountPercentSync'
import { graphqlUnknownToStringOrNull } from './graphqlUnknownToString'

export function compensationBudgetPlanCompanyRowToSaveInput(
  row: CompensationBudgetPlanCompanyRow
): SaveCompensationBudgetPlanCompanyRowInput {
  return {
    id: row.id,
    version: row.version,
    compensationBudgetPlanId: row.compensationBudgetPlanId,
    companyId: row.companyId,
    salaryBudgetAmount: row.salaryBudgetAmount,
    salaryBudgetPercent: row.salaryBudgetPercent,
    allocationAmount: row.allocationAmount,
    currentTotalSalaryCost: row.currentTotalSalaryCost,
    currencyRef: row.currencyRef
  }
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

/** Strict mapping from a GraphQL company row (no fallbacks). */
export function mapGraphqlCompanyBudgetRowToSaveInputStrict(
  raw: Record<string, unknown>
): SaveCompensationBudgetPlanCompanyRowInput {
  return {
    id: String(raw.id),
    version: num(raw.version),
    compensationBudgetPlanId: String(raw.compensationBudgetPlanId),
    companyId: String(raw.companyId),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    currencyRef: graphqlUnknownToStringOrNull(raw.currencyRef)
  }
}

/**
 * Prefer numeric fields from the GraphQL row; when a field is absent (e.g. partial role / stale shape),
 * fall back to the prior snapshot so REST UPDATE never drops `allocationAmount` or salary budget fields.
 *
 * Aligns with HR budget distribution: company `salary_budget_*` stay the pool definition; `allocationAmount`
 * can hold total salary budget deployed to org units (sum of OU `salary_budget_amount`) after HR distribute.
 */
export function mapGraphqlCompanyBudgetRowToSaveInputWithFallback(
  raw: Record<string, unknown>,
  prior: SaveCompensationBudgetPlanCompanyRowInput
): SaveCompensationBudgetPlanCompanyRowInput {
  const pickNum = (primary: unknown, fallback: number) =>
    primary !== undefined && primary !== null && String(primary).trim() !== '' ? num(primary) : fallback

  return {
    id: String(raw.id ?? prior.id),
    version: pickNum(raw.version, prior.version),
    compensationBudgetPlanId: String(raw.compensationBudgetPlanId ?? prior.compensationBudgetPlanId),
    companyId: String(raw.companyId ?? prior.companyId),
    salaryBudgetAmount: roundMoney2(pickNum(raw.salaryBudgetAmount, prior.salaryBudgetAmount)),
    salaryBudgetPercent: roundMoney2(pickNum(raw.salaryBudgetPercent, prior.salaryBudgetPercent)),
    allocationAmount: Math.max(0, roundMoney2(pickNum(raw.allocationAmount, prior.allocationAmount))),
    currentTotalSalaryCost: roundMoney2(pickNum(raw.currentTotalSalaryCost, prior.currentTotalSalaryCost)),
    currencyRef:
      raw.currencyRef !== undefined && raw.currencyRef !== null
        ? graphqlUnknownToStringOrNull(raw.currencyRef)
        : prior.currencyRef
  }
}
