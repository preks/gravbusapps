import type { CompensationBudgetPlanEmployeeRestRow } from '../../../types/compensationBudgetPlanEmployeeRestRow'
import type { TeamMemberCompensationData } from '../../../types/compensationPlanningTypes'
import { resolvePlanOrganizationalUnitRowIdForTeamMember } from './buildManagerEmployeeBudgetSaveBody'

const DRAFT_STATUS = 'BUDGET_PLAN_DRAFT'

export type DraftEmployeeRowForSubmit = { id: string; version: number }

/**
 * Maps draft employee budget rows from GraphQL to employee ids for the current plan-OU resolution.
 * Prefer this over session-only REST ids so submit uses rows that still exist on the server.
 *
 * @param preferredRowIdByEmployeeId — ids from the last save; used when still present in `rows` (stable pick if duplicates).
 */
export function resolveDraftEmployeeRowsForSubmit(
  rows: CompensationBudgetPlanEmployeeRestRow[],
  teamMembers: TeamMemberCompensationData[],
  planOuRowIdByOrganizationalUnitId: ReadonlyMap<string, string>,
  managerOrganizationalUnitId: string | null,
  draftEmployeeIds: readonly string[],
  preferredRowIdByEmployeeId: ReadonlyMap<string, string>
): Map<string, DraftEmployeeRowForSubmit> {
  const memberById = new Map(teamMembers.map(m => [m.employeeId, m]))
  const draftRows = rows.filter(r => r.budgetPlanStatus === DRAFT_STATUS)
  const result = new Map<string, DraftEmployeeRowForSubmit>()

  for (const employeeId of draftEmployeeIds) {
    const member = memberById.get(employeeId)
    if (!member) {
      continue
    }
    const planOuRowId = resolvePlanOrganizationalUnitRowIdForTeamMember(
      member,
      planOuRowIdByOrganizationalUnitId,
      managerOrganizationalUnitId
    )
    if (!planOuRowId) {
      continue
    }
    const matching = draftRows.filter(
      r => r.employeeId === employeeId && r.compensationBudgetPlanOrganizationalUnitId === planOuRowId
    )
    if (matching.length === 0) {
      continue
    }
    const preferredId = preferredRowIdByEmployeeId.get(employeeId)
    const preferredMatch = preferredId ? matching.find(r => r.id === preferredId) : undefined
    if (preferredMatch) {
      result.set(employeeId, { id: preferredMatch.id, version: preferredMatch.version })
      continue
    }
    const sorted = [...matching].sort((a, b) => a.id.localeCompare(b.id))
    const chosen = sorted[sorted.length - 1]
    if (chosen) {
      result.set(employeeId, { id: chosen.id, version: chosen.version })
    }
  }

  return result
}
