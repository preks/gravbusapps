/**
 * Common Account Fragments (New)
 *
 * Builds Account fragments using AccountFields mapping
 * Supports different field names per domain (IRM vs CRM)
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { AccountFields } from '../types/commonAccountTypes'

/**
 * Build Account fragment using fields mapping (REF fields only, no relations)
 * @param fields - AccountFields mapping (default: AccountFields)
 * @returns GraphQL fragment string with all account fields (no relations)
 */
export const buildAccountFragment = (fields: Record<keyof typeof AccountFields, string> = AccountFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.accountAnnualRevenueBand} {
    ${CATALOG_ENTRY}
  }
  ${fields.accountAnnualRevenueBandRef}
  ${fields.code}
  ${fields.companySize} {
    ${CATALOG_ENTRY}
  }
  ${fields.companySizeRef}
  ${fields.foundationDate}
  ${fields.id}
  ${fields.industryClass} {
    ${CATALOG_ENTRY}
  }
  ${fields.industryClassRef}
  ${fields.legalForm} {
    ${CATALOG_ENTRY}
  }
  ${fields.legalFormRef}
  ${fields.liquidationDate}
  ${fields.name}
  ${fields.notesSummary}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.picture}
  ${fields.pictureThumbnail}
  ${fields.timeZone} {
    ${CATALOG_ENTRY}
  }
  ${fields.timeZoneRef}
`
}

/**
 * Default Common Account Fields fragment (IRM field names, no relations)
 */
export const COMMON_ACCOUNT_FIELDS_NEW = buildAccountFragment(AccountFields)
