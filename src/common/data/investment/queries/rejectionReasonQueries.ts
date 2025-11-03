/**
 * GraphQL queries for Investment Rejection Reasons
 * Used to fetch rejection reasons for leads and opportunities
 * Note: Create/Update/Delete operations are handled via the rejectInvestmentProspect backend process
 */

import { CATALOG_ENTRY, AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'

/**
 * Get all rejection reasons for a specific lead
 * Uses parameterized query to prevent GraphQL injection
 * @returns GraphQL query string with variables
 */
export const GET_REJECTION_REASONS_BY_LEAD = (): string => `
  query GetRejectionReasonsByLead($leadId: uuid!) {
    InvestmentRejectionReason(
      where: {
        leadId: { _eq: $leadId }
        isDeleted: { _eq: false }
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      businessKey
      recordState
      source
      description
      rejectionReasonRef
      rejectionReason {
        ${CATALOG_ENTRY}
      }
      leadId
      ${AUDIT_FIELDS}
    }
  }
`

/**
 * Get all rejection reasons for a specific opportunity
 * Uses parameterized query to prevent GraphQL injection
 * @returns GraphQL query string with variables
 */
export const GET_REJECTION_REASONS_BY_OPPORTUNITY = (): string => `
  query GetRejectionReasonsByOpportunity($opportunityId: uuid!) {
    InvestmentRejectionReason(
      where: {
        opportunityId: { _eq: $opportunityId }
        isDeleted: { _eq: false }
      }
      orderBy: { createdAt: DESC }
    ) {
      id
      version
      businessKey
      recordState
      source
      description
      rejectionReasonRef
      rejectionReason {
        ${CATALOG_ENTRY}
      }
      opportunityId
      ${AUDIT_FIELDS}
    }
  }
`
