import { useEffect, useMemo, useState } from 'react'
import { useCompanyOrganizationalUnits } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_COMPENSATION_COMPANY_BASELINE_POSITIONS,
  GET_TEAM_BONUSES_FOR_COMPENSATION,
  GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION
} from '../../../queries/compensationPlanningQueries'
import { logBudgetGraphqlFailure } from '../../../utils/budgetPlanGraphqlDebug'
import type { OverviewOrgUnitSalaryRow } from '../components/views/OverviewOrgUnitSalaryCard'

const COMPANY_BASELINE_ORG_UNIT_LIMIT = 500

interface CompanyBaselinePositionResult {
  id: string
  employeeId: string
  companyId: string
  organizationalUnitId: string | null
  organizationalUnit: { id: string; name: string } | null
}

interface SalaryResult {
  employeeId: string
  annualGrossSalary: number | null
  startDate: string | null
  endDate: string | null
}

interface BonusResult {
  employeeId: string
  amount: number | null
}

export interface CompanyCompensationSalaryBaseline {
  loading: boolean
  error: string | null
  orgUnitSalaryRows: OverviewOrgUnitSalaryRow[]
  totalSalaryAcrossOrgUnits: number
  totalBonusAcrossOrgUnits: number
  teamMemberCount: number
}

export interface CompanyCompensationSalaryBaselineTotals {
  loading: boolean
  error: string | null
  totalSalaryByCompanyId: ReadonlyMap<string, number>
}

function num(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isNaN(parsed) ? 0 : parsed
}

function todayDateKey(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function startDateDesc(a: string | null, b: string | null): number {
  if (a == null && b == null) {
    return 0
  }
  if (a == null) {
    return 1
  }
  if (b == null) {
    return -1
  }
  return b.localeCompare(a)
}

function groupByEmployee<T extends { employeeId: string }>(rows: T[]): Map<string, T[]> {
  const byEmployee = new Map<string, T[]>()
  for (const row of rows) {
    const list = byEmployee.get(row.employeeId) ?? []
    list.push(row)
    byEmployee.set(row.employeeId, list)
  }
  return byEmployee
}

function buildCurrentSalaryByEmployee(salaries: SalaryResult[], today: string): Map<string, SalaryResult> {
  const map = new Map<string, SalaryResult>()
  for (const [employeeId, rows] of groupByEmployee(salaries)) {
    const sorted = [...rows].sort((a, b) => startDateDesc(a.startDate, b.startDate))
    const active = sorted.find(salary => !salary.endDate || salary.endDate >= today)
    if (active) {
      map.set(employeeId, active)
    }
  }
  return map
}

function buildBonusTotalByEmployee(bonuses: BonusResult[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const bonus of bonuses) {
    map.set(bonus.employeeId, (map.get(bonus.employeeId) ?? 0) + num(bonus.amount))
  }
  return map
}

function firstPositionByEmployee(positions: CompanyBaselinePositionResult[]): CompanyBaselinePositionResult[] {
  const byEmployee = new Map<string, CompanyBaselinePositionResult>()
  for (const position of positions) {
    if (!byEmployee.has(position.employeeId)) {
      byEmployee.set(position.employeeId, position)
    }
  }
  return [...byEmployee.values()]
}

export function useCompanyCompensationSalaryBaseline(
  accessToken: string,
  companyId: string | null | undefined,
  unassignedOrgUnitLabel: string,
  enabled = true
): CompanyCompensationSalaryBaseline {
  const graphqlClient = useGraphQLClient(accessToken)
  const { units: companyOrgUnits } = useCompanyOrganizationalUnits(
    accessToken,
    companyId ?? '',
    COMPANY_BASELINE_ORG_UNIT_LIMIT
  )
  const [positions, setPositions] = useState<CompanyBaselinePositionResult[]>([])
  const [salaryByEmployeeId, setSalaryByEmployeeId] = useState<Map<string, SalaryResult>>(() => new Map())
  const [bonusByEmployeeId, setBonusByEmployeeId] = useState<Map<string, number>>(() => new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchBaseline() {
      if (!enabled || !accessToken || !companyId) {
        setPositions([])
        setSalaryByEmployeeId(new Map())
        setBonusByEmployeeId(new Map())
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const today = todayDateKey()
        const yearStart = `${today.slice(0, 4)}-01-01`
        const where = {
          companyId: { _eq: companyId },
          employee: {
            isDeleted: { _eq: false },
            workingCondition: {
              isDeleted: { _eq: false },
              contractType: {
                _or: [
                  { objectValue: { _contains: { payroll_relevant: true } } },
                  { objectValue: { _contains: { payroll_relevant: 'true' } } }
                ]
              }
            }
          }
        }

        const positionResult = await graphqlClient.request<{
          EmployeePosition: CompanyBaselinePositionResult[]
        }>(GET_COMPENSATION_COMPANY_BASELINE_POSITIONS, { where })

        const uniquePositions = firstPositionByEmployee(positionResult.EmployeePosition ?? [])
        const employeeIds = uniquePositions.map(position => position.employeeId)

        if (employeeIds.length === 0) {
          if (!cancelled) {
            setPositions([])
            setSalaryByEmployeeId(new Map())
            setBonusByEmployeeId(new Map())
          }
          return
        }

        const [salaryResult, bonusResult] = await Promise.all([
          graphqlClient.request<{ EmployeeSalary: SalaryResult[] }>(GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION, {
            employeeIds,
            today
          }),
          graphqlClient.request<{ EmployeeBonus: BonusResult[] }>(GET_TEAM_BONUSES_FOR_COMPENSATION, {
            employeeIds,
            yearStart,
            today
          })
        ])

        if (!cancelled) {
          setPositions(uniquePositions)
          setSalaryByEmployeeId(buildCurrentSalaryByEmployee(salaryResult.EmployeeSalary ?? [], today))
          setBonusByEmployeeId(buildBonusTotalByEmployee(bonusResult.EmployeeBonus ?? []))
        }
      } catch (err) {
        logBudgetGraphqlFailure('useCompanyCompensationSalaryBaseline', err)
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load company salary baseline'
          setError(message)
          setPositions([])
          setSalaryByEmployeeId(new Map())
          setBonusByEmployeeId(new Map())
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchBaseline()

    return () => {
      cancelled = true
    }
  }, [accessToken, companyId, enabled, graphqlClient])

  const orgUnitNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const unit of companyOrgUnits) {
      map.set(unit.id, unit.name)
    }
    return map
  }, [companyOrgUnits])

  const orgUnitSalaryRows = useMemo(() => {
    const rowsByOrgUnitId = new Map<string, OverviewOrgUnitSalaryRow>()
    for (const position of positions) {
      const orgUnitId = position.organizationalUnitId ?? 'unassigned'
      const existing = rowsByOrgUnitId.get(orgUnitId)
      const currentSalary = salaryByEmployeeId.get(position.employeeId)?.annualGrossSalary ?? 0
      const currentBonus = bonusByEmployeeId.get(position.employeeId) ?? 0
      const orgUnitName = orgUnitNameById.get(orgUnitId) ?? position.organizationalUnit?.name ?? unassignedOrgUnitLabel

      if (existing) {
        existing.headcount += 1
        existing.salaryCost += currentSalary
        existing.bonusCostYtd += currentBonus
      } else {
        rowsByOrgUnitId.set(orgUnitId, {
          orgUnitId,
          orgUnitName,
          headcount: 1,
          salaryCost: currentSalary,
          bonusCostYtd: currentBonus
        })
      }
    }

    return [...rowsByOrgUnitId.values()].sort((a, b) => a.orgUnitName.localeCompare(b.orgUnitName))
  }, [bonusByEmployeeId, orgUnitNameById, positions, salaryByEmployeeId, unassignedOrgUnitLabel])

  const totalSalaryAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, row) => sum + row.salaryCost, 0),
    [orgUnitSalaryRows]
  )
  const totalBonusAcrossOrgUnits = useMemo(
    () => orgUnitSalaryRows.reduce((sum, row) => sum + row.bonusCostYtd, 0),
    [orgUnitSalaryRows]
  )

  return {
    loading,
    error,
    orgUnitSalaryRows,
    totalSalaryAcrossOrgUnits,
    totalBonusAcrossOrgUnits,
    teamMemberCount: positions.length
  }
}

export function useCompanyCompensationSalaryBaselineTotals(
  accessToken: string,
  companyIds: string[],
  enabled = true
): CompanyCompensationSalaryBaselineTotals {
  const graphqlClient = useGraphQLClient(accessToken)
  const normalizedCompanyIds = useMemo(
    () => [...new Set(companyIds.map(id => id.trim()).filter(id => id.length > 0))].sort((a, b) => a.localeCompare(b)),
    [companyIds]
  )
  const companyIdsKey = normalizedCompanyIds.join('|')
  const [positions, setPositions] = useState<CompanyBaselinePositionResult[]>([])
  const [salaryByEmployeeId, setSalaryByEmployeeId] = useState<Map<string, SalaryResult>>(() => new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function fetchBaselineTotals() {
      if (!enabled || !accessToken || normalizedCompanyIds.length === 0) {
        setPositions([])
        setSalaryByEmployeeId(new Map())
        setLoading(false)
        setError(null)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const today = todayDateKey()
        const where = {
          companyId: { _in: normalizedCompanyIds },
          employee: {
            isDeleted: { _eq: false },
            workingCondition: {
              isDeleted: { _eq: false },
              contractType: {
                _or: [
                  { objectValue: { _contains: { payroll_relevant: true } } },
                  { objectValue: { _contains: { payroll_relevant: 'true' } } }
                ]
              }
            }
          }
        }

        const positionResult = await graphqlClient.request<{
          EmployeePosition: CompanyBaselinePositionResult[]
        }>(GET_COMPENSATION_COMPANY_BASELINE_POSITIONS, { where })

        const uniquePositions = firstPositionByEmployee(positionResult.EmployeePosition ?? [])
        const employeeIds = uniquePositions.map(position => position.employeeId)

        if (employeeIds.length === 0) {
          if (!cancelled) {
            setPositions([])
            setSalaryByEmployeeId(new Map())
          }
          return
        }

        const salaryResult = await graphqlClient.request<{ EmployeeSalary: SalaryResult[] }>(
          GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION,
          {
            employeeIds,
            today
          }
        )

        if (!cancelled) {
          setPositions(uniquePositions)
          setSalaryByEmployeeId(buildCurrentSalaryByEmployee(salaryResult.EmployeeSalary ?? [], today))
        }
      } catch (err) {
        logBudgetGraphqlFailure('useCompanyCompensationSalaryBaselineTotals', err)
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load company salary baseline totals'
          setError(message)
          setPositions([])
          setSalaryByEmployeeId(new Map())
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchBaselineTotals()

    return () => {
      cancelled = true
    }
  }, [accessToken, companyIdsKey, enabled, graphqlClient, normalizedCompanyIds])

  const totalSalaryByCompanyId = useMemo(() => {
    const map = new Map<string, number>()
    for (const position of positions) {
      const currentSalary = salaryByEmployeeId.get(position.employeeId)?.annualGrossSalary ?? 0
      map.set(position.companyId, (map.get(position.companyId) ?? 0) + currentSalary)
    }
    return map
  }, [positions, salaryByEmployeeId])

  return {
    loading,
    error,
    totalSalaryByCompanyId
  }
}
