import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  LIST_COMPENSATION_BUDGET_PLANS,
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from '../../../utils/graphqlUnknownToString'
import type { CompensationBudgetPlanCompanyRow, CompensationBudgetPlanListItem } from './useBudgetSetupForCompany'
import { useCompensationPlanningStore } from './useCompensationPlanningStore'

/** Mirrors `nw_employee.compensation_budget_plan_organizational_unit`; names resolved via `companyOrgUnits`. */
export interface CompensationBudgetPlanOrganizationalUnitRow {
  id: string
  version: number
  compensationBudgetPlanId: string
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: number
  salaryBudgetPercent: number
  allocationAmount: number
  bonusBudgetAmount: number
  bonusBudgetPercent: number
  budgetPlanStatus: string
  organizationalUnitName: string | null
}

export interface CompanyBudgetPlanOption {
  id: string
  compensationBudgetPlanId: string
  compensationBudgetPlanStatus: string
  label: string
}

interface CompensationBudgetPlanOrganizationalUnitGraphqlRow {
  id: string
  version: unknown
  compensationBudgetPlanCompanyId: string
  organizationalUnitId: string
  salaryBudgetAmount: unknown
  salaryBudgetPercent: unknown
  allocationAmount?: unknown
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
  if (aD == null) return 1
  if (bD == null) return -1
  const byDate = aD.localeCompare(bD)
  if (byDate !== 0) return byDate
  return a.label.localeCompare(b.label)
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
    if (!plan) continue
    let label = plan.name
    if (usedLabels.has(label)) {
      label = `${label} · ${row.id.slice(0, 8)}`
    }
    usedLabels.add(label)
    options.push({
      id: row.id,
      compensationBudgetPlanId: row.compensationBudgetPlanId,
      compensationBudgetPlanStatus: plan.budgetPlanStatus,
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

function mapGraphqlOrgUnitRow(
  raw: CompensationBudgetPlanOrganizationalUnitGraphqlRow,
  compensationBudgetPlanId: string
): CompensationBudgetPlanOrganizationalUnitRow {
  return {
    id: raw.id,
    version: num(raw.version),
    compensationBudgetPlanId,
    compensationBudgetPlanCompanyId: raw.compensationBudgetPlanCompanyId,
    organizationalUnitId: raw.organizationalUnitId,
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: raw.budgetPlanStatus ?? '',
    organizationalUnitName: null
  }
}

/**
 * Orders API org-unit budget rows by company org chart and fills display names.
 * Rows without a matching company OU are appended (e.g. stale structure data).
 */
function mergeOrgUnitBudgetRowsWithCompanyOrgUnits(
  apiRows: CompensationBudgetPlanOrganizationalUnitRow[],
  companyOrgUnits: CompanyOrganizationalUnit[]
): CompensationBudgetPlanOrganizationalUnitRow[] {
  if (companyOrgUnits.length === 0) {
    return apiRows
  }
  const byOuId = new Map<string, CompensationBudgetPlanOrganizationalUnitRow>()
  for (const r of apiRows) {
    byOuId.set(r.organizationalUnitId, r)
  }
  const companyOuIds = new Set(companyOrgUnits.map(u => u.id))
  const sortedUnits = [...companyOrgUnits].sort((a, b) => a.name.localeCompare(b.name))
  const merged: CompensationBudgetPlanOrganizationalUnitRow[] = []

  for (const u of sortedUnits) {
    const existing = byOuId.get(u.id)
    if (existing) {
      merged.push({
        ...existing,
        organizationalUnitName: existing.organizationalUnitName ?? u.name
      })
    }
  }

  for (const r of apiRows) {
    if (!companyOuIds.has(r.organizationalUnitId)) {
      merged.push(r)
    }
  }

  return merged
}

export function useBudgetDistributionOrgUnitBudget(
  accessToken: string,
  companyId: string | null,
  companyOrgUnits: CompanyOrganizationalUnit[]
) {
  const graphqlClient = useGraphQLClient(accessToken)
  const {
    selectedBudgetPlanId,
    selectBudgetPlan,
    selectedDistributionCompanyBudgetId,
    setSelectedDistributionCompanyBudgetId
  } = useCompensationPlanningStore()
  const companyIdRef = useRef(companyId)
  /** Keeps plan id in sync with company budget row id without depending on React state batching. */
  const compensationBudgetPlanIdByCompanyRowIdRef = useRef<Map<string, string>>(new Map())

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
  const [companyBudgetPlanOptions, setCompanyBudgetPlanOptions] = useState<CompanyBudgetPlanOption[]>([])
  const [companyBudgetRows, setCompanyBudgetRows] = useState<CompensationBudgetPlanCompanyRow[]>([])
  const [loadingCompanyPlans, setLoadingCompanyPlans] = useState(false)
  const [loadingRows, setLoadingRows] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCompanyBudgetPlans = useCallback(async () => {
    if (!accessToken || !companyId) {
      compensationBudgetPlanIdByCompanyRowIdRef.current = new Map()
      setCompanyBudgetPlanOptions([])
      setCompanyBudgetRows([])
      return
    }
    const companyIdForRequest = companyId
    setLoadingCompanyPlans(true)
    setError(null)
    try {
      const [plansResult, companyRowsResult] = await Promise.all([
        graphqlClient.request<{ CompensationBudgetPlan: CompensationBudgetPlanListItem[] }>(
          LIST_COMPENSATION_BUDGET_PLANS
        ),
        graphqlClient.request<{ CompensationBudgetPlanCompany: Record<string, unknown>[] }>(
          LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
          { companyId: companyIdForRequest }
        )
      ])
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }

      const plans = sortPlans((plansResult.CompensationBudgetPlan ?? []).map(fillPlanListItem))

      const companyRows = (companyRowsResult.CompensationBudgetPlanCompany ?? []).map(mapCompanyRow)
      const options = buildCompanyBudgetPlanOptions(companyRows, plans)
      compensationBudgetPlanIdByCompanyRowIdRef.current = new Map(options.map(o => [o.id, o.compensationBudgetPlanId]))
      setCompanyBudgetRows(companyRows)
      setCompanyBudgetPlanOptions(options)

      const optionIds = new Set(options.map(o => o.id))
      const current = useCompensationPlanningStore.getState().selectedDistributionCompanyBudgetId
      const savedCycleId = useCompensationPlanningStore.getState().selectedBudgetPlanId
      const currentCycleId = current == null ? null : compensationBudgetPlanIdByCompanyRowIdRef.current.get(current)
      const preferredFromSavedCycle = savedCycleId
        ? (options.find(o => o.compensationBudgetPlanId === savedCycleId)?.id ?? null)
        : null
      if (options.length === 0) {
        useCompensationPlanningStore.getState().setSelectedDistributionCompanyBudgetId(null)
      } else if (preferredFromSavedCycle != null && currentCycleId !== savedCycleId) {
        useCompensationPlanningStore.getState().setSelectedDistributionCompanyBudgetId(preferredFromSavedCycle)
      } else if (current == null || !optionIds.has(current)) {
        const nextId = options[0].id
        useCompensationPlanningStore.getState().selectBudgetPlan(options[0].compensationBudgetPlanId)
        useCompensationPlanningStore.getState().setSelectedDistributionCompanyBudgetId(nextId)
      }
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlanCompanyByCompany', err)
      setCompanyBudgetPlanOptions([])
      setCompanyBudgetRows([])
      const message = err instanceof Error ? err.message : 'Failed to load company budget plans'
      setError(`Company budget plans: ${message}`)
    } finally {
      setLoadingCompanyPlans(false)
    }
  }, [accessToken, companyId, graphqlClient, selectedBudgetPlanId])

  const fetchOrgUnitRows = useCallback(async () => {
    if (!accessToken || !companyId || !selectedDistributionCompanyBudgetId) {
      setRows([])
      return
    }
    const companyIdForRequest = companyId
    const companyBudgetIdForRequest = selectedDistributionCompanyBudgetId
    setLoadingRows(true)
    setError(null)
    try {
      const planIdForMapping = compensationBudgetPlanIdByCompanyRowIdRef.current.get(companyBudgetIdForRequest) ?? ''

      const result = await graphqlClient.request<{
        CompensationBudgetPlanOrganizationalUnit: CompensationBudgetPlanOrganizationalUnitGraphqlRow[]
      }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET, {
        compensationBudgetPlanCompanyId: companyBudgetIdForRequest
      })
      if (companyIdRef.current !== companyIdForRequest) {
        return
      }
      if (useCompensationPlanningStore.getState().selectedDistributionCompanyBudgetId !== companyBudgetIdForRequest) {
        return
      }
      const rawList = result.CompensationBudgetPlanOrganizationalUnit ?? []
      const mapped = rawList.map(raw => mapGraphqlOrgUnitRow(raw, planIdForMapping))
      setRows(mapped)
    } catch (err) {
      logBudgetGraphqlFailure('ListCompensationBudgetPlanOrganizationalUnitByCompanyBudget', err)
      const message = err instanceof Error ? err.message : 'Failed to load org unit budgets'
      setError(`Org unit budgets: ${message}`)
      setRows([])
    } finally {
      setLoadingRows(false)
    }
  }, [accessToken, companyId, graphqlClient, selectedDistributionCompanyBudgetId])

  useEffect(() => {
    void fetchCompanyBudgetPlans()
  }, [fetchCompanyBudgetPlans])

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

  const rowsForDisplay = useMemo(() => {
    if (!selectedDistributionCompanyBudgetId || companyOrgUnits.length === 0) {
      return rowsWithOrgUnitNames
    }
    return mergeOrgUnitBudgetRowsWithCompanyOrgUnits(rowsWithOrgUnitNames, companyOrgUnits)
  }, [rowsWithOrgUnitNames, companyOrgUnits, selectedDistributionCompanyBudgetId])

  const selectedCompanyBudgetRow = useMemo(
    () => companyBudgetRows.find(r => r.id === selectedDistributionCompanyBudgetId) ?? null,
    [companyBudgetRows, selectedDistributionCompanyBudgetId]
  )

  const selectedCompensationCycleStatus = useMemo(
    () =>
      companyBudgetPlanOptions.find(option => option.id === selectedDistributionCompanyBudgetId)
        ?.compensationBudgetPlanStatus ?? null,
    [companyBudgetPlanOptions, selectedDistributionCompanyBudgetId]
  )

  const selectDistributionCompanyBudget = useCallback(
    (id: string | null) => {
      if (id == null) {
        selectBudgetPlan(null)
        setSelectedDistributionCompanyBudgetId(null)
        return
      }
      const planId = compensationBudgetPlanIdByCompanyRowIdRef.current.get(id) ?? null
      selectBudgetPlan(planId)
      setSelectedDistributionCompanyBudgetId(id)
    },
    [selectBudgetPlan, setSelectedDistributionCompanyBudgetId]
  )

  return {
    companyBudgetPlanOptions,
    companyBudgetRows,
    selectedCompanyBudgetRow,
    selectedCompensationCycleStatus,
    selectedDistributionCompanyBudgetId,
    setSelectedDistributionCompanyBudgetId: selectDistributionCompanyBudget,
    rows: rowsForDisplay,
    loading: loadingCompanyPlans || loadingRows,
    error,
    refetchOrgUnitRows: fetchOrgUnitRows,
    refetchCompanyBudgetPlans: fetchCompanyBudgetPlans
  }
}
