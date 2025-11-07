import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CommonContact } from './commonContactTypes'
import type { CommonLead } from './commonLeadTypes'
import type { CommonOpportunity } from './commonOpportunityTypes'

export interface CommonActivity extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activityType?: CatalogEntry // IRM | CRM
  activityTypeRef?: string // IRM | CRM
  completedAt?: string // IRM | CRM
  contact?: CommonContact // IRM | CRM
  contactId?: string // IRM | CRM
  description?: string // IRM | CRM
  documents?: any[] // IRM | CRM
  id: string // IRM | CRM
  lead?: CommonLead // IRM | CRM
  leadId?: string // IRM | CRM
  occurredAt?: string // IRM | CRM
  opportunity?: CommonOpportunity // IRM | CRM
  opportunityId?: string // IRM | CRM
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  source?: string // IRM | CRM
  title?: string // IRM | CRM
}

export const COMMON_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  { key: 'accountId', sortPath: 'accountId', type: 'text' },
  {
    key: 'activityType',
    searchPaths: ['activityType.value', 'activityType.code'],
    sortPath: 'activityType.value',
    type: 'text'
  },
  { key: 'activityTypeRef', sortPath: 'activityTypeRef', type: 'text' },
  { key: 'completedAt', searchPaths: ['completedAt'], sortPath: 'completedAt', type: 'date' },
  {
    key: 'contact',
    searchPaths: ['contact.firstName', 'contact.lastName'],
    sortPath: 'contact.lastName',
    type: 'text'
  },
  { key: 'contactId', sortPath: 'contactId', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'lead',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    sortPath: 'lead.lastName',
    type: 'text'
  },
  { key: 'leadId', sortPath: 'leadId', type: 'text' },
  { key: 'occurredAt', searchPaths: ['occurredAt'], sortPath: 'occurredAt', type: 'date' },
  {
    key: 'opportunity',
    searchPaths: ['opportunity.name', 'opportunity.description'],
    sortPath: 'opportunity.name',
    type: 'text'
  },
  { key: 'opportunityId', sortPath: 'opportunityId', type: 'text' },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'ownerEmployeeId', sortPath: 'ownerEmployeeId', type: 'text' },
  { key: 'source', searchPaths: ['source'], sortPath: 'source', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'activityTypeIds', path: 'activityTypeRef', kind: 'inIds' },
  { key: 'contactIds', path: 'contactId', kind: 'inIds' },
  { key: 'leadIds', path: 'leadId', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunityId', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },

  // Date range filters
  { key: 'completedAtAfter', path: 'completedAt', kind: 'dateFrom' },
  { key: 'completedAtBefore', path: 'completedAt', kind: 'dateTo' },
  { key: 'occurredAtAfter', path: 'occurredAt', kind: 'dateFrom' },
  { key: 'occurredAtBefore', path: 'occurredAt', kind: 'dateTo' }
]
