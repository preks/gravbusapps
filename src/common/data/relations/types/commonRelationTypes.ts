import type { BaseEntity } from '@/common/network/graphql/commonTypes'

export interface CommonAccountContact extends BaseEntity {
  id: string
  contactType?: string
  accountId: string
  contactId: string

  // Relations - forward declarations to avoid circular imports
  // Will be replaced by BaseCustomerAccountContact / BaseInvestmentAccountContact
  account?: any // CommonAccount
  contact?: any // CommonContact
}
