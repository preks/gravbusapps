import { AssignmentTarget, AssignmentMode } from './FlowTemplateClient'

// Define ANY_SELECTOR constant locally
const ANY_SELECTOR = 'ANY' as const

/**
 * Transform assignment target for flow processing based on assignment mode
 */
export function transformAssignmentTarget(target: Partial<AssignmentTarget>, mode: AssignmentMode): AssignmentTarget {
  const transformed: AssignmentTarget = {}

  // For CLAIM mode: convert undefined/empty arrays to [ANY_SELECTOR]
  // For ASSIGN mode: convert undefined arrays to []
  const defaultValue = mode === AssignmentMode.CLAIM ? [ANY_SELECTOR] : []

  transformed.users = target.users?.length ? target.users : defaultValue
  transformed.organizationalUnits = target.organizationalUnits?.length ? target.organizationalUnits : defaultValue
  transformed.matrixTeams = target.matrixTeams?.length ? target.matrixTeams : defaultValue
  transformed.companies = target.companies?.length ? target.companies : defaultValue
  transformed.siteLocations = target.siteLocations?.length ? target.siteLocations : defaultValue
  transformed.costCenters = target.costCenters?.length ? target.costCenters : defaultValue
  transformed.capabilities = target.capabilities?.length ? target.capabilities : defaultValue

  return transformed
}

/**
 * Validate assignment target for CLAIM mode
 */
export function validateClaimAssignment(target: AssignmentTarget): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // CLAIM mode validation rules:
  // 1. users are not accepted
  if (target.users && target.users.length > 0 && !target.users.includes(ANY_SELECTOR)) {
    errors.push('Direct user assignment is not allowed in CLAIM mode')
  }

  // 2. All other lists (except capabilities) should not have more than one value
  const singleValueFields = [
    { field: 'organizationalUnits', value: target.organizationalUnits },
    { field: 'matrixTeams', value: target.matrixTeams },
    { field: 'companies', value: target.companies },
    { field: 'siteLocations', value: target.siteLocations },
    { field: 'costCenters', value: target.costCenters }
  ]

  singleValueFields.forEach(({ field, value }) => {
    if (value && value.length > 1 && !value.every(v => v === ANY_SELECTOR)) {
      errors.push(`${field} can only have one value in CLAIM mode (multiple capabilities are allowed)`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Build query for claimable tasks
 */
export function buildClaimableTaskQuery(userAssignments: AssignmentTarget): object {
  const mustClauses: any[] = []

  // Build AND conditions for CLAIM filtering
  Object.entries(userAssignments).forEach(([field, values]) => {
    if (values && values.length > 0) {
      // Create terms query for each field
      mustClauses.push({
        terms: {
          [`input.assignment.${field}`]: values
        }
      })
    }
  })

  return {
    query: {
      bool: {
        must: mustClauses
      }
    }
  }
}

/**
 * Check if assignment target is empty (all fields undefined or empty)
 */
export function isEmptyAssignmentTarget(target: AssignmentTarget): boolean {
  return (
    !target.users?.length &&
    !target.organizationalUnits?.length &&
    !target.matrixTeams?.length &&
    !target.companies?.length &&
    !target.siteLocations?.length &&
    !target.costCenters?.length &&
    !target.capabilities?.length
  )
}
