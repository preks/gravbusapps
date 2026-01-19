import { AssignmentTarget, AssignmentMode } from '../types/flowTemplate'

// Define ANY_SELECTOR constant locally
const ANY_SELECTOR = 'ANY' as const

/**
 * Transform assignment target for UI display and processing
 */
export function transformAssignmentTargetForUI(
  target: Partial<AssignmentTarget>,
  mode: AssignmentMode
): AssignmentTarget {
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
 * Validate assignment target for CLAIM mode in UI
 */
export function validateClaimAssignmentForUI(target: AssignmentTarget): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // CLAIM mode validation rules:
  // 1. users are not accepted (unless it's just ANY_SELECTOR)
  if (target.users && target.users.length > 0 && !target.users.every(id => id === ANY_SELECTOR)) {
    errors.push('Direct user assignment is not allowed in CLAIM mode')
  }

  // 2. All other lists (except capabilities) should not have more than one value
  const singleValueFields = [
    { field: 'organizationalUnits', value: target.organizationalUnits, label: 'Organizational Units' },
    { field: 'matrixTeams', value: target.matrixTeams, label: 'Matrix Teams' },
    { field: 'companies', value: target.companies, label: 'Companies' },
    { field: 'siteLocations', value: target.siteLocations, label: 'Site Locations' },
    { field: 'costCenters', value: target.costCenters, label: 'Cost Centers' }
  ]

  singleValueFields.forEach(({ field, value, label }) => {
    if (value && value.length > 1 && !value.every(v => v === ANY_SELECTOR)) {
      errors.push(`${label} can only have one value in CLAIM mode (multiple capabilities are allowed)`)
    }
  })

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get display label for assignment target field
 */
export function getAssignmentFieldLabel(field: keyof AssignmentTarget): string {
  const labels: Record<keyof AssignmentTarget, string> = {
    users: 'Users',
    organizationalUnits: 'Organizational Units',
    matrixTeams: 'Matrix Teams',
    companies: 'Companies',
    siteLocations: 'Site Locations',
    costCenters: 'Cost Centers',
    capabilities: 'Capabilities'
  }

  return labels[field]
}

/**
 * Check if assignment target is effectively empty (only contains ANY_SELECTOR or empty arrays)
 */
export function isEmptyAssignmentTargetForUI(target: AssignmentTarget): boolean {
  const hasOnlyAnySelectorOrEmpty = (values?: string[]) =>
    !values || values.length === 0 || values.every(v => v === ANY_SELECTOR)

  return (
    hasOnlyAnySelectorOrEmpty(target.users) &&
    hasOnlyAnySelectorOrEmpty(target.organizationalUnits) &&
    hasOnlyAnySelectorOrEmpty(target.matrixTeams) &&
    hasOnlyAnySelectorOrEmpty(target.companies) &&
    hasOnlyAnySelectorOrEmpty(target.siteLocations) &&
    hasOnlyAnySelectorOrEmpty(target.costCenters) &&
    hasOnlyAnySelectorOrEmpty(target.capabilities)
  )
}

/**
 * Create a default assignment target based on mode
 */
export function createDefaultAssignmentTarget(mode: AssignmentMode): AssignmentTarget {
  const defaultValue = mode === AssignmentMode.CLAIM ? [ANY_SELECTOR] : []

  return {
    users: defaultValue,
    organizationalUnits: defaultValue,
    matrixTeams: defaultValue,
    companies: defaultValue,
    siteLocations: defaultValue,
    costCenters: defaultValue,
    capabilities: defaultValue
  }
}

/**
 * Clean assignment target by removing empty arrays and ANY_SELECTOR where appropriate
 */
export function cleanAssignmentTarget(target: AssignmentTarget): AssignmentTarget {
  const cleaned: AssignmentTarget = {}

  Object.entries(target).forEach(([key, values]) => {
    const fieldKey = key as keyof AssignmentTarget
    if (values && values.length > 0) {
      // Remove ANY_SELECTOR if there are other actual values
      const filtered = values.filter((v: string) => v !== ANY_SELECTOR || values.length === 1)
      if (filtered.length > 0) {
        cleaned[fieldKey] = filtered
      }
    }
  })

  return cleaned
}
