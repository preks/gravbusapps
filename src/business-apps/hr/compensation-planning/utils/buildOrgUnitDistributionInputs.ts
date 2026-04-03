import type { CompanyOrganizationalUnit } from '@/common/data/orgchart/hooks/useCompanyOrganizationalUnits'
import type { TeamMemberCompensationData } from '../types/compensationPlanningTypes'
import type { OrgUnitDistributionInput } from './budgetCalculations'

/** Synthetic id for positions with no `organizationalUnitId` (grouped in one row). */
export const UNASSIGNED_ORG_UNIT_ID = '__unassigned__'

/**
 * Builds one {@link OrgUnitDistributionInput} per company org unit, aggregating team members by `organizationalUnitId`.
 * Includes every org unit from the company chart (even with zero people).
 */
export function buildOrgUnitDistributionInputs(
  companyOrgUnits: CompanyOrganizationalUnit[],
  teamMembers: TeamMemberCompensationData[]
): OrgUnitDistributionInput[] {
  const sorted = [...companyOrgUnits].sort((a, b) => a.name.localeCompare(b.name))
  return sorted.map(u => {
    const inUnit = teamMembers.filter(m => m.organizationalUnitId === u.id)
    const headcount = inUnit.length
    const currentTotalSalaryCost = inUnit.reduce((sum, m) => sum + (m.currentAnnualSalary ?? 0), 0)
    const ratings = inUnit.map(m => m.performanceOverallScore).filter((x): x is number => x != null && !Number.isNaN(x))
    const totalPerformanceScore = ratings.reduce((a, b) => a + b, 0)
    const averagePerformanceRating = ratings.length > 0 ? totalPerformanceScore / ratings.length : null

    return {
      orgUnitId: u.id,
      orgUnitName: u.name,
      headcount,
      currentTotalSalaryCost,
      totalPerformanceScore,
      averagePerformanceRating
    }
  })
}

/**
 * One row per org unit **that appears on at least one team member’s position** (plus one row for unassigned).
 * Use for overview-style views where the list should follow employees, not the full company org chart.
 * `teamMembers` should already be scoped to the selected company (e.g. from {@link useTeamCompensationData}).
 */
export function buildOrgUnitDistributionInputsFromTeamMembers(
  teamMembers: TeamMemberCompensationData[],
  options?: { unassignedLabel?: string }
): OrgUnitDistributionInput[] {
  const unassignedLabel = options?.unassignedLabel ?? 'Unassigned'
  const groups = new Map<string, TeamMemberCompensationData[]>()

  for (const m of teamMembers) {
    const id = m.organizationalUnitId ?? UNASSIGNED_ORG_UNIT_ID
    const list = groups.get(id) ?? []
    list.push(m)
    groups.set(id, list)
  }

  const result: OrgUnitDistributionInput[] = []
  for (const [id, members] of groups) {
    const headcount = members.length
    const currentTotalSalaryCost = members.reduce((sum, x) => sum + (x.currentAnnualSalary ?? 0), 0)
    /** Department score for weights = sum of employee overall scores (`performanceOverallScore`). */
    const ratings = members
      .map(x => x.performanceOverallScore)
      .filter((x): x is number => x != null && !Number.isNaN(x))
    const totalPerformanceScore = ratings.reduce((a, b) => a + b, 0)
    const averagePerformanceRating = ratings.length > 0 ? totalPerformanceScore / ratings.length : null

    const orgUnitName =
      id === UNASSIGNED_ORG_UNIT_ID
        ? unassignedLabel
        : (members.find(m => m.orgUnitName)?.orgUnitName ?? members[0]?.organizationalUnitId ?? id)

    result.push({
      orgUnitId: id,
      orgUnitName,
      headcount,
      currentTotalSalaryCost,
      totalPerformanceScore,
      averagePerformanceRating
    })
  }

  return result.sort((a, b) => {
    if (a.orgUnitId === UNASSIGNED_ORG_UNIT_ID) return 1
    if (b.orgUnitId === UNASSIGNED_ORG_UNIT_ID) return -1
    return a.orgUnitName.localeCompare(b.orgUnitName)
  })
}
