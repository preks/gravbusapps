import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CompensationBudgetPlanCompanyRow } from '../../compensation-planning/hooks/useBudgetSetupForCompany'
import {
  GET_MANAGER_COMPENSATION_BUDGET_CONTEXT,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from '../../../utils/graphqlUnknownToString'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'

interface CompanyBudgetPlanOption {
  id: string
  compensationBudgetPlanId: string
  label: string
}

interface ManagerCompensationBudgetPlanListItem {
  id: string
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  effectiveDate: string | null
  budgetPlanStatus: string
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v
  }
  const n = Number(v)
  return Number.isNaN(n) ? 0 : n
}

function fillPlanListItem(
  p: Partial<ManagerCompensationBudgetPlanListItem> & { id: string; name?: string }
): ManagerCompensationBudgetPlanListItem {
  return {
    id: p.id,
    name: p.name ?? '',
    description: p.description ?? null,
    startDate: p.startDate ?? null,
    endDate: p.endDate ?? null,
    effectiveDate: p.effectiveDate ?? null,
    budgetPlanStatus: p.budgetPlanStatus ?? ''
  }
}

function sortPlans(list: ManagerCompensationBudgetPlanListItem[]): ManagerCompensationBudgetPlanListItem[] {
  return [...list].sort((a, b) =>
    comparePlanEffectiveDateAsc(
      { effectiveDate: a.effectiveDate, label: a.name },
      { effectiveDate: b.effectiveDate, label: b.name }
    )
  )
}

function mapCompanyRow(raw: Record<string, unknown>): CompensationBudgetPlanCompanyRow {
  return {
    id: graphqlUnknownToString(raw.id),
    version: num(raw.version),
    compensationBudgetPlanId: graphqlUnknownToString(raw.compensationBudgetPlanId),
    companyId: graphqlUnknownToString(raw.companyId),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: graphqlUnknownToString(raw.budgetPlanStatus),
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: graphqlUnknownToString(raw.distributionMethod),
    headcount: num(raw.headcount),
    currencyRef: graphqlUnknownToStringOrNull(raw.currencyRef)
  }
}

/** Earlier dates first; null/invalid effective dates last (stable for tie-break: label). */
function comparePlanEffectiveDateAsc(
  a: { effectiveDate: string | null; label: string },
  b: { effectiveDate: string | null; label: string }
): number {
  const aD = a.effectiveDate
  const bD = b.effectiveDate
  if (aD == null && bD == null) {
    return a.label.localeCompare(b.label)
  }
  if (aD == null) {
    return 1
  }
  if (bD == null) {
    return -1
  }
  const byDate = aD.localeCompare(bD)
  if (byDate !== 0) {
    return byDate
  }
  return a.label.localeCompare(b.label)
}

function buildCompanyBudgetPlanOptions(
  companyRows: CompensationBudgetPlanCompanyRow[],
  plans: ManagerCompensationBudgetPlanListItem[]
): CompanyBudgetPlanOption[] {
  const planById = new Map(plans.map(p => [p.id, p]))
  const usedLabels = new Set<string>()
  const options: CompanyBudgetPlanOption[] = []

  for (const row of companyRows) {
    const plan = planById.get(row.compensationBudgetPlanId)
    if (!plan) {
      continue
    }
    let label = plan.name
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

  return [...options].sort((oa, ob) => {
    const pa = planById.get(oa.compensationBudgetPlanId)
    const pb = planById.get(ob.compensationBudgetPlanId)
    return comparePlanEffectiveDateAsc(
      { effectiveDate: pa?.effectiveDate ?? null, label: oa.label },
      { effectiveDate: pb?.effectiveDate ?? null, label: ob.label }
    )
  })
}

function pickLatestCompanyBudgetRowId(
  options: CompanyBudgetPlanOption[],
  planById: Map<string, ManagerCompensationBudgetPlanListItem>
): string | null {
  if (options.length === 0) {
    return null
  }
  const sorted = [...options].sort((a, b) => {
    const pa = planById.get(a.compensationBudgetPlanId)
    const pb = planById.get(b.compensationBudgetPlanId)
    return -comparePlanEffectiveDateAsc(
      { effectiveDate: pa?.effectiveDate ?? null, label: a.label },
      { effectiveDate: pb?.effectiveDate ?? null, label: b.label }
    )
  })
  return sorted[0]?.id ?? null
}

/** One row per compensation cycle that has a company budget for this legal entity. */
function buildCompensationPlanChoices(
  options: CompanyBudgetPlanOption[],
  planById: Map<string, ManagerCompensationBudgetPlanListItem>
): { id: string; name: string }[] {
  const byPlanId = new Map<string, { id: string; name: string }>()
  for (const opt of options) {
    const plan = planById.get(opt.compensationBudgetPlanId)
    if (!plan) {
      continue
    }
    if (!byPlanId.has(plan.id)) {
      byPlanId.set(plan.id, { id: plan.id, name: plan.name })
    }
  }
  return [...byPlanId.values()].sort((a, b) => {
    const pa = planById.get(a.id)
    const pb = planById.get(b.id)
    return comparePlanEffectiveDateAsc(
      { effectiveDate: pa?.effectiveDate ?? null, label: a.name },
      { effectiveDate: pb?.effectiveDate ?? null, label: b.name }
    )
  })
}

function pickCompanyBudgetRowIdForPlan(
  options: CompanyBudgetPlanOption[],
  planById: Map<string, ManagerCompensationBudgetPlanListItem>,
  preferredCompensationPlanId: string | null
): string | null {
  if (options.length === 0) {
    return null
  }
  if (preferredCompensationPlanId) {
    const match = options.find(o => o.compensationBudgetPlanId === preferredCompensationPlanId)
    if (match) {
      return match.id
    }
  }
  return pickLatestCompanyBudgetRowId(options, planById)
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

function buildManagerOrgUnitPlanRowMap(rows: Array<Record<string, unknown>>): Map<string, string> {
  const ouPlanRowMap = new Map<string, string>()
  for (const r of rows) {
    const ouId = graphqlUnknownToString(r.organizationalUnitId)
    const rowId = graphqlUnknownToString(r.id)
    if (ouId && rowId && !ouPlanRowMap.has(ouId)) {
      ouPlanRowMap.set(ouId, rowId)
    }
  }
  return ouPlanRowMap
}

/** Department salary budget from HR (`salary_budget_amount`). */
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

/** Roll-up of committed proposal amounts on each org-unit row (`allocation_amount` from employees). */
function sumAllocationAmountForRelevantOrgUnits(
  rows: Array<Record<string, unknown>>,
  relevantOuIds: Set<string>
): number {
  let amount = 0
  for (const r of rows) {
    if (relevantOuIds.has(graphqlUnknownToString(r.organizationalUnitId))) {
      amount += num(r.allocationAmount)
    }
  }
  return amount
}

interface ManagerBudgetContextResponse {
  managerEmployeePosition: Array<{ organizationalUnitId: string | null } | null> | null
  compensationBudgetPlans: ManagerCompensationBudgetPlanListItem[] | null
  compensationBudgetPlanCompanies: Record<string, unknown>[] | null
}

/**
 * Sums `salary_budget_amount` (HR slice per department) for team org units. Uses two GraphQL round-trips.
 * When `selectedCompensationBudgetPlanId` is set, uses that cycle’s `CompensationBudgetPlanCompany` row and loads OU budget rows.
 * When null, only the snapshot is loaded so {@link buildCompensationPlanChoices} can populate the cycle selector; no salary totals or OU map until the user picks a cycle.
 */
export function useManagerTeamSalaryBudget(params: {
  accessToken: string | undefined
  companyId: string | null
  managerEmployeeId: string | undefined
  teamMembers: TeamMemberCompensationData[]
  /** `CompensationBudgetPlan.id` — which cycle’s company/org-unit budget rows to load. */
  selectedCompensationBudgetPlanId: string | null
}) {
  const { accessToken, companyId, managerEmployeeId, teamMembers, selectedCompensationBudgetPlanId } = params
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
  /** Sum of OU `allocation_amount` for team departments (matches rolled-up employee proposal totals). */
  const [totalOrgUnitAllocationAmount, setTotalOrgUnitAllocationAmount] = useState<number | null>(null)
  const [loadingBudget, setLoadingBudget] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [planOuRowIdByOrganizationalUnitId, setPlanOuRowIdByOrganizationalUnitId] = useState<
    ReadonlyMap<string, string>
  >(() => new Map())
  const [managerOrganizationalUnitId, setManagerOrganizationalUnitId] = useState<string | null>(null)
  const [activeCompensationBudgetPlanId, setActiveCompensationBudgetPlanId] = useState<string | null>(null)
  const [activeCompanyBudgetCurrencyRef, setActiveCompanyBudgetCurrencyRef] = useState<string | null>(null)
  const [compensationPlanChoices, setCompensationPlanChoices] = useState<{ id: string; name: string }[]>([])

  const clearBudgetPlanSlice = useCallback(() => {
    setTotalSalaryBudget(null)
    setTotalOrgUnitAllocationAmount(null)
    setPlanOuRowIdByOrganizationalUnitId(new Map())
    setActiveCompensationBudgetPlanId(null)
    setActiveCompanyBudgetCurrencyRef(null)
    setCompensationPlanChoices([])
  }, [])

  const fetchBudgetTotal = useCallback(async () => {
    if (!accessToken || !companyId || !managerEmployeeId) {
      setTotalSalaryBudget(null)
      setTotalOrgUnitAllocationAmount(null)
      setError(null)
      setPlanOuRowIdByOrganizationalUnitId(new Map())
      setManagerOrganizationalUnitId(null)
      setActiveCompensationBudgetPlanId(null)
      setActiveCompanyBudgetCurrencyRef(null)
      setCompensationPlanChoices([])
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

      const plans = sortPlans((snapshot.compensationBudgetPlans ?? []).map(p => fillPlanListItem(p)))
      const planById = new Map(plans.map(p => [p.id, p]))
      const companyRows = (snapshot.compensationBudgetPlanCompanies ?? []).map(mapCompanyRow)
      const options = buildCompanyBudgetPlanOptions(companyRows, plans)
      setCompensationPlanChoices(buildCompensationPlanChoices(options, planById))

      if (selectedCompensationBudgetPlanId == null) {
        setActiveCompensationBudgetPlanId(null)
        setTotalSalaryBudget(null)
        setTotalOrgUnitAllocationAmount(null)
        setPlanOuRowIdByOrganizationalUnitId(new Map())
        setActiveCompanyBudgetCurrencyRef(null)
        return
      }

      const companyBudgetId = pickCompanyBudgetRowIdForPlan(options, planById, selectedCompensationBudgetPlanId)

      if (!companyBudgetId) {
        clearBudgetPlanSlice()
        return
      }

      const planIdForCompanyBudget = options.find(o => o.id === companyBudgetId)?.compensationBudgetPlanId ?? null
      setActiveCompensationBudgetPlanId(planIdForCompanyBudget)
      setActiveCompanyBudgetCurrencyRef(companyRows.find(row => row.id === companyBudgetId)?.currencyRef ?? null)

      let relevantOuIds = orgUnitIdsFromTeamMembers(teamMembers)
      if (relevantOuIds.size === 0 && managerOu) {
        relevantOuIds = new Set([managerOu])
      }

      if (relevantOuIds.size === 0) {
        setTotalSalaryBudget(null)
        setTotalOrgUnitAllocationAmount(null)
        setPlanOuRowIdByOrganizationalUnitId(new Map())
        setActiveCompanyBudgetCurrencyRef(null)
        return
      }

      const ouResult = await graphqlClient.request<{
        CompensationBudgetPlanOrganizationalUnit: Array<Record<string, unknown>>
      }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET, {
        compensationBudgetPlanCompanyId: companyBudgetId
      })

      const rows = ouResult.CompensationBudgetPlanOrganizationalUnit ?? []
      setPlanOuRowIdByOrganizationalUnitId(buildManagerOrgUnitPlanRowMap(rows))

      setTotalSalaryBudget(sumSalaryBudgetAmountForRelevantOrgUnits(rows, relevantOuIds))
      setTotalOrgUnitAllocationAmount(sumAllocationAmountForRelevantOrgUnits(rows, relevantOuIds))
    } catch (err) {
      logBudgetGraphqlFailure('useManagerTeamSalaryBudget', err)
      const message = err instanceof Error ? err.message : 'Failed to load manager team salary budget'
      setError(message)
      setTotalSalaryBudget(null)
      setTotalOrgUnitAllocationAmount(null)
      setPlanOuRowIdByOrganizationalUnitId(new Map())
      setActiveCompensationBudgetPlanId(null)
      setActiveCompanyBudgetCurrencyRef(null)
      setCompensationPlanChoices([])
    } finally {
      setLoadingBudget(false)
    }
  }, [
    accessToken,
    clearBudgetPlanSlice,
    companyId,
    graphqlClient,
    managerEmployeeId,
    budgetRelevantTeamKey,
    selectedCompensationBudgetPlanId
  ])

  useEffect(() => {
    void fetchBudgetTotal()
  }, [fetchBudgetTotal])

  return {
    totalSalaryBudget,
    totalOrgUnitAllocationAmount,
    loading: loadingBudget,
    error,
    refetch: fetchBudgetTotal,
    planOuRowIdByOrganizationalUnitId,
    managerOrganizationalUnitId,
    activeCompensationBudgetPlanId,
    activeCompanyBudgetCurrencyRef,
    compensationPlanChoices
  }
}
