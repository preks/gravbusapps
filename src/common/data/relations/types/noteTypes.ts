import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface Note extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  authorEmployee?: Employee // IRM | CRM
  authorEmployeeId?: string // IRM | CRM
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  documents?: any[] // IRM | CRM
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

/**
 * Note Query Field Mapping
 */
export const NoteFields = {
  account: 'account',
  accountId: 'accountId',
  authorEmployee: 'authorEmployee',
  authorEmployeeId: 'authorEmployeeId',
  contact: 'contact',
  contactId: 'contactId',
  documents: 'documents',
  id: 'id',
  lead: 'lead',
  leadId: 'leadId',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  reminderDate: 'reminderDate',
  source: 'source',
  text: 'text',
  title: 'title'
} as const

export const NoteFormFields = {
  accountId: 'account',
  authorEmployeeId: 'authorEmployee',
  contactId: 'contact',
  documents: 'documents',
  id: 'id',
  leadId: 'lead',
  lastEditDate: 'lastEditDate',
  opportunityId: 'opportunity',
  reminderDate: 'reminderDate',
  text: 'text',
  title: 'title',
  version: 'version'
} as const

/**
 * Create Common Note Descriptors with fields mapping
 */
export const createNoteDescriptors = (fields: Record<keyof typeof NoteFields, string> = NoteFields): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'account',
    searchPaths: [`${fields.account}.name`, `${fields.account}.code`],
    sortPath: `${fields.account}.name`,
    type: 'text'
  },
  {
    key: 'authorEmployee',
    searchPaths: [
      `${fields.authorEmployee}.displayName`,
      `${fields.authorEmployee}.firstName`,
      `${fields.authorEmployee}.lastName`
    ],
    sortPath: `${fields.authorEmployee}.displayName`,
    type: 'text'
  },
  {
    key: 'contact',
    searchPaths: [`${fields.contact}.firstName`, `${fields.contact}.lastName`],
    sortPath: `${fields.contact}.lastName`,
    type: 'text'
  },
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
  {
    key: 'opportunity',
    searchPaths: [`${fields.opportunity}.name`, `${fields.opportunity}.description`],
    sortPath: `${fields.opportunity}.name`,
    type: 'text'
  },
  { key: 'reminderDate', searchPaths: [fields.reminderDate], sortPath: fields.reminderDate, type: 'date' },
  { key: 'source', searchPaths: [fields.source], sortPath: fields.source, type: 'text' },
  { key: 'text', searchPaths: [fields.text], sortPath: fields.text, type: 'text' },
  { key: 'title', searchPaths: [fields.title], sortPath: fields.title, type: 'text' },

  // Filter IDs
  { key: 'accountIds', path: fields.accountId, kind: 'inIds' },
  { key: 'authorEmployeeIds', path: fields.authorEmployeeId, kind: 'inIds' },
  { key: 'contactIds', path: fields.contactId, kind: 'inIds' },
  { key: 'leadIds', path: fields.leadId, kind: 'inIds' },
  { key: 'opportunityIds', path: fields.opportunityId, kind: 'inIds' },

  // Date range filters
  { key: 'reminderDateFrom', path: fields.reminderDate, kind: 'dateFrom' },
  { key: 'reminderDateTo', path: fields.reminderDate, kind: 'dateTo' }
]
