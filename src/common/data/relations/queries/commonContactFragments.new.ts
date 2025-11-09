/**
 * Common Contact Fragments (New)
 *
 * Builds Contact fragments using ContactFields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { ContactFields } from '../types/commonContactTypes'

/**
 * Build Contact fragment using fields mapping (REF fields only, no relations)
 */
export const buildContactFragment = (fields: Record<keyof typeof ContactFields, string> = ContactFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.academicTitle} {
    ${CATALOG_ENTRY}
  }
  ${fields.academicTitleRef}
  ${fields.birthDate}
  ${fields.code}
  ${fields.department}
  ${fields.id}
  ${fields.firstName}
  ${fields.language} {
    ${CATALOG_ENTRY}
  }
  ${fields.languageRef}
  ${fields.lastName}
  ${fields.notesSummary}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.salutation} {
    ${CATALOG_ENTRY}
  }
  ${fields.salutationRef}
  ${fields.type}
`
}

/**
 * Default Common Contact Fields fragment (no relations)
 */
export const COMMON_CONTACT_FIELDS_NEW = buildContactFragment(ContactFields)
