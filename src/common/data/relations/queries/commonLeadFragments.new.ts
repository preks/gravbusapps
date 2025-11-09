/**
 * Common Lead Fragments (New)
 *
 * Builds Lead fragments using LeadFields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { LeadFields } from '../types/commonLeadTypes'

/**
 * Build Lead fragment using fields mapping (REF fields only, no relations)
 */
export const buildLeadFragment = (fields: Record<keyof typeof LeadFields, string> = LeadFields): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.academicTitle} {
    ${CATALOG_ENTRY}
  }
  ${fields.academicTitleRef}
  ${fields.addressLine}
  ${fields.code}
  ${fields.companyEmail}
  ${fields.companyName}
  ${fields.companyPhone}
  ${fields.companyWebsite}
  ${fields.conversionDate}
  ${fields.country} {
    ${CATALOG_ENTRY}
  }
  ${fields.countryRef}
  ${fields.description}
  ${fields.email}
  ${fields.firstName}
  ${fields.id}
  ${fields.industryClass} {
    ${CATALOG_ENTRY}
  }
  ${fields.industryClassRef}
  ${fields.lastName}
  ${fields.leadRating} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadRatingRef}
  ${fields.leadSource} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadSourceRef}
  ${fields.leadStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.leadStatusRef}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.phoneNumber}
  ${fields.position}
  ${fields.postalCode}
  ${fields.region} {
    ${CATALOG_ENTRY}
  }
  ${fields.regionRef}
  ${fields.salutation} { ${CATALOG_ENTRY} }
  ${fields.salutationRef}
  ${fields.sensitive}
  ${fields.sourceCompanyName}
  ${fields.sourceIndividualName}
`
}

/**
 * Default Common Lead Fields fragment (no relations)
 */
export const COMMON_LEAD_FIELDS_NEW = buildLeadFragment(LeadFields)
