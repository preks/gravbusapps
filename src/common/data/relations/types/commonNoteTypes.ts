import type { BaseEntity } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface CommonNote extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  authorEmployee?: Employee // IRM | CRM
  authorEmployeeId?: string // IRM | CRM
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  documents?: any[] // IRM | TODO
  id: string // IRM | CRM
  lead?: any // IRM | CRM
  leadId?: string // IRM | CRM
  opportunity?: any // IRM | CRM
  opportunityId?: string // IRM | CRM
  reminderDate?: string // IRM | CRM
  source?: string // IRM | CRM
  text?: string // IRM | TODO
  title?: string // IRM | TODO
}

export const COMMON_NOTE_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  { key: 'accountId', searchPaths: ['accountId'], sortPath: 'accountId', type: 'text' },
  {
    key: 'authorEmployee',
    searchPaths: ['authorEmployee.displayName', 'authorEmployee.firstName', 'authorEmployee.lastName'],
    sortPath: 'authorEmployee.displayName',
    type: 'text'
  },
  { key: 'authorEmployeeId', searchPaths: ['authorEmployeeId'], sortPath: 'authorEmployeeId', type: 'text' },
  {
    key: 'contact',
    searchPaths: ['contact.firstName', 'contact.lastName'],
    sortPath: 'contact.lastName',
    type: 'text'
  },
  { key: 'contactId', searchPaths: ['contactId'], sortPath: 'contactId', type: 'text' },
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
  { key: 'leadId', searchPaths: ['leadId'], sortPath: 'leadId', type: 'text' },
  {
    key: 'opportunity',
    searchPaths: ['opportunity.name', 'opportunity.description'],
    sortPath: 'opportunity.name',
    type: 'text'
  },
  { key: 'opportunityId', searchPaths: ['opportunityId'], sortPath: 'opportunityId', type: 'text' },
  { key: 'reminderDate', searchPaths: ['reminderDate'], sortPath: 'reminderDate', type: 'date' },
  { key: 'source', searchPaths: ['source'], sortPath: 'source', type: 'text' },
  { key: 'text', searchPaths: ['text'], sortPath: 'text', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'authorEmployeeIds', path: 'authorEmployeeId', kind: 'inIds' },
  { key: 'contactIds', path: 'contactId', kind: 'inIds' },
  { key: 'leadIds', path: 'leadId', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunityId', kind: 'inIds' },

  // Date range filters
  { key: 'reminderDateAfter', path: 'reminderDate', kind: 'dateFrom' },
  { key: 'reminderDateBefore', path: 'reminderDate', kind: 'dateTo' }
]
