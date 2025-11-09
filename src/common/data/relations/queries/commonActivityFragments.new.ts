/**
 * Common Activity Fragments (New)
 *
 * Builds Activity fragments using ActivityFields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { ActivityFields } from '../types/commonActivityTypes'

/**
 * Build Activity fragment using fields mapping (REF fields only, no relations)
 */
export const buildActivityFragment = (fields: Record<keyof typeof ActivityFields, string> = ActivityFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.activityType} {
    ${CATALOG_ENTRY}
  }
  ${fields.activityTypeRef}
  ${fields.completedAt}
  ${fields.description}
  ${fields.id}
  ${fields.occurredAt}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.source}
  ${fields.title}
`
}

/**
 * Default Common Activity Fields fragment (no relations)
 */
export const COMMON_ACTIVITY_FIELDS_NEW = buildActivityFragment(ActivityFields)
