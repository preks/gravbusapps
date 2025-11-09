/**
 * Common Opportunity Fragments (New)
 *
 * Builds Opportunity fragments using OpportunityFields mapping
 */

import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { EMPLOYEE_REF } from '@/common/data/employee/queries/fragments/employeeFragments'
import { OpportunityFields } from '../types/commonOpportunityTypes'

/**
 * Build Opportunity fragment using fields mapping (REF fields only, no relations)
 */
export const buildOpportunityFragment = (
  fields: Record<keyof typeof OpportunityFields, string> = OpportunityFields
): string => {
  return `
  ${AUDIT_FIELDS}
  ${fields.closeDate}
  ${fields.code}
  ${fields.currency} {
    ${CATALOG_ENTRY}
  }
  ${fields.currencyRef}
  ${fields.id}
  ${fields.estimatedAmount}
  ${fields.name}
  ${fields.notesSummary}
  ${fields.opportunityStatus} {
    ${CATALOG_ENTRY}
  }
  ${fields.opportunityStatusRef}
  ${fields.ownerEmployee} {
    ${EMPLOYEE_REF}
  }
  ${fields.ownerEmployeeId}
  ${fields.winningChance}
`
}

/**
 * Default Common Opportunity Fields fragment (no relations)
 */
export const COMMON_OPPORTUNITY_FIELDS_NEW = buildOpportunityFragment(OpportunityFields)
