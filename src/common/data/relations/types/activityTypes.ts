import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Contact } from './contactTypes'
import type { Lead } from './leadTypes'
import type { Opportunity } from './opportunityTypes'

export interface ActivityReference {
  type: 'account' | 'contact' | 'lead' | 'opportunity' | 'investment'
  id: string
  name: string
}

export interface Activity extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activityType?: CatalogEntry // IRM | CRM
  activityTypeRef?: string // IRM | CRM
  completedAt?: string // IRM | CRM
  contact?: Contact // IRM | CRM
  contactId?: string // IRM | CRM
  description?: string // IRM | CRM
  documents?: any[] // IRM | CRM
  id: string // IRM | CRM
  lead?: Lead // IRM | CRM
  leadId?: string // IRM | CRM
  occurredAt?: string // IRM | CRM
  opportunity?: Opportunity // IRM | CRM
  opportunityId?: string // IRM | CRM
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  source?: string // IRM | CRM
  title?: string // IRM | CRM
}

export const ActivityFields = {
  account: 'account',
  accountId: 'accountId',
  activityType: 'activityType',
  activityTypeRef: 'activityTypeRef',
  completedAt: 'completedAt',
  contact: 'contact',
  contactId: 'contactId',
  description: 'description',
  documents: 'documents',
  id: 'id',
  lead: 'lead',
  leadId: 'leadId',
  occurredAt: 'occurredAt',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  ownerEmployee: 'ownerEmployee',
  ownerEmployeeId: 'ownerEmployeeId',
  source: 'source',
  title: 'title'
} as const

export const ActivityFormFields = {
  ...ActivityFields,
  accountId: 'account',
  activityTypeRef: 'activityTypeRef',
  completedAt: 'completedAt',
  contactId: 'contact',
  description: 'description',
  documents: 'documents',
  id: 'id',
  leadId: 'lead',
  occuredAt: 'occuredAt',
  opportunityId: 'opportunity',
  ownerEmployeeId: 'ownerEmployee',
  source: 'source',
  title: 'title',
  version: 'version'
} as const

/**
 * Create Common Activity Descriptors with fields mapping
 */
export const createActivityDescriptors = (
  fields: Record<keyof typeof ActivityFields, string> = ActivityFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'account',
    searchPaths: [`${fields.account}.name`, `${fields.account}.code`],
    sortPath: `${fields.account}.name`,
    type: 'text'
  },
  {
    key: 'activityType',
    searchPaths: [`${fields.activityType}.value`, `${fields.activityType}.code`],
    sortPath: `${fields.activityType}.value`,
    type: 'text'
  },
  { key: 'completedAt', searchPaths: [fields.completedAt], sortPath: fields.completedAt, type: 'date' },
  {
    key: 'contact',
    searchPaths: [`${fields.contact}.firstName`, `${fields.contact}.lastName`],
    sortPath: `${fields.contact}.lastName`,
    type: 'text'
  },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  {
    key: 'lead',
    searchPaths: [`${fields.lead}.firstName`, `${fields.lead}.lastName`, `${fields.lead}.companyName`],
    sortPath: `${fields.lead}.lastName`,
    type: 'text'
  },
  { key: 'occurredAt', searchPaths: [fields.occurredAt], sortPath: fields.occurredAt, type: 'date' },
  {
    key: 'opportunity',
    searchPaths: [`${fields.opportunity}.name`, `${fields.opportunity}.description`],
    sortPath: `${fields.opportunity}.name`,
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: [
      `${fields.ownerEmployee}.displayName`,
      `${fields.ownerEmployee}.firstName`,
      `${fields.ownerEmployee}.lastName`
    ],
    sortPath: `${fields.ownerEmployee}.displayName`,
    type: 'text'
  },
  { key: 'source', searchPaths: [fields.source], sortPath: fields.source, type: 'text' },
  { key: 'title', searchPaths: [fields.title], sortPath: fields.title, type: 'text' },

  // Filter IDs
  { key: 'accountIds', path: fields.accountId, kind: 'inIds' },
  {
    key: 'activityTypeIds',
    path: fields.activityTypeRef,
    filterLabel: 'Activity Type',
    optionSelectPaths: [`${fields.activityType}.id`, `${fields.activityType}.value`],
    optionSearchPaths: [`${fields.activityType}.value`, `${fields.activityType}.code`],
    optionDistinctOn: [fields.activityTypeRef],
    kind: 'inIds'
  },
  { key: 'contactIds', path: fields.contactId, kind: 'inIds' },
  { key: 'leadIds', path: fields.leadId, kind: 'inIds' },
  { key: 'opportunityIds', path: fields.opportunityId, kind: 'inIds' },
  {
    key: 'ownerEmployeeIds',
    path: fields.ownerEmployeeId,
    filterLabel: 'Owner',
    optionSelectPaths: [`${fields.ownerEmployee}.id`, `${fields.ownerEmployee}.displayName`],
    optionSearchPaths: [
      `${fields.ownerEmployee}.displayName`,
      `${fields.ownerEmployee}.firstName`,
      `${fields.ownerEmployee}.lastName`
    ],
    optionDistinctOn: [fields.ownerEmployeeId],
    kind: 'inIds'
  },

  // Date range filters
  { key: 'completedAtFrom', path: fields.completedAt, kind: 'dateFrom' },
  { key: 'completedAtTo', path: fields.completedAt, kind: 'dateTo' },
  { key: 'occurredAtFrom', path: fields.occurredAt, kind: 'dateFrom' },
  { key: 'occurredAtTo', path: fields.occurredAt, kind: 'dateTo' }
]
