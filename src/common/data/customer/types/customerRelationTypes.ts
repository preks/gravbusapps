import type { CommonAccountContact, CommonOpportunityContact } from '@/common/data/relations/types/relationTypes'
import type { ContactType } from './customerEnums'
import type { CustomerAccount, CustomerContact, CustomerOpportunity } from './'

export interface CustomerAccountContact extends CommonAccountContact {
  account?: CustomerAccount // CustomerAccount
  contact?: CustomerContact // CustomerContact
  contactType?: ContactType
}

export interface CustomerOpportunityContact extends CommonOpportunityContact {
  contact?: CustomerContact // CustomerContact
  contactType?: ContactType
  opportunity?: CustomerOpportunity // CustomerOpportunity
}
