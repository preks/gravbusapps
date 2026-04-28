import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  GET_COMPENSATION_BAND_POLICIES_FOR_TEAM,
  GET_COMPENSATION_TEAM_MEMBERS,
  GET_TEAM_BONUSES_FOR_COMPENSATION,
  GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION,
  GET_TEAM_SALARY_HISTORY_FOR_COMPENSATION
} from '../../../queries/compensationPlanningQueries'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { computeCompaRatio } from '../../../utils/budgetCalculations'

interface CompensationBandGraphql {
  payGrade: number | null
  minSalary: number
  maxSalary: number
  currency: { value: string }
}

interface CompensationBandPolicyForTeamQuery {
  jobFamilyId: string
  jobLevelId: string
  geoZoneId: string
  compensationBand: CompensationBandGraphql | null
}

interface SiteLocationResult {
  id: string
  geo_zone?: string | null
}

type SiteLocationResponse = SiteLocationResult[] | { data?: SiteLocationResult[] }

interface ActiveStructureResponse {
  structure?: { structureId?: string }
}

interface EmployeePositionResult {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  hireDate: string | null
  organizationalUnitId: string | null
  organizationalUnit: { id: string; name: string } | null
  siteLocationId: string | null
  supervisorEmployeeId: string | null
  jobPosition: {
    name: string
    jobFunction: { jobFamily: { id: string } | null } | null
    jobProfile: {
      jobFunction: { jobFamily: { id: string } | null } | null
    } | null
    jobLevel: { id: string } | null
  } | null
  employee: {
    code: string
    displayName: string
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

function jobLevelIdFromPosition(pos: EmployeePositionResult): string | null {
  return pos.jobPosition?.jobLevel?.id?.trim() || null
}

function jobFamilyIdFromPosition(pos: EmployeePositionResult): string | null {
  return (
    pos.jobPosition?.jobFunction?.jobFamily?.id?.trim() ||
    pos.jobPosition?.jobProfile?.jobFunction?.jobFamily?.id?.trim() ||
    null
  )
}

function geoZoneIdFromPosition(
  pos: EmployeePositionResult,
  geoZoneBySiteLocationId: Map<string, string>
): string | null {
  const siteLocationId = pos.siteLocationId?.trim()
  if (!siteLocationId) {
    return null
  }
  return geoZoneBySiteLocationId.get(siteLocationId) ?? siteLocationId
}

function compensationBandPolicyKey(jobFamilyId: string, jobLevelId: string, geoZoneId: string): string {
  return `${jobFamilyId}:${jobLevelId}:${geoZoneId}`
}

function compensationBandForPosition(
  pos: EmployeePositionResult,
  bandByFamilyLevelAndGeoZoneId: Map<string, CompensationBandGraphql | null>,
  geoZoneBySiteLocationId: Map<string, string>
): CompensationBandGraphql | null {
  const jlId = jobLevelIdFromPosition(pos)
  const jfId = jobFamilyIdFromPosition(pos)
  const geoZoneId = geoZoneIdFromPosition(pos, geoZoneBySiteLocationId)
  if (jlId == null || jfId == null || geoZoneId == null) {
    return null
  }
  return bandByFamilyLevelAndGeoZoneId.get(compensationBandPolicyKey(jfId, jlId, geoZoneId)) ?? null
}

function buildTeamMemberFromPosition(
  pos: EmployeePositionResult,
  bandByFamilyLevelAndGeoZoneId: Map<string, CompensationBandGraphql | null>,
  geoZoneBySiteLocationId: Map<string, string>,
  currentSalaryMap: Map<string, SalaryResult>,
  lastRaiseMap: Map<string, { date: string; amount: number | null; percent: number | null }>,
  bonusTotalMap: Map<string, number>
): TeamMemberCompensationData {
  const salary = currentSalaryMap.get(pos.employeeId)
  const lastRaise = lastRaiseMap.get(pos.employeeId)
  const band = compensationBandForPosition(pos, bandByFamilyLevelAndGeoZoneId, geoZoneBySiteLocationId)
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
}

interface UseTeamCompensationDataParams {
  accessToken: string
  companyId?: string | null
  orgUnitId?: string | null
  supervisorEmployeeId?: string | null
  supervisorOnly?: boolean
  requirePayrollRelevantContractType?: boolean
  enabled?: boolean
}

function buildEmployeeWhereForPosition(requirePayrollRelevantContractType: boolean): Record<string, unknown> {
  const employee: Record<string, unknown> = {
    isDeleted: { _eq: false }
  }
  if (requirePayrollRelevantContractType) {
    employee.workingCondition = {
      isDeleted: { _eq: false },
      contractType: {
        _or: [
          { objectValue: { _contains: { payroll_relevant: true } } },
          { objectValue: { _contains: { payroll_relevant: 'true' } } }
        ]
      }
    }
  }
  return employee
}

function extractSiteLocations(response: SiteLocationResponse): SiteLocationResult[] {
  if (Array.isArray(response)) {
    return response
  }
  return response.data ?? []
}

function buildSiteLocationGeoZoneMap(siteLocations: SiteLocationResult[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const siteLocation of siteLocations) {
    const geoZoneId = siteLocation.geo_zone?.trim()
    if (geoZoneId) {
      map.set(siteLocation.id, geoZoneId)
    }
  }
  return map
}

async function resolveActiveStructureId(
  orgchartClient: ReturnType<typeof useOrgchartClient>,
  accessToken: string
): Promise<string | null> {
  const activeStructureId = getCurrentActiveStructureId()
  if (activeStructureId) {
    return activeStructureId
  }

  return orgchartClient
    .getStructuresActive<ActiveStructureResponse>(
      { nodeType: 'cost_center', isPlanningMode: false },
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    .then(response => response.structure?.structureId ?? null)
    .catch(() => null)
}

export function useTeamCompensationData({
  accessToken,
  companyId,
  orgUnitId,
  supervisorEmployeeId,
  supervisorOnly = false,
  requirePayrollRelevantContractType = false,
  enabled = true
}: UseTeamCompensationDataParams) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberCompensationData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const orgchartClient = useOrgchartClient(accessToken)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setTeamMembers([])
      setLoading(false)
      setError(null)
      return
    }
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
      const whereConditions: Record<string, unknown>[] = [
        { employee: buildEmployeeWhereForPosition(requirePayrollRelevantContractType) }
      ]
      if (companyId) whereConditions.push({ companyId: { _eq: companyId } })
      if (orgUnitId) whereConditions.push({ organizationalUnitId: { _eq: orgUnitId } })
      if (supervisorEmployeeId) whereConditions.push({ supervisorEmployeeId: { _eq: supervisorEmployeeId } })

      const where = whereConditions.length === 1 ? whereConditions[0] : { _and: whereConditions }

      const positionsResult = await graphqlClient
        .request<{
          EmployeePosition: EmployeePositionResult[]
        }>(GET_COMPENSATION_TEAM_MEMBERS, { where })
        .catch((e: unknown) => {
          const m = e instanceof Error ? e.message : String(e)
          throw new Error(`Team member positions: ${m}`)
        })

      const positions = positionsResult.EmployeePosition || []
      if (positions.length === 0) {
        setTeamMembers([])
        setLoading(false)
        return
      }

      const jobLevelIds = [
        ...new Set(positions.map(jobLevelIdFromPosition).filter((id): id is string => id != null && id.length > 0))
      ]
      const jobFamilyIds = [
        ...new Set(positions.map(jobFamilyIdFromPosition).filter((id): id is string => id != null && id.length > 0))
      ]
      const siteLocationIds = [
        ...new Set(positions.map(pos => pos.siteLocationId?.trim()).filter((id): id is string => Boolean(id)))
      ]
      const structureId = await resolveActiveStructureId(orgchartClient, accessToken)
      const geoZoneBySiteLocationId =
        siteLocationIds.length > 0 && structureId
          ? await orgchartClient
              .getSiteLocations<SiteLocationResponse>(
                { structureId, limit: 1000, offset: 0 },
                { headers: { Authorization: `Bearer ${accessToken}` } }
              )
              .then(response => buildSiteLocationGeoZoneMap(extractSiteLocations(response)))
              .catch((e: unknown) => {
                console.warn(
                  '[useTeamCompensationData] Site location geo zone lookup failed; falling back to site location ids.',
                  e
                )
                return new Map<string, string>()
              })
          : new Map<string, string>()
      const geoZoneIds = [
        ...new Set(
          positions
            .map(pos => geoZoneIdFromPosition(pos, geoZoneBySiteLocationId))
            .filter((id): id is string => id != null && id.length > 0)
        )
      ]

      const bandByFamilyLevelAndGeoZoneId = new Map<string, CompensationBandGraphql | null>()
      if (jobFamilyIds.length > 0 && jobLevelIds.length > 0 && geoZoneIds.length > 0) {
        try {
          const policyRows = await graphqlClient.request<{
            CompensationBandPolicy: CompensationBandPolicyForTeamQuery[]
          }>(GET_COMPENSATION_BAND_POLICIES_FOR_TEAM, { jobFamilyIds, jobLevelIds, geoZoneIds })
          for (const row of policyRows.CompensationBandPolicy ?? []) {
            const key = compensationBandPolicyKey(row.jobFamilyId, row.jobLevelId, row.geoZoneId)
            if (!bandByFamilyLevelAndGeoZoneId.has(key)) {
              bandByFamilyLevelAndGeoZoneId.set(key, row.compensationBand)
            }
          }
        } catch (e) {
          console.warn(
            '[useTeamCompensationData] CompensationBandPolicy query failed; compa and band min/max are omitted.',
            e
          )
        }
      }

      const employeeIds = [...new Set(positions.map(p => p.employeeId))]
      const now = new Date()
      const y = now.getFullYear()
      const pad = (n: number) => String(n).padStart(2, '0')
      const today = `${y}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
      const yearStart = `${y}-01-01`

      const [currentSalRes, historyRes, bonusRes] = await Promise.all([
        graphqlClient
          .request<{
            EmployeeSalary: SalaryResult[]
          }>(GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION, { employeeIds, today })
          .then(r => r.EmployeeSalary ?? []),
        graphqlClient
          .request<{
            EmployeeSalary: SalaryHistoryResult[]
          }>(GET_TEAM_SALARY_HISTORY_FOR_COMPENSATION, { employeeIds })
          .then(r => r.EmployeeSalary ?? []),
        graphqlClient
          .request<{
            EmployeeBonus: BonusResult[]
          }>(GET_TEAM_BONUSES_FOR_COMPENSATION, { employeeIds, yearStart, today })
          .then(r => r.EmployeeBonus ?? [])
      ]).catch((e: unknown) => {
        const m = e instanceof Error ? e.message : String(e)
        throw new Error(`Team salaries / history / bonuses: ${m}`)
      })

      const currentSalaryMap = buildCurrentSalaryMap(currentSalRes, today)
      const lastRaiseMap = buildLastRaiseMap(historyRes)
      const bonusTotalMap = buildBonusTotalMap(bonusRes)

      const members: TeamMemberCompensationData[] = positions.map(pos =>
        buildTeamMemberFromPosition(
          pos,
          bandByFamilyLevelAndGeoZoneId,
          geoZoneBySiteLocationId,
          currentSalaryMap,
          lastRaiseMap,
          bonusTotalMap
        )
      )

      setTeamMembers(members)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load team compensation data'
      console.error('Error fetching team compensation data:', err)
      setError(message)
      setTeamMembers([])
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    companyId,
    orgUnitId,
    supervisorEmployeeId,
    supervisorOnly,
    requirePayrollRelevantContractType,
    enabled,
    graphqlClient,
    orgchartClient
  ])

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

function buildBonusTotalMap(bonuses: BonusResult[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const bonus of bonuses) {
    const current = map.get(bonus.employeeId) ?? 0
    map.set(bonus.employeeId, current + bonus.amount)
  }
  return map
}
