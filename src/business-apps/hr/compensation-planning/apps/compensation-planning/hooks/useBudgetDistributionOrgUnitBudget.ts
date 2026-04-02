import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_COMPENSATION_BUDGET_PLAN_COMPANY,
  LIST_COMPENSATION_BUDGET_PLANS,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { CompensationBudgetPlanListItem } from './useBudgetSetupForCompany'
import { useCompensationPlanningStore } from './useCompensationPlanningStore'

/** Mirrors `nw_employee.compensation_budget_plan_organizational_unit`; names resolved via `companyOrgUnits`. */
export interface CompensationBudgetPlanOrganizationalUnitRow {
  id: string
  compensationBudgetPlanId: string
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
  organizationalUnitName: string | null
}

interface CompensationBudgetPlanOrganizationalUnitGraphqlRow {
  id: string
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: unknown
  salaryBudgetPercent: unknown
  bonusBudgetAmount: unknown
  bonusBudgetPercent: unknown
  budgetPlanStatus: string | null
}

function num(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v
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
    if (fy !== 0) return fy
    return a.name.localeCompare(b.name)
  })
}

function mapGraphqlOrgUnitRow(
  raw: CompensationBudgetPlanOrganizationalUnitGraphqlRow,
  compensationBudgetPlanId: string
): CompensationBudgetPlanOrganizationalUnitRow {
  return {
    id: raw.id,
    compensationBudgetPlanId,
    compensationBudgetPlanCompanyId: raw.compensationBudgetPlanCompanyId,
    organizationalUnitId: raw.organizationalUnitId,
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: raw.budgetPlanStatus ?? '',
    organizationalUnitName: null
  }
}

export function useBudgetDistributionOrgUnitBudget(
  accessToken: string,
  companyId: string | null,
  companyOrgUnits: CompanyOrganizationalUnit[]
) {
  const graphqlClient = useGraphQLClient(accessToken)
  const { selectedBudgetPlanId } = useCompensationPlanningStore()
  const companyIdRef = useRef(companyId)

  const orgUnitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of companyOrgUnits) {
      map.set(u.id, u.name)
    }
    return map
  }, [companyOrgUnits])

  useEffect(() => {
    companyIdRef.current = companyId
  }, [companyId])

  const [rows, setRows] = useState<CompensationBudgetPlanOrganizationalUnitRow[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPlans = useCallback(async () => {
    if (!accessToken) return
    setLoadingPlans(true)
    setError(null)
    try {
      const result = await graphqlClient.request<{
        CompensationBudgetPlan: CompensationBudgetPlanListItem[]
      }>(LIST_COMPENSATION_BUDGET_PLANS)
      const list = sortPlans((result.CompensationBudgetPlan ?? []).map(fillPlanListItem))
      const { selectedBudgetPlanId: currentId, setSelectedBudgetPlanId: pickPlan } =
        useCompensationPlanningStore.getState()
      if (list.length === 0) {
        pickPlan(null)
      } else if (!currentId || !list.some(p => p.id === currentId)) {
        pickPlan(list[0].id)
      }
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlans', err)
      const message = err instanceof Error ? err.message : 'Failed to load budget plans'
      setError(`Budget plans: ${message}`)
    } finally {
      setLoadingPlans(false)
    }
  }, [accessToken, graphqlClient])

  const fetchOrgUnitRows = useCallback(async () => {
    if (!accessToken || !companyId || !selectedBudgetPlanId) {
      setRows([])
      return
    }
    const companyIdForRequest = companyId
    const planIdForRequest = selectedBudgetPlanId
    setLoadingRows(true)
    setError(null)
    try {
      const companyBudgetResult = await graphqlClient.request<{
        CompensationBudgetPlanCompany: { id: string }[]
      }>(GET_COMPENSATION_BUDGET_PLAN_COMPANY, {
        planId: planIdForRequest,
        companyId: companyIdForRequest
      })
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }
      if (useCompensationPlanningStore.getState().selectedBudgetPlanId !== planIdForRequest) {
        return
      }
      const companyBudgetRow = companyBudgetResult.CompensationBudgetPlanCompany?.[0]
      if (!companyBudgetRow?.id) {
        setRows([])
        return
      }

      const result = await graphqlClient.request<{
        CompensationBudgetPlanOrganizationalUnit: CompensationBudgetPlanOrganizationalUnitGraphqlRow[]
      }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET, {
        compensationBudgetPlanCompanyId: companyBudgetRow.id
      })
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }
      if (useCompensationPlanningStore.getState().selectedBudgetPlanId !== planIdForRequest) {
        return
      }
      const rawList = result.CompensationBudgetPlanOrganizationalUnit ?? []
      const mapped = rawList.map(raw => mapGraphqlOrgUnitRow(raw, planIdForRequest))
      setRows(mapped)
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlanOrganizationalUnitByCompanyBudget', err)
      const message = err instanceof Error ? err.message : 'Failed to load org unit budgets'
      setError(`Org unit budgets: ${message}`)
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }, [accessToken, companyId, graphqlClient, selectedBudgetPlanId])

  useEffect(() => {
    void fetchPlans()
  }, [fetchPlans])

  useEffect(() => {
    void fetchOrgUnitRows()
  }, [fetchOrgUnitRows])

  const rowsWithOrgUnitNames = useMemo(
    () =>
      rows.map(row => ({
        ...row,
        organizationalUnitName: orgUnitNameById.get(row.organizationalUnitId) ?? null
      })),
    [rows, orgUnitNameById]
  )

  return {
    selectedBudgetPlanId,
    rows: rowsWithOrgUnitNames,
    loading: loadingPlans || loadingRows,
    error,
    refetchOrgUnitRows: fetchOrgUnitRows
  }
}
