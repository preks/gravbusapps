import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_COMPENSATION_TEAM_MEMBERS,
  GET_TEAM_CURRENT_SALARIES,
  GET_TEAM_SALARY_HISTORY,
  GET_TEAM_BONUSES
} from '../../../queries/compensationPlanningQueries'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { computeCompaRatio } from '../../../utils/budgetCalculations'

interface EmployeePositionResult {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  hireDate: string | null
  companyId: string
  company: { id: string; name: string } | null
  organizationalUnitId: string | null
  organizationalUnit: { id: string; name: string } | null
  supervisorEmployeeId: string | null
  jobPosition: {
    id: string
    name: string
    jobLevel: {
      compensationBand: {
        id: string
        name: string
        payGrade: number | null
        minSalary: number
        maxSalary: number
        currencyRef: string
        currency: { id: string; code: string; value: string }
      } | null
    } | null
  } | null
  employee: {
    id: string
    code: string
    displayName: string
    fullName: string
    pictureThumbnail: string | null
    workingCondition: { hireDate: string | null } | null
    workingHours: Array<{ weeklyHours: number | null; fullTimeEquivalent: number | null }>
  } | null
}

interface SalaryResult {
  id: string
  employeeId: string
  annualGrossSalary: number | null
  monthlyGrossSalary: number | null
  hourlyGrossSalary: number | null
  currency: { id: string; code: string; value: string } | null
  currencyRef: string
  startDate: string | null
  endDate: string | null
}

interface SalaryHistoryResult extends SalaryResult {
  requestedPercent: number | null
  requestedAmount: number | null
  createdAt: string
}

interface BonusResult {
  id: string
  employeeId: string
  amount: number
  currency: { id: string; code: string; value: string } | null
  paymentDate: string | null
  fiscalYear: number | null
}

interface UseTeamCompensationDataParams {
  accessToken: string
  companyId?: string | null
  orgUnitId?: string | null
  supervisorEmployeeId?: string | null
  supervisorOnly?: boolean
}

export function useTeamCompensationData({
  accessToken,
  companyId,
  orgUnitId,
  supervisorEmployeeId,
  supervisorOnly = false
}: UseTeamCompensationDataParams) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberCompensationData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchData = useCallback(async () => {
    if (!accessToken) return
    if (supervisorOnly) {
      if (!supervisorEmployeeId || !companyId) {
        setTeamMembers([])
        setLoading(false)
        setError(null)
        return
      }
    } else if (!companyId && !orgUnitId && !supervisorEmployeeId) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const whereConditions: any[] = [{ employee: { isDeleted: { _eq: false } } }]
      /** Company selector: only positions tied to the selected company. */
      if (companyId) whereConditions.push({ companyId: { _eq: companyId } })
      if (orgUnitId) whereConditions.push({ organizationalUnitId: { _eq: orgUnitId } })
      if (supervisorEmployeeId) whereConditions.push({ supervisorEmployeeId: { _eq: supervisorEmployeeId } })

      const where = whereConditions.length === 1 ? whereConditions[0] : { _and: whereConditions }

      const positionsResult = await graphqlClient.request<{
        EmployeePosition: EmployeePositionResult[]
      }>(GET_COMPENSATION_TEAM_MEMBERS, { where })

      const positions = positionsResult.EmployeePosition || []
      if (positions.length === 0) {
        setTeamMembers([])
        setLoading(false)
        return
      }

      const employeeIds = [...new Set(positions.map(p => p.employeeId))]
      const now = new Date()
      const y = now.getFullYear()
      const pad = (n: number) => String(n).padStart(2, '0')
      const todayLocal = `${y}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const yearStart = `${y}-01-01`
      const today = todayLocal

      const [salariesResult, historyResult, bonusesResult] = await Promise.all([
        graphqlClient.request<{ EmployeeSalary: SalaryResult[] }>(GET_TEAM_CURRENT_SALARIES, {
          employeeIds,
          today
        }),
        graphqlClient.request<{ EmployeeSalary: SalaryHistoryResult[] }>(GET_TEAM_SALARY_HISTORY, {
          employeeIds
        }),
        graphqlClient.request<{ EmployeeBonus: BonusResult[] }>(GET_TEAM_BONUSES, {
          employeeIds,
          yearStart,
          today: todayLocal
        })
      ])

      const currentSalaryMap = buildCurrentSalaryMap(salariesResult.EmployeeSalary || [], today)
      const lastRaiseMap = buildLastRaiseMap(historyResult.EmployeeSalary || [])
      const bonusTotalMap = buildBonusTotalMap(bonusesResult.EmployeeBonus || [])

      const members: TeamMemberCompensationData[] = positions.map(pos => {
        const salary = currentSalaryMap.get(pos.employeeId)
        const lastRaise = lastRaiseMap.get(pos.employeeId)
        const band = pos.jobPosition?.jobLevel?.compensationBand ?? null
        const currencyCode = salary?.currency?.code ?? band?.currency?.value ?? 'EUR'

        const bandData = band ? { minSalary: band.minSalary, maxSalary: band.maxSalary, payGrade: band.payGrade } : null
        const currentAnnual = salary?.annualGrossSalary ?? null

        return {
          employeeId: pos.employeeId,
          employeeCode: pos.employee?.code ?? '',
          firstName: pos.firstName,
          lastName: pos.lastName,
          displayName: pos.employee?.displayName ?? `${pos.firstName} ${pos.lastName}`,
          pictureThumbnail: pos.employee?.pictureThumbnail ?? undefined,
          jobPosition: pos.jobPosition?.name ?? null,
          jobFunction: null,
          orgUnitName: pos.organizationalUnit?.name ?? null,
          organizationalUnitId: pos.organizationalUnitId ?? null,
          hireDate: pos.employee?.workingCondition?.hireDate ?? pos.hireDate,
          currentAnnualSalary: currentAnnual,
          currentMonthlySalary: salary?.monthlyGrossSalary ?? null,
          currentHourlySalary: salary?.hourlyGrossSalary ?? null,
          currency: currencyCode,
          compensationBand: bandData,
          compaRatio: computeCompaRatio(currentAnnual, bandData),
          lastRaiseDate: lastRaise?.date ?? null,
          lastRaiseAmount: lastRaise?.amount ?? null,
          lastRaisePercent: lastRaise?.percent ?? null,
          fte: pos.employee?.workingHours?.[0]?.fullTimeEquivalent ?? null,
          weeklyHours: pos.employee?.workingHours?.[0]?.weeklyHours ?? null,
          currentBonusTotal: bonusTotalMap.get(pos.employeeId) ?? null
        }
      })

      setTeamMembers(members)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team compensation data'
      console.error('Error fetching team compensation data:', err)
      setError(message)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, companyId, orgUnitId, supervisorEmployeeId, supervisorOnly, graphqlClient])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { teamMembers, loading, error, refetch: fetchData }
}

function startDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  const ta = a ? new Date(a).getTime() : 0
  const tb = b ? new Date(b).getTime() : 0
  const na = Number.isNaN(ta) ? 0 : ta
  const nb = Number.isNaN(tb) ? 0 : tb
  return nb - na
}

function groupSalariesByEmployee<T extends { employeeId: string }>(rows: T[]): Map<string, T[]> {
  const by = new Map<string, T[]>()
  for (const row of rows) {
    const list = by.get(row.employeeId) ?? []
    list.push(row)
    by.set(row.employeeId, list)
  }
  return by
}

/** Picks the active salary with the latest effective `startDate` per employee (matches Compensation History “current” row). */
function buildCurrentSalaryMap(salaries: SalaryResult[], today: string): Map<string, SalaryResult> {
  const map = new Map<string, SalaryResult>()
  const byEmployee = groupSalariesByEmployee(salaries)

  for (const [employeeId, rows] of byEmployee) {
    const sorted = [...rows].sort((a, b) => startDateDesc(a.startDate, b.startDate))
    for (const salary of sorted) {
      const isActive = !salary.endDate || salary.endDate >= today
      if (isActive) {
        map.set(employeeId, salary)
        break
      }
    }
  }
  return map
}

/**
 * Last raise column: effective date of the latest approved salary (`startDate` of the most recent history row),
 * with amount/percent vs the previous period when two or more rows exist (otherwise API request fields).
 */
function buildLastRaiseMap(
  salaries: SalaryHistoryResult[]
): Map<string, { date: string; amount: number | null; percent: number | null }> {
  const map = new Map<string, { date: string; amount: number | null; percent: number | null }>()
  const byEmployee = groupSalariesByEmployee(salaries)

  for (const [employeeId, rows] of byEmployee) {
    const sorted = [...rows].sort((a, b) => startDateDesc(a.startDate, b.startDate))
    const latest = sorted[0]
    if (!latest?.startDate) continue

    const previous = sorted[1]
    const latestAnnual = latest.annualGrossSalary
    const prevAnnual = previous?.annualGrossSalary ?? null

    let amount: number | null = null
    let percent: number | null = null

    if (previous && latestAnnual != null && prevAnnual != null) {
      amount = latestAnnual - prevAnnual
      if (prevAnnual !== 0) {
        percent = (amount / prevAnnual) * 100
      }
    } else {
      amount = latest.requestedAmount ?? null
      percent = latest.requestedPercent ?? null
    }

    map.set(employeeId, {
      date: latest.startDate,
      amount,
      percent
    })
  }

  return map
}

/** Sums bonus amounts per employee (query already scopes to calendar YTD by paymentDate). */
function buildBonusTotalMap(bonuses: BonusResult[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const bonus of bonuses) {
    const current = map.get(bonus.employeeId) ?? 0
    map.set(bonus.employeeId, current + bonus.amount)
  }
  return map
}
