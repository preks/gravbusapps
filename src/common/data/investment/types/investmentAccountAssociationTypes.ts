import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Investment } from './investmentTypes.new'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import type { InvestmentAccount } from './investmentAccountTypes'

/**
 * Investment-Account Junction Table
 * Represents many-to-many relationship between Investment and InvestmentAccount
 *
 * IMPORTANT: GraphQL table name is 'InvestmentInvestmentAccount' (singular in queries)
 * But TypeScript uses plural 'investmentInvestmentAccounts' for arrays
 */
export interface InvestmentInvestmentAccount extends BaseEntity {
  id: string
  investmentId: string
  investmentAccountId: string
  investmentAccountTypeRef?: string

  // Relationships
  investment?: Investment
  investmentAccount?: InvestmentAccount
  investmentAccountType?: CatalogEntry
}

/**
 * Opportunity-Account Junction Table
 * Represents many-to-many relationship between InvestmentOpportunity and InvestmentAccount
 *
 * IMPORTANT: GraphQL table name is 'InvestmentOpportunityAccount' (singular in queries)
 * But TypeScript uses plural 'investmentOpportunityAccounts' for arrays
 */
export interface InvestmentOpportunityAccount extends BaseEntity {
  id: string
  opportunityId: string
  accountId: string
  accountTypeRef?: string

  // Relationships
  opportunity?: InvestmentOpportunity
  account?: InvestmentAccount
  accountType?: CatalogEntry
}

/**
 * Field mapping for InvestmentInvestmentAccount
 */
export const InvestmentInvestmentAccountFields = {
  id: 'id',
  investmentId: 'investmentId',
  investmentAccountId: 'investmentAccountId',
  investmentAccountTypeRef: 'investmentAccountTypeRef',
  investment: 'investment',
  investmentAccount: 'investmentAccount',
  investmentAccountType: 'investmentAccountType'
} as const

/**
 * Field mapping for InvestmentOpportunityAccount
 */
export const InvestmentOpportunityAccountFields = {
  id: 'id',
  opportunityId: 'opportunityId',
  accountId: 'accountId',
  accountTypeRef: 'accountTypeRef',
  opportunity: 'opportunity',
  account: 'account',
  accountType: 'accountType'
} as const
