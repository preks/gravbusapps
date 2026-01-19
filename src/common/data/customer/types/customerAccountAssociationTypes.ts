import type { BaseEntity } from '@/common/data/common/types/baseTypes'
import type { CustomerAccount } from './customerAccountTypes'
import type { CustomerOpportunity } from './customerOpportunityTypes'
import type { CatalogEntry } from '@/common/data/common/types/catalogTypes'

/**
 * Opportunity-Account Junction Table
 * Represents many-to-many relationship between CustomerOpportunity and CustomerAccount
 *
 * IMPORTANT: GraphQL table name is 'OpportunityAccount' (singular in queries)
 * This allows one opportunity to be associated with multiple accounts,
 * each with different account types (e.g., buyer, seller, partner)
 *
 * @example
 * // Query example
 * opportunityAccounts(where: { isDeleted: { _eq: false } }) {
 *   id
 *   opportunityId
 *   accountId
 *   accountTypeRef
 *   account { id, name }
 *   accountType { code, value }
 * }
 */
export interface CustomerOpportunityAccount extends BaseEntity {
  id: string
  version?: number
  opportunityId: string
  accountId: string
  accountTypeRef?: string

  // Relationships
  opportunity?: CustomerOpportunity
  account?: CustomerAccount
  accountType?: CatalogEntry
}
