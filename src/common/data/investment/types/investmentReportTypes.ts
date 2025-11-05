/**
 * Investment Report Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'

/**
 * InvestmentReport
 * Report entity for IRM
 */
export interface InvestmentReport extends BaseEntity {
  id: string
  // Add specific fields as needed from GraphQL schema
  reportType?: string
  reportDate?: string
  content?: any

  // Entity references
  investment?: any // Investment
  investmentId?: string
}
