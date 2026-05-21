import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import {
  LIST_COMPENSATION_BUDGET_PLAN_COMPANY_BY_COMPANY,
  LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS,
  LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET_IDS,
  LIST_COMPENSATION_BUDGET_PLANS
} from '../../../queries/budgetPlanQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import { graphqlUnknownToString, graphqlUnknownToStringOrNull } from '../../../utils/graphqlUnknownToString'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import type { CompensationBudgetPlanCompanyRow, CompensationBudgetPlanListItem } from './useBudgetSetupForCompany'
import {
  buildSubmissionsOrgUnitTableRows,
  type SubmissionsEmployeeSalaryAdjustmentRow,
  type SubmissionsOrgUnitGraphqlRow,
  type SubmissionsOrgUnitTableRow
} from '../components/views/submissionsOrgUnitTableRows'

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

function mapOrgUnitRow(raw: Record<string, unknown>): SubmissionsOrgUnitGraphqlRow {
  return {
    id: graphqlUnknownToString(raw.id),
    version: num(raw.version),
    compensationBudgetPlanCompanyId: graphqlUnknownToString(raw.compensationBudgetPlanCompanyId),
    organizationalUnitId: graphqlUnknownToString(raw.organizationalUnitId),
    salaryBudgetAmount: num(raw.salaryBudgetAmount),
    salaryBudgetPercent: num(raw.salaryBudgetPercent),
    allocationAmount: num(raw.allocationAmount),
    bonusBudgetAmount: num(raw.bonusBudgetAmount),
    bonusBudgetPercent: num(raw.bonusBudgetPercent),
    budgetPlanStatus: graphqlUnknownToString(raw.budgetPlanStatus)
  }
}

function buildProposedNewSalarySumByOrgUnitBudgetRowId(employees: Record<string, unknown>[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const e of employees) {
    const rowId = graphqlUnknownToString(e.compensationBudgetPlanOrganizationalUnitId)
    if (rowId === '') {
      continue
    }
    const pn = num(e.proposedNewSalary)
    map.set(rowId, (map.get(rowId) ?? 0) + pn)
  }
  return map
}

function buildSalaryAdjustmentsByOrgUnitBudgetRowId(
  employees: Record<string, unknown>[]
): Map<string, SubmissionsEmployeeSalaryAdjustmentRow[]> {
  const map = new Map<string, SubmissionsEmployeeSalaryAdjustmentRow[]>()
  for (const e of employees) {
    const rowId = graphqlUnknownToString(e.compensationBudgetPlanOrganizationalUnitId)
    const employeeId = graphqlUnknownToString(e.employeeId)
    const newAnnualGrossSalary = num(e.proposedNewSalary)
    const requestedPercent = num(e.proposedSalaryIncreasePercent)
    if (rowId === '' || employeeId === '' || newAnnualGrossSalary <= 0) {
      continue
    }
    const existing = map.get(rowId) ?? []
    existing.push({ employeeId, newAnnualGrossSalary, requestedPercent })
    map.set(rowId, existing)
  }
  return map
}

const ORG_UNIT_LIMIT = 500

export function useSubmissionsOrgUnitBudgetTable(
  accessToken: string,
  companyId: string | null,
  defaultCurrencyCode: string,
  teamMembers: TeamMemberCompensationData[],
  /** When null, no data is loaded and the submissions table stays empty (user must pick a cycle). */
  selectedCompensationPlanId: string | null
) {
  const graphqlClient = useGraphQLClient(accessToken)
  const companyIdRef = useRef(companyId)
  const { units: companyOrgUnits, loading: loadingOrgUnits } = useCompanyOrganizationalUnits(
    accessToken,
    companyId ?? '',
    ORG_UNIT_LIMIT
  )

  const [orgRows, setOrgRows] = useState<SubmissionsOrgUnitGraphqlRow[]>([])
  const [proposedNewSalarySumByOrgUnitBudgetRowId, setProposedNewSalarySumByOrgUnitBudgetRowId] = useState<
    Map<string, number>
  >(() => new Map())
  const [salaryAdjustmentsByOrgUnitBudgetRowId, setSalaryAdjustmentsByOrgUnitBudgetRowId] = useState<
    Map<string, SubmissionsEmployeeSalaryAdjustmentRow[]>
  >(() => new Map())
  const [companyRowById, setCompanyRowById] = useState<Map<string, CompensationBudgetPlanCompanyRow>>(() => new Map())
  const [plans, setPlans] = useState<CompensationBudgetPlanListItem[]>([])
  const [loadingGraphql, setLoadingGraphql] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    companyIdRef.current = companyId
  }, [companyId])

  const orgUnitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of companyOrgUnits) {
      map.set(u.id, u.name)
    }
    return map
  }, [companyOrgUnits])

  const teamOrgUnitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of teamMembers) {
      const ouId = m.organizationalUnitId
      if (ouId == null || ouId === '') {
        continue
      }
      const label = m.orgUnitName?.trim()
      if (label) {
        map.set(ouId, label)
      }
    }
    return map
  }, [teamMembers])

  /** Sum of `currentAnnualSalary` for team members per org unit (same baseline as budget distribution). */
  const orgUnitCurrentTotalSalaryById = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of teamMembers) {
      const ouId = m.organizationalUnitId
      if (ouId == null || ouId === '') {
        continue
      }
      const add = m.currentAnnualSalary ?? 0
      map.set(ouId, (map.get(ouId) ?? 0) + add)
    }
    return map
  }, [teamMembers])

  const tableRows: SubmissionsOrgUnitTableRow[] = useMemo(
    () =>
      buildSubmissionsOrgUnitTableRows(
        orgRows,
        companyRowById,
        plans,
        orgUnitNameById,
        teamOrgUnitNameById,
        orgUnitCurrentTotalSalaryById,
        proposedNewSalarySumByOrgUnitBudgetRowId,
        salaryAdjustmentsByOrgUnitBudgetRowId,
        defaultCurrencyCode
      ),
    [
      companyRowById,
      defaultCurrencyCode,
      orgRows,
      orgUnitCurrentTotalSalaryById,
      orgUnitNameById,
      plans,
      proposedNewSalarySumByOrgUnitBudgetRowId,
      salaryAdjustmentsByOrgUnitBudgetRowId,
      teamOrgUnitNameById
    ]
  )
  const companyBudgetRows = useMemo(() => [...companyRowById.values()], [companyRowById])

  const fetchData = useCallback(async () => {
    if (!accessToken || !companyId) {
      setOrgRows([])
      setProposedNewSalarySumByOrgUnitBudgetRowId(new Map())
      setSalaryAdjustmentsByOrgUnitBudgetRowId(new Map())
      setCompanyRowById(new Map())
      setPlans([])
      setError(null)
      return
    }
    const companyIdForRequest = companyId
    setLoadingGraphql(true)
    setError(null)
    try {
      if (selectedCompensationPlanId == null) {
        if (companyIdRef.current === companyIdForRequest) {
          setOrgRows([])
          setProposedNewSalarySumByOrgUnitBudgetRowId(new Map())
          setSalaryAdjustmentsByOrgUnitBudgetRowId(new Map())
          setCompanyRowById(new Map())
          setPlans([])
          setError(null)
        }
        return
      }

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

      const nextPlans = sortPlans((plansResult.CompensationBudgetPlan ?? []).map(fillPlanListItem))
      const companyRowsAll = (companyRowsResult.CompensationBudgetPlanCompany ?? []).map(mapCompanyRow)
      const companyRows = companyRowsAll.filter(r => r.compensationBudgetPlanId === selectedCompensationPlanId)
      const nextCompanyRowById = new Map(companyRows.map(r => [r.id, r]))
      const companyBudgetIds = companyRows.map(r => r.id)

      let orgRaw: Record<string, unknown>[] = []
      if (companyBudgetIds.length > 0) {
        const orgResult = await graphqlClient.request<{
          CompensationBudgetPlanOrganizationalUnit: Record<string, unknown>[]
        }>(LIST_COMPENSATION_BUDGET_PLAN_ORGANIZATIONAL_UNIT_BY_COMPANY_BUDGET_IDS, {
          compensationBudgetPlanCompanyIds: companyBudgetIds
        })
        if (companyIdRef.current !== companyIdForRequest) {
          return
        }
        orgRaw = orgResult.CompensationBudgetPlanOrganizationalUnit ?? []
      }

      const orgUnitBudgetRowIds = orgRaw.map(r => graphqlUnknownToString(r.id)).filter(id => id !== '')
      let proposedSumByRowId = new Map<string, number>()
      let salaryAdjustmentsByRowId = new Map<string, SubmissionsEmployeeSalaryAdjustmentRow[]>()
      if (orgUnitBudgetRowIds.length > 0) {
        const empResult = await graphqlClient.request<{
          CompensationBudgetPlanEmployee: Record<string, unknown>[]
        }>(LIST_COMPENSATION_BUDGET_PLAN_EMPLOYEES_BY_ORG_UNIT_IDS, { orgUnitBudgetIds: orgUnitBudgetRowIds })
        if (companyIdRef.current !== companyIdForRequest) {
          return
        }
        proposedSumByRowId = buildProposedNewSalarySumByOrgUnitBudgetRowId(
          empResult.CompensationBudgetPlanEmployee ?? []
        )
        salaryAdjustmentsByRowId = buildSalaryAdjustmentsByOrgUnitBudgetRowId(
          empResult.CompensationBudgetPlanEmployee ?? []
        )
      }

      setPlans(nextPlans)
      setCompanyRowById(nextCompanyRowById)
      setProposedNewSalarySumByOrgUnitBudgetRowId(proposedSumByRowId)
      setSalaryAdjustmentsByOrgUnitBudgetRowId(salaryAdjustmentsByRowId)
      setOrgRows(orgRaw.map(mapOrgUnitRow))
    } catch (err) {
      logBudgetGraphqlFailure('SubmissionsOrgUnitBudgetTable', err)
      const message = err instanceof Error ? err.message : 'Failed to load submissions data'
      setError(message)
      setOrgRows([])
      setProposedNewSalarySumByOrgUnitBudgetRowId(new Map())
      setSalaryAdjustmentsByOrgUnitBudgetRowId(new Map())
      setCompanyRowById(new Map())
      setPlans([])
    } finally {
      setLoadingGraphql(false)
    }
  }, [accessToken, companyId, graphqlClient, selectedCompensationPlanId])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  const refetch = useCallback(() => {
    void fetchData()
  }, [fetchData])

  return {
    rows: tableRows,
    companyBudgetRows,
    loading: loadingGraphql || loadingOrgUnits,
    error,
    refetch,
    hasCompanyBudgetRows: companyRowById.size > 0
  }
}
