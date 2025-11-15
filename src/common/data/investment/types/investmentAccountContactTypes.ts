/**
 * Investment Account Contact Types
 */

import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import type { ContactType } from './investmentEnums'

/**
 * InvestmentAccountContact
 * Join table entity for Account-Contact relationship
 */
export interface InvestmentAccountContact extends BaseEntity {
  id: string
  contactType?: ContactType

  // Entity references
  account?: any // InvestmentAccount
  accountId?: string
  contact?: any // InvestmentContact
  contactId?: string
}
