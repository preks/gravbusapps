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

interface OrganizationalUnitRef {
  id: string
  name: string
}

interface OrganizationalUnitEmployeeAssignment {
  employeeId: string
  role: string | null
  managerLevel: string | null
  isMain: boolean | null
}

interface OrganizationalUnitRelationshipResult {
  childId: string
  parentId: string | null
  parent: OrganizationalUnitRef | null
}

interface EmployeeWorkingConditionResult {
  hireDate: string | null
  activeFrom: string | null
  activeTo: string | null
  contractType: { objectValue: unknown } | null
}

interface EmployeePositionResult {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  hireDate: string | null
  companyId: string | null
  organizationalUnitId: string | null
  organizationalUnit:
    | (OrganizationalUnitRef & { organizationalUnitEmployee?: OrganizationalUnitEmployeeAssignment[] })
    | null
  siteLocationId: string | null
  supervisorEmployeeId: string | null
  jobPosition: {
    id: string
    name: string
    jobFunction: { jobFamily: { id: string } | null } | null
    jobProfile: {
      jobFunction: { jobFamily: { id: string } | null } | null
    } | null
    jobLevel: { id: string } | null
  } | null
  employee: {
    id: string
    code: string
    firstName: string | null
    lastName: string | null
    displayName: string
    picture: string | null
    pictureThumbnail: string | null
    workingCondition: EmployeeWorkingConditionResult[]
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

function dateKeyFromGraphQLValue(value: string): string {
  return value.slice(0, 10)
}

function getActiveWorkingCondition(
  workingConditions: EmployeeWorkingConditionResult[] | undefined,
  targetDateKey: string
): EmployeeWorkingConditionResult | undefined {
  if (!workingConditions?.length) {
    return undefined
  }

  if (workingConditions.length === 1) {
    return workingConditions[0]
  }

  return workingConditions.find(condition => {
    const activeFromKey = condition.activeFrom ? dateKeyFromGraphQLValue(condition.activeFrom) : ''
    const activeToKey = condition.activeTo ? dateKeyFromGraphQLValue(condition.activeTo) : ''

    if (!activeFromKey) {
      return false
    }

    return activeFromKey <= targetDateKey && (!activeToKey || activeToKey >= targetDateKey)
  })
}

function isPayrollRelevantContract(contractObjectValue: unknown): boolean {
  if (!contractObjectValue || typeof contractObjectValue !== 'object') {
    return false
  }

  const payrollRelevant = (contractObjectValue as Record<string, unknown>).payroll_relevant
  return payrollRelevant === true || payrollRelevant === 'true'
}

function hasPayrollRelevantActiveWorkingCondition(pos: EmployeePositionResult, targetDateKey: string): boolean {
  const activeWorkingCondition = getActiveWorkingCondition(pos.employee?.workingCondition, targetDateKey)
  return isPayrollRelevantContract(activeWorkingCondition?.contractType?.objectValue)
}

function isManagerOrgUnitAssignment(pos: EmployeePositionResult): boolean {
  const assignments = pos.organizationalUnit?.organizationalUnitEmployee ?? []
  return assignments.some(
    assignment =>
      assignment.employeeId === pos.employeeId && (assignment.role?.trim().toLowerCase() ?? '') === 'manager'
  )
}

function effectiveOrgUnitForPosition(
  pos: EmployeePositionResult,
  parentOrgUnitByChildId: ReadonlyMap<string, OrganizationalUnitRef>,
  resolveManagerOrgUnitToParent: boolean
): OrganizationalUnitRef | null {
  if (!resolveManagerOrgUnitToParent || !isManagerOrgUnitAssignment(pos)) {
    return pos.organizationalUnit
  }

  const directOrgUnitId = pos.organizationalUnitId?.trim()
  if (!directOrgUnitId) {
    return pos.organizationalUnit
  }

  return parentOrgUnitByChildId.get(directOrgUnitId) ?? pos.organizationalUnit
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
  bonusTotalMap: Map<string, number>,
  parentOrgUnitByChildId: ReadonlyMap<string, OrganizationalUnitRef>,
  resolveManagerOrgUnitToParent: boolean,
  targetDateKey: string
): TeamMemberCompensationData {
  const activeWorkingCondition = getActiveWorkingCondition(pos.employee?.workingCondition, targetDateKey)
  const salary = currentSalaryMap.get(pos.employeeId)
  const lastRaise = lastRaiseMap.get(pos.employeeId)
  const band = compensationBandForPosition(pos, bandByFamilyLevelAndGeoZoneId, geoZoneBySiteLocationId)
  const currencyCode = salary?.currency?.code ?? band?.currency?.value ?? 'EUR'
  const bandData = band ? { minSalary: band.minSalary, maxSalary: band.maxSalary, payGrade: band.payGrade } : null
  const currentAnnual = salary?.annualGrossSalary ?? null
  const effectiveOrgUnit = effectiveOrgUnitForPosition(pos, parentOrgUnitByChildId, resolveManagerOrgUnitToParent)

  return {
    employeeId: pos.employeeId,
    employeeCode: pos.employee?.code ?? '',
    firstName: pos.employee?.firstName ?? pos.firstName,
    lastName: pos.employee?.lastName ?? pos.lastName,
    displayName: pos.employee?.displayName ?? `${pos.firstName} ${pos.lastName}`,
    pictureThumbnail: pos.employee?.pictureThumbnail ?? undefined,
    jobPosition: pos.jobPosition?.name ?? null,
    jobFunction: null,
    orgUnitName: effectiveOrgUnit?.name ?? null,
    organizationalUnitId: effectiveOrgUnit?.id ?? pos.organizationalUnitId ?? null,
    hireDate: activeWorkingCondition?.hireDate ?? pos.hireDate,
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
  companyIds?: string[]
  orgUnitId?: string | null
  supervisorEmployeeId?: string | null
  supervisorOnly?: boolean
  requirePayrollRelevantContractType?: boolean
  resolveManagerOrgUnitToParent?: boolean
  enabled?: boolean
}

function buildEmployeeWhereForPosition(): Record<string, unknown> {
  return {
    isDeleted: { _eq: false }
  }
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

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
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
  companyIds,
  orgUnitId,
  supervisorEmployeeId,
  supervisorOnly = false,
  requirePayrollRelevantContractType = false,
  resolveManagerOrgUnitToParent = false,
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
    const normalizedCompanyIds = [...new Set((companyIds ?? []).map(id => id.trim()).filter(Boolean))]
    if (supervisorOnly) {
      if (!supervisorEmployeeId) {
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
      const now = new Date()
      const today = formatLocalDate(now)
      const yearStart = `${now.getFullYear()}-01-01`
      const whereConditions: Record<string, unknown>[] = [
        { employee: buildEmployeeWhereForPosition(requirePayrollRelevantContractType) }
      ]
      if (normalizedCompanyIds.length > 0) {
        whereConditions.push({ companyId: { _in: normalizedCompanyIds } })
      } else if (companyId) {
        whereConditions.push({ companyId: { _eq: companyId } })
      }
      if (orgUnitId) whereConditions.push({ organizationalUnitId: { _eq: orgUnitId } })
      if (supervisorEmployeeId) whereConditions.push({ supervisorEmployeeId: { _eq: supervisorEmployeeId } })

      const where = whereConditions.length === 1 ? whereConditions[0] : { _and: whereConditions }
      const structureId = await resolveActiveStructureId(orgchartClient, accessToken)
      const relationshipWhere =
        resolveManagerOrgUnitToParent && structureId ? { structureId: { _eq: structureId } } : { id: { _isNull: true } }

      const positionsResult = await graphqlClient
        .request<{
          EmployeePosition: EmployeePositionResult[]
          OrganizationalUnitRelationship: OrganizationalUnitRelationshipResult[]
        }>(GET_COMPENSATION_TEAM_MEMBERS, { where, relationshipWhere })
        .catch((e: unknown) => {
          const m = e instanceof Error ? e.message : String(e)
          throw new Error(`Team member positions: ${m}`)
        })

      const positions = requirePayrollRelevantContractType
        ? (positionsResult.EmployeePosition || []).filter(pos => hasPayrollRelevantActiveWorkingCondition(pos, today))
        : positionsResult.EmployeePosition || []
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
      const parentOrgUnitByChildId = new Map<string, OrganizationalUnitRef>()
      for (const relationship of positionsResult.OrganizationalUnitRelationship ?? []) {
        if (relationship.parent) {
          parentOrgUnitByChildId.set(relationship.childId, relationship.parent)
        }
      }
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
          bonusTotalMap,
          parentOrgUnitByChildId,
          resolveManagerOrgUnitToParent,
          today
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
    companyIds,
    orgUnitId,
    supervisorEmployeeId,
    supervisorOnly,
    requirePayrollRelevantContractType,
    resolveManagerOrgUnitToParent,
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
