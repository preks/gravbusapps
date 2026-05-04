/**
 * Employee position shape from orgchart (GraphQL EmployeePosition with costCenter).
 */
export type EmployeePositionCostCenterRef = {
  costCenter?: { id?: string | null; name?: string | null } | null
}

/**
 * True when at least one active org position includes a resolved cost center (id or name).
 * Used to gate expense request/plan submit when HR must fix orgchart data.
 */
export function hasEmployeeOrgchartCostCenter(positions: EmployeePositionCostCenterRef[] | null | undefined): boolean {
  if (!positions || positions.length === 0) {
    return false
  }

  return positions.some(position => {
    const cc = position?.costCenter
    if (!cc) {
      return false
    }
    const id = cc.id
    const name = cc.name
    const hasId = typeof id === 'string' && id.length > 0
    const hasName = typeof name === 'string' && name.trim().length > 0
    return hasId || hasName
  })
}
