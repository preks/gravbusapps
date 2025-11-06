/**
 * Common Account Fragments
 *
 * Contains ONLY fields marked with // IRM | CRM in commonAccountTypes.ts
 * These are fields that exist in BOTH schemas with IDENTICAL names.
 *
 * Excluded:
 * - any types (except Employee, CatalogEntry)
 * - Fields with Id suffix (except id and ownerEmployeeId)
 * - Fields with different names between schemas (handled in domain-specific fragments)
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'

/**
 * COMMON_ACCOUNT_FIELDS
 *
 * Fields marked with // IRM | CRM in commonAccountTypes.ts:
 * - addresses (any[] - excluded)
 * - code
 * - communicationChannels (CommunicationChannel[] - excluded)
 * - documents (any[] - excluded)
 * - foundationDate
 * - legalForm + legalFormRef
 * - liquidationDate
 * - name
 * - notes (any[] - excluded)
 * - notesSummary
 * - ownerEmployee + ownerEmployeeId
 * - tasks (any[] - excluded)
 * - timeZone + timeZoneRef
 */
export const COMMON_ACCOUNT_FIELDS = `
  ${AUDIT_FIELDS}
  code
  foundationDate
  id
  legalForm {
    ${CATALOG_ENTRY}
  }
  legalFormRef
  liquidationDate
  name
  notesSummary
  ownerEmployee {
    ${EMPLOYEE_REF}
  }
  ownerEmployeeId
  timeZone {
    ${CATALOG_ENTRY}
  }
  timeZoneRef
`
