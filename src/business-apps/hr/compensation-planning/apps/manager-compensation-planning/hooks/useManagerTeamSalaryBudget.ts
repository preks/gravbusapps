import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type {
  CompensationBudgetPlanCompanyRow,
  CompensationBudgetPlanListItem
} from '../../compensation-planning/hooks/useBudgetSetupForCompany'
import {
  GET_MANAGER_COMPENSATION_BUDGET_CONTEXT,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from '../../../utils/graphqlUnknownToString'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'

/** Snapshot of one `compensation_budget_plan_organizational_unit` row (same fields as LIST by company budget). */
export interface ManagerOrgUnitBudgetSnapshot {
  id: string
  version: number
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
}

interface CompanyBudgetPlanOption {
  id: string
  compensationBudgetPlanId: string
  label: string
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function fillPlanListItem(
  p: Partial<CompensationBudgetPlanListItem> & { id: string; name?: string }
): CompensationBudgetPlanListItem {
  return {
    id: p.id,
    name: p.name ?? '',
    description: p.description ?? null,
    fiscalYear: typeof p.fiscalYear === 'number' && !Number.isNaN(p.fiscalYear) ? p.fiscalYear : 0,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    effectiveDate: p.effectiveDate ?? null,
    budgetPlanStatus: p.budgetPlanStatus ?? ''
  }
}

function sortPlans(list: CompensationBudgetPlanListItem[]): CompensationBudgetPlanListItem[] {
  return [...list].sort((a, b) => {
    const fy = (b.fiscalYear ?? 0) - (a.fiscalYear ?? 0)
    if (fy !== 0) {
      return fy
    }
    return a.name.localeCompare(b.name)
  })
}

function mapCompanyRow(raw: Record<string, unknown>): CompensationBudgetPlanCompanyRow {
  return {
    id: graphqlUnknownToString(raw.id),
    version: num(raw.version),
    compensationBudgetPlanId: graphqlUnknownToString(raw.compensationBudgetPlanId),
    companyId: graphqlUnknownToString(raw.companyId),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: graphqlUnknownToString(raw.budgetPlanStatus),
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: graphqlUnknownToString(raw.distributionMethod),
    headcount: num(raw.headcount),
    currencyRef: graphqlUnknownToStringOrNull(raw.currencyRef)
  }
}

function buildCompanyBudgetPlanOptions(
  companyRows: CompensationBudgetPlanCompanyRow[],
  plans: CompensationBudgetPlanListItem[]
): CompanyBudgetPlanOption[] {
  const planById = new Map(plans.map(p => [p.id, p]))
  const usedLabels = new Set<string>()
  const options: CompanyBudgetPlanOption[] = []

  for (const row of companyRows) {
    const plan = planById.get(row.compensationBudgetPlanId)
    if (!plan) {
      continue
    }
    let label = `${plan.name} (${plan.fiscalYear})`
    if (usedLabels.has(label)) {
      label = `${label} · ${row.id.slice(0, 8)}`
    }
    usedLabels.add(label)
    options.push({
      id: row.id,
      compensationBudgetPlanId: row.compensationBudgetPlanId,
      label
    })
  }

  return options
}

function pickLatestCompanyBudgetRowId(
  options: CompanyBudgetPlanOption[],
  planById: Map<string, CompensationBudgetPlanListItem>
): string | null {
  if (options.length === 0) {
    return null
  }
  const sorted = [...options].sort((a, b) => {
    const fa = planById.get(a.compensationBudgetPlanId)?.fiscalYear ?? 0
    const fb = planById.get(b.compensationBudgetPlanId)?.fiscalYear ?? 0
    if (fb !== fa) {
      return fb - fa
    }
    return a.label.localeCompare(b.label)
  })
  return sorted[0]?.id ?? null
}

/** Distinct org unit ids from rows shown in the team table. */
function orgUnitIdsFromTeamMembers(teamMembers: TeamMemberCompensationData[]): Set<string> {
  const ids = new Set<string>()
  for (const m of teamMembers) {
    if (m.organizationalUnitId) {
      ids.add(m.organizationalUnitId)
    }
  }
  return ids
}

function buildManagerOrgUnitMapsFromRows(rows: Array<Record<string, unknown>>): {
  ouPlanRowMap: Map<string, string>
  snapshotByPlanRowId: Map<string, ManagerOrgUnitBudgetSnapshot>
} {
  const ouPlanRowMap = new Map<string, string>()
  const snapshotByPlanRowId = new Map<string, ManagerOrgUnitBudgetSnapshot>()
  for (const r of rows) {
    const ouId = graphqlUnknownToString(r.organizationalUnitId)
    const rowId = graphqlUnknownToString(r.id)
    if (ouId && rowId && !ouPlanRowMap.has(ouId)) {
      ouPlanRowMap.set(ouId, rowId)
    }
    if (rowId) {
      snapshotByPlanRowId.set(rowId, {
        id: rowId,
        version: num(r.version),
        compensationBudgetPlanCompanyId: graphqlUnknownToString(r.compensationBudgetPlanCompanyId),
        organizationalUnitId: ouId,
        salaryBudgetAmount: num(r.salaryBudgetAmount),
        salaryBudgetPercent: num(r.salaryBudgetPercent),
        bonusBudgetAmount: num(r.bonusBudgetAmount),
        bonusBudgetPercent: num(r.bonusBudgetPercent),
        budgetPlanStatus: graphqlUnknownToString(r.budgetPlanStatus)
      })
    }
  }
  return { ouPlanRowMap, snapshotByPlanRowId }
}

function sumSalaryBudgetAmountForRelevantOrgUnits(
  rows: Array<Record<string, unknown>>,
  relevantOuIds: Set<string>
): number {
  let amount = 0
  for (const r of rows) {
    if (relevantOuIds.has(graphqlUnknownToString(r.organizationalUnitId))) {
      amount += num(r.salaryBudgetAmount)
    }
  }
  return amount
}

interface ManagerBudgetContextResponse {
  managerEmployeePosition: Array<{ organizationalUnitId: string | null } | null> | null
  compensationBudgetPlans: CompensationBudgetPlanListItem[] | null
  compensationBudgetPlanCompanies: Record<string, unknown>[] | null
}

/**
 * Sums `salary_budget_amount` from `compensation_budget_plan_organizational_unit` for org units on listed team
 * members (fallback: manager position OU). Uses two GraphQL round-trips: one combined context query, then org-unit
 * rows for the chosen `compensation_budget_plan_company` id.
 */
export function useManagerTeamSalaryBudget(params: {
  accessToken: string | undefined
  companyId: string | null
  managerEmployeeId: string | undefined
  teamMembers: TeamMemberCompensationData[]
}) {
  const { accessToken, companyId, managerEmployeeId, teamMembers } = params
  const graphqlClient = useGraphQLClient(accessToken ?? '')

  /** Stable while team composition (ids + OU ids) is unchanged; avoids refetching the pool on unrelated array identity changes. */
  const budgetRelevantTeamKey = useMemo(
    () =>
      teamMembers
        .map(m => `${m.employeeId}:${m.organizationalUnitId ?? ''}`)
        .sort()
        .join('|'),
    [teamMembers]
  )

  const [totalSalaryBudget, setTotalSalaryBudget] = useState<number | null>(null)
  const [loadingBudget, setLoadingBudget] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planOuRowIdByOrganizationalUnitId, setPlanOuRowIdByOrganizationalUnitId] = useState<
    ReadonlyMap<string, string>
  >(() => new Map())
  const [orgUnitBudgetSnapshotsByPlanRowId, setOrgUnitBudgetSnapshotsByPlanRowId] = useState<
    ReadonlyMap<string, ManagerOrgUnitBudgetSnapshot>
  >(() => new Map())
  const [managerCompanyBudgetRow, setManagerCompanyBudgetRow] = useState<CompensationBudgetPlanCompanyRow | null>(null)
  const [managerOrganizationalUnitId, setManagerOrganizationalUnitId] = useState<string | null>(null)
  const [activeCompensationBudgetPlanId, setActiveCompensationBudgetPlanId] = useState<string | null>(null)

  const clearBudgetPlanSlice = useCallback(() => {
    setTotalSalaryBudget(null)
    setPlanOuRowIdByOrganizationalUnitId(new Map())
    setOrgUnitBudgetSnapshotsByPlanRowId(new Map())
    setManagerCompanyBudgetRow(null)
    setActiveCompensationBudgetPlanId(null)
  }, [])

  const fetchBudgetTotal = useCallback(async () => {
    if (!accessToken || !companyId || !managerEmployeeId) {
      setTotalSalaryBudget(null)
      setError(null)
      setPlanOuRowIdByOrganizationalUnitId(new Map())
      setOrgUnitBudgetSnapshotsByPlanRowId(new Map())
      setManagerCompanyBudgetRow(null)
      setManagerOrganizationalUnitId(null)
      setActiveCompensationBudgetPlanId(null)
      return
    }

    setLoadingBudget(true)
    setError(null)

    try {
      const snapshot = await graphqlClient.request<ManagerBudgetContextResponse>(
        GET_MANAGER_COMPENSATION_BUDGET_CONTEXT,
        { companyId, employeeId: managerEmployeeId }
      )

      const managerOu = snapshot.managerEmployeePosition?.[0]?.organizationalUnitId ?? null
      setManagerOrganizationalUnitId(managerOu)

      let relevantOuIds = orgUnitIdsFromTeamMembers(teamMembers)
      if (relevantOuIds.size === 0 && managerOu) {
        relevantOuIds = new Set([managerOu])
      }

      if (relevantOuIds.size === 0) {
        clearBudgetPlanSlice()
        return
      }

      const plans = sortPlans((snapshot.compensationBudgetPlans ?? []).map(p => fillPlanListItem(p)))
      const planById = new Map(plans.map(p => [p.id, p]))
      const companyRows = (snapshot.compensationBudgetPlanCompanies ?? []).map(mapCompanyRow)
      const options = buildCompanyBudgetPlanOptions(companyRows, plans)
      const companyBudgetId = pickLatestCompanyBudgetRowId(options, planById)

      if (!companyBudgetId) {
        clearBudgetPlanSlice()
        return
      }

      const planIdForCompanyBudget = options.find(o => o.id === companyBudgetId)?.compensationBudgetPlanId ?? null
      setActiveCompensationBudgetPlanId(planIdForCompanyBudget)

      const pickedCompanyRow = companyRows.find(r => r.id === companyBudgetId) ?? null
      setManagerCompanyBudgetRow(pickedCompanyRow)

      const ouResult = await graphqlClient.request<{
        CompensationBudgetPlanOrganizationalUnit: Array<Record<string, unknown>>
      }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET, {
        compensationBudgetPlanCompanyId: companyBudgetId
      })

      const rows = ouResult.CompensationBudgetPlanOrganizationalUnit ?? []
      const { ouPlanRowMap, snapshotByPlanRowId } = buildManagerOrgUnitMapsFromRows(rows)
      setPlanOuRowIdByOrganizationalUnitId(ouPlanRowMap)
      setOrgUnitBudgetSnapshotsByPlanRowId(snapshotByPlanRowId)

      setTotalSalaryBudget(sumSalaryBudgetAmountForRelevantOrgUnits(rows, relevantOuIds))
    } catch (err) {
      logBudgetGraphqlFailure('useManagerTeamSalaryBudget', err)
      const message = err instanceof Error ? err.message : 'Failed to load manager team salary budget'
      setError(message)
      setTotalSalaryBudget(null)
      setPlanOuRowIdByOrganizationalUnitId(new Map())
      setOrgUnitBudgetSnapshotsByPlanRowId(new Map())
      setManagerCompanyBudgetRow(null)
      setActiveCompensationBudgetPlanId(null)
    } finally {
      setLoadingBudget(false)
    }
  }, [accessToken, clearBudgetPlanSlice, companyId, graphqlClient, managerEmployeeId, budgetRelevantTeamKey])

  useEffect(() => {
    void fetchBudgetTotal()
  }, [fetchBudgetTotal])

  return {
    totalSalaryBudget,
    loading: loadingBudget,
    error,
    refetch: fetchBudgetTotal,
    planOuRowIdByOrganizationalUnitId,
    orgUnitBudgetSnapshotsByPlanRowId,
    managerCompanyBudgetRow,
    managerOrganizationalUnitId,
    activeCompensationBudgetPlanId
  }
}
