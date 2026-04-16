import { resolvePrimaryEmployeePosition, type EmployeePositionLike } from './resolvePrimaryEmployeePosition'

export type CostCenterOption = { id: string; name: string }

/**
 * Ordered cost center ids to try for preselection: primary org position first, else first-seen per position row.
 */
export function buildEmployeeCostCenterCandidateIds(
  positions: EmployeePositionLike[],
  primaryPosition: EmployeePositionLike | null
): string[] {
  const primaryId = primaryPosition?.costCenterId ? String(primaryPosition.costCenterId) : ''
  if (primaryId !== '') {
    return [primaryId]
  }

  const seen = new Set<string>()
  const ordered: string[] = []
  for (const p of positions) {
    const id = p.costCenterId ? String(p.costCenterId) : ''
    if (id && !seen.has(id)) {
      seen.add(id)
      ordered.push(id)
    }
  }
  return ordered
}

/**
 * Single source of truth for org-chart-aligned position, structure id, and cost center candidates
 * (shared by ExpensePlanProvider and ExpenseRequestProvider).
 */
export function getExpenseCatalogueCostCenterState(
  positions: EmployeePositionLike[],
  activeStructureId: string | null
): { structureId: string | null; candidateIds: string[] } {
  const primaryPosition = resolvePrimaryEmployeePosition(positions, activeStructureId)
  const structureId = primaryPosition?.structureId ?? positions[0]?.structureId ?? activeStructureId ?? null
  const candidateIds = buildEmployeeCostCenterCandidateIds(positions, primaryPosition)
  return { structureId, candidateIds }
}

/**
 * Default selection: first candidate that exists in the structure list, else first option in the full list.
 */
export function resolvePreferredCostCenterId(
  availableCostCenters: Array<{ id: string }>,
  candidateIds: string[]
): string {
  const inStructure = new Set(availableCostCenters.map(cc => cc.id))
  const match = candidateIds.find(id => inStructure.has(id))
  return match ?? availableCostCenters[0]?.id ?? ''
}

export function mapGraphqlCostCentersToOptions(
  userCostCenters: Array<{ id: string; name: string }>
): CostCenterOption[] {
  return userCostCenters.map(cc => ({ id: cc.id, name: cc.name }))
}

export function mapGraphqlProjectsToOptions(
  userProjects: Array<{ id: string; name: string }>
): Array<{ id: string; name: string }> {
  return userProjects.map(p => ({ id: p.id, name: p.name }))
}
