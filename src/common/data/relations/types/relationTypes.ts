import type { BaseEntity } from '@/common/network/graphql/commonTypes'

export interface CommonAccountContact extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  contactType?: string // IRM | CRM
  id?: string // IRM | CRM
}

export interface CommonOpportunityContact extends BaseEntity {
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  contactType?: string // IRM | CRM
  id?: string // IRM | CRM
  opportunity?: any // IRM | CRM
  opportunityId?: string // IRM | CRM
}
