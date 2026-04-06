import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  LIST_COMPENSATION_BUDGET_PLANS,
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { CompensationBudgetPlanCompanyRow, CompensationBudgetPlanListItem } from './useBudgetSetupForCompany'
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

export interface CompanyBudgetPlanOption {
  id: string
  compensationBudgetPlanId: string
  label: string
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

function mapCompanyRow(raw: Record<string, unknown>): CompensationBudgetPlanCompanyRow {
  return {
    id: String(raw.id ?? ''),
    compensationBudgetPlanId: String(raw.compensationBudgetPlanId ?? ''),
    companyId: String(raw.companyId ?? ''),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: String(raw.budgetPlanStatus ?? ''),
    currentTotalSalaryCost: num(raw.currentTotalSalaryCost),
    distributionMethod: String(raw.distributionMethod ?? ''),
    headcount: num(raw.headcount),
    currencyRef: raw.currencyRef == null ? null : String(raw.currencyRef)
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
    if (!plan) continue
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

/** Stable client-only id for org units that have no `compensation_budget_plan_organizational_unit` row yet. */
export const PENDING_ORG_UNIT_ROW_PREFIX = 'pending-org-unit:'

export function isPendingCompensationBudgetPlanOrgUnitRowId(rowId: string): boolean {
  return rowId.startsWith(PENDING_ORG_UNIT_ROW_PREFIX)
}

/**
 * Ensures every organizational unit of the company appears in the table: existing API rows keep their data;
 * missing units get zeroed placeholder rows so the list matches the company org chart.
 */
function mergeOrgUnitBudgetRowsWithCompanyOrgUnits(
  apiRows: CompensationBudgetPlanOrganizationalUnitRow[],
  companyOrgUnits: CompanyOrganizationalUnit[],
  companyBudgetRowId: string,
  compensationBudgetPlanId: string
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
    } else {
      merged.push({
        id: `${PENDING_ORG_UNIT_ROW_PREFIX}${u.id}`,
        compensationBudgetPlanId,
        compensationBudgetPlanCompanyId: companyBudgetRowId,
        organizationalUnitId: u.id,
        salaryBudgetAmount: 0,
        salaryBudgetPercent: 0,
        bonusBudgetAmount: 0,
        bonusBudgetPercent: 0,
        budgetPlanStatus: '',
        organizationalUnitName: u.name
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
  const { selectedDistributionCompanyBudgetId, setSelectedDistributionCompanyBudgetId } = useCompensationPlanningStore()
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
      if (options.length === 0) {
        useCompensationPlanningStore.getState().setSelectedDistributionCompanyBudgetId(null)
      } else if (current == null || !optionIds.has(current)) {
        useCompensationPlanningStore.getState().setSelectedDistributionCompanyBudgetId(options[0].id)
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
  }, [accessToken, companyId, graphqlClient])

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
    const companyBudgetId = selectedDistributionCompanyBudgetId
    if (!companyBudgetId || companyOrgUnits.length === 0) {
      return rowsWithOrgUnitNames
    }
    const selectedOption = companyBudgetPlanOptions.find(o => o.id === companyBudgetId)
    if (!selectedOption) {
      return rowsWithOrgUnitNames
    }
    return mergeOrgUnitBudgetRowsWithCompanyOrgUnits(
      rowsWithOrgUnitNames,
      companyOrgUnits,
      companyBudgetId,
      selectedOption.compensationBudgetPlanId
    )
  }, [rowsWithOrgUnitNames, companyOrgUnits, selectedDistributionCompanyBudgetId, companyBudgetPlanOptions])

  const selectedCompanyBudgetRow = useMemo(
    () => companyBudgetRows.find(r => r.id === selectedDistributionCompanyBudgetId) ?? null,
    [companyBudgetRows, selectedDistributionCompanyBudgetId]
  )

  return {
    companyBudgetPlanOptions,
    companyBudgetRows,
    selectedCompanyBudgetRow,
    selectedDistributionCompanyBudgetId,
    setSelectedDistributionCompanyBudgetId,
    rows: rowsForDisplay,
    loading: loadingCompanyPlans || loadingRows,
    error,
    refetchOrgUnitRows: fetchOrgUnitRows,
    refetchCompanyBudgetPlans: fetchCompanyBudgetPlans
  }
}
