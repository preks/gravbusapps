/**
 * Picks the employee position that matches the active org/structure (org chart context).
 * Falls back to the first position when there is no structure match or no active structure id.
 */
export type EmployeePositionLike = {
  structureId?: string | null
  costCenterId?: string | null
}

export function resolvePrimaryEmployeePosition(
  positions: EmployeePositionLike[],
  activeStructureId: string | null
): EmployeePositionLike | null {
  if (positions.length === 0) {
    return null
  }

  if (activeStructureId != null) {
    const match = positions.find(p => p.structureId === activeStructureId)
    if (match) {
      return match
    }
  }

  return positions[0]
}
