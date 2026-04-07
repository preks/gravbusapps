import type { BudgetDistributionMethodApi, BudgetPlanStatusApi } from '../types/budgetPlanGraphqlEnums'

/** Sent with `changeMode: INSERT` on `saveCompensationBudgetPlan`. */
export interface CompensationBudgetPlanCreatePayload {
  name: string
  description: string
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  budgetPlanStatus: BudgetPlanStatusApi
}

/** Sent with `changeMode: UPDATE` — includes `version` for optimistic locking. */
export interface CompensationBudgetPlanUpdatePayload {
  id: string
  version: number
  name: string
  description: string
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  /** Omit for field-only edits; set when changing plan status (e.g. execute cycle). */
  budgetPlanStatus?: BudgetPlanStatusApi
}

export interface CreateCompensationBudgetPlanRestBody {
  compensationBudgetPlan: CompensationBudgetPlanCreatePayload
}

export function buildCreateCompensationBudgetPlanRestBody(input: {
  name: string
  description: string | null
  fiscalYear: number
  budgetPlanStatus: BudgetPlanStatusApi
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}): CreateCompensationBudgetPlanRestBody {
  return {
    compensationBudgetPlan: {
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      fiscalYear: input.fiscalYear,
      startDate: input.startDate,
      endDate: input.endDate,
      effectiveDate: input.effectiveDate,
      budgetPlanStatus: input.budgetPlanStatus
    }
  }
}

/** Payload for `saveCompensationBudgetPlan` with `changeMode: UPDATE`. */
export function buildUpdateCompensationBudgetPlanRestBody(input: {
  id: string
  version: number
  name: string
  description: string | null
  fiscalYear: number
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
}): { compensationBudgetPlan: CompensationBudgetPlanUpdatePayload } {
  return {
    compensationBudgetPlan: {
      id: input.id,
      version: input.version,
      name: input.name.trim(),
      description: input.description?.trim() ?? '',
      fiscalYear: input.fiscalYear,
      startDate: input.startDate,
      endDate: input.endDate,
      effectiveDate: input.effectiveDate
    }
  }
}

export interface CompensationBudgetPlanCompanyRestPayload {
  compensationBudgetPlan: string
  company: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: BudgetPlanStatusApi
  currentTotalSalaryCost: number
  currencyRef: string | null
  /** Optional — omitted from payloads until the product sends them again. */
  distributionMethod?: BudgetDistributionMethodApi
  headcount?: number
}

/** Sent with `changeMode: UPDATE` on `saveCompensationBudgetPlanCompany`. */
export interface CompensationBudgetPlanCompanyUpdatePayload {
  id: string
  version: number
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  currencyRef: string | null
  currentTotalSalaryCost: number
  compensationBudgetPlan: string
  company: string
}

function readStringId(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Reads `id` or nested `compensationBudgetPlan.id` from a REST-shaped object. */
function extractPlanIdFromRecord(rec: Record<string, unknown>): string | null {
  const direct = readStringId(rec.id)
  if (direct) {
    return direct
  }
  const plan = rec.compensationBudgetPlan
  if (plan && typeof plan === 'object') {
    return readStringId((plan as Record<string, unknown>).id)
  }
  return null
}

export function extractCreatedCompensationBudgetPlanId(response: unknown): string | null {
  if (response == null || typeof response !== 'object') {
    return null
  }
  const r = response as Record<string, unknown>
  const fromRoot = extractPlanIdFromRecord(r)
  if (fromRoot) {
    return fromRoot
  }
  const data = r.data
  if (data && typeof data === 'object') {
    return extractPlanIdFromRecord(data as Record<string, unknown>)
  }
  return null
}

/** Reads employee budget row id from `saveCompensationBudgetPlanEmployee` REST response. */
export function extractCreatedCompensationBudgetPlanEmployeeId(response: unknown): string | null {
  if (response == null || typeof response !== 'object') {
    return null
  }
  const r = response as Record<string, unknown>
  if (typeof r.id === 'string') {
    return r.id
  }
  const row = r.compensationBudgetPlanEmployee
  if (row && typeof row === 'object') {
    const rid = (row as Record<string, unknown>).id
    if (typeof rid === 'string') {
      return rid
    }
  }
  const data = r.data
  if (data && typeof data === 'object') {
    const did = (data as Record<string, unknown>).id
    if (typeof did === 'string') {
      return did
    }
  }
  return null
}

export function extractCreatedCompensationBudgetPlanCompanyId(response: unknown): string | null {
  if (response == null || typeof response !== 'object') {
    return null
  }
  const r = response as Record<string, unknown>
  if (typeof r.id === 'string') {
    return r.id
  }
  const row = r.compensationBudgetPlanCompany
  if (row && typeof row === 'object') {
    const rid = (row as Record<string, unknown>).id
    if (typeof rid === 'string') {
      return rid
    }
  }
  const data = r.data
  if (data && typeof data === 'object') {
    const did = (data as Record<string, unknown>).id
    if (typeof did === 'string') {
      return did
    }
  }
  return null
}
