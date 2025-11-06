import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface CommonDocument extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activity?: any // IRM | TODO
  activityId?: string // IRM | TODO
  authenticated?: boolean // IRM | CRM
  authenticationDate?: string // IRM | CRM
  childDocuments?: any[] // TODO | TODO
  contact?: any // IRM | CRM
  contactId?: string // IRM | CRM
  description?: string // IRM | CRM
  documentGroup?: CatalogEntry // IRM | CRM
  documentGroupRef?: string // IRM | CRM
  documentType?: CatalogEntry // IRM | CRM
  documentTypeRef?: string // IRM | CRM
  expirationDate?: string // IRM | CRM
  file?: string // TODO deprecated
  fileInfo?: any // IRM | CRM
  fileSize?: number // TODO deprecated
  id: string // IRM | CRM
  lead?: any // IRM | CRM
  leadId?: string // IRM | CRM
  mandatory?: boolean // IRM | CRM
  mimeType?: string // TODO deprecated
  name?: string // IRM | CRM
  note?: any // IRM | CRM
  noteId?: string // IRM | CRM
  opportunity?: any // IRM | CRM
  opportunityId?: string // IRM | CRM
  parentDocument?: any // IRM | CRM
  parentDocumentId?: string // IRM | CRM
  source?: string // IRM | CRM
  task?: any // IRM | TODO
  taskId?: string // IRM | TODO
  verificationDate?: string // IRM | CRM
  verified?: boolean // IRM | CRM
}

export const COMMON_DOCUMENT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  { key: 'account', searchPaths: ['account.name', 'account.code'], sortPath: 'account.name', type: 'text' },
  { key: 'accountId', searchPaths: ['accountId'], sortPath: 'accountId', type: 'text' },
  {
    key: 'activity',
    searchPaths: ['activity.title', 'activity.description'],
    sortPath: 'activity.title',
    type: 'text'
  },
  { key: 'activityId', searchPaths: ['activityId'], sortPath: 'activityId', type: 'text' },
  { key: 'authenticated', searchPaths: ['authenticated'], sortPath: 'authenticated', type: 'boolean' },
  { key: 'authenticationDate', searchPaths: ['authenticationDate'], sortPath: 'authenticationDate', type: 'date' },
  { key: 'childDocuments', searchPaths: ['childDocuments.name'], sortPath: 'childDocuments.name', type: 'text' },
  {
    key: 'contact',
    searchPaths: ['contact.firstName', 'contact.lastName'],
    sortPath: 'contact.lastName',
    type: 'text'
  },
  { key: 'contactId', searchPaths: ['contactId'], sortPath: 'contactId', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  {
    key: 'documentGroup',
    searchPaths: ['documentGroup.value', 'documentGroup.code'],
    sortPath: 'documentGroup.value',
    type: 'text'
  },
  { key: 'documentGroupRef', searchPaths: ['documentGroupRef'], sortPath: 'documentGroupRef', type: 'text' },
  {
    key: 'documentType',
    searchPaths: ['documentType.value', 'documentType.code'],
    sortPath: 'documentType.value',
    type: 'text'
  },
  { key: 'documentTypeRef', searchPaths: ['documentTypeRef'], sortPath: 'documentTypeRef', type: 'text' },
  { key: 'expirationDate', searchPaths: ['expirationDate'], sortPath: 'expirationDate', type: 'date' },
  { key: 'file', searchPaths: ['file'], sortPath: 'file', type: 'text' },
  { key: 'fileInfo', searchPaths: ['fileInfo'], sortPath: 'fileInfo', type: 'text' },
  { key: 'fileSize', searchPaths: ['fileSize'], sortPath: 'fileSize', type: 'number' },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'lead',
    searchPaths: ['lead.firstName', 'lead.lastName', 'lead.companyName'],
    sortPath: 'lead.lastName',
    type: 'text'
  },
  { key: 'leadId', searchPaths: ['leadId'], sortPath: 'leadId', type: 'text' },
  { key: 'mandatory', searchPaths: ['mandatory'], sortPath: 'mandatory', type: 'boolean' },
  { key: 'mimeType', searchPaths: ['mimeType'], sortPath: 'mimeType', type: 'text' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'note', searchPaths: ['note.subject', 'note.content'], sortPath: 'note.subject', type: 'text' },
  { key: 'noteId', searchPaths: ['noteId'], sortPath: 'noteId', type: 'text' },
  {
    key: 'opportunity',
    searchPaths: ['opportunity.name', 'opportunity.description'],
    sortPath: 'opportunity.name',
    type: 'text'
  },
  { key: 'opportunityId', searchPaths: ['opportunityId'], sortPath: 'opportunityId', type: 'text' },
  { key: 'parentDocument', searchPaths: ['parentDocument.name'], sortPath: 'parentDocument.name', type: 'text' },
  { key: 'parentDocumentId', searchPaths: ['parentDocumentId'], sortPath: 'parentDocumentId', type: 'text' },
  { key: 'source', searchPaths: ['source'], sortPath: 'source', type: 'text' },
  { key: 'task', searchPaths: ['task.subject', 'task.description'], sortPath: 'task.subject', type: 'text' },
  { key: 'taskId', searchPaths: ['taskId'], sortPath: 'taskId', type: 'text' },
  { key: 'verificationDate', searchPaths: ['verificationDate'], sortPath: 'verificationDate', type: 'date' },
  { key: 'verified', searchPaths: ['verified'], sortPath: 'verified', type: 'boolean' },

  // Filter IDs
  { key: 'accountIds', path: 'accountId', kind: 'inIds' },
  { key: 'activityIds', path: 'activityId', kind: 'inIds' },
  { key: 'contactIds', path: 'contactId', kind: 'inIds' },
  { key: 'documentGroupIds', path: 'documentGroupRef', kind: 'inIds' },
  { key: 'documentTypeIds', path: 'documentTypeRef', kind: 'inIds' },
  { key: 'leadIds', path: 'leadId', kind: 'inIds' },
  { key: 'noteIds', path: 'noteId', kind: 'inIds' },
  { key: 'opportunityIds', path: 'opportunityId', kind: 'inIds' },
  { key: 'parentDocumentIds', path: 'parentDocumentId', kind: 'inIds' },
  { key: 'taskIds', path: 'taskId', kind: 'inIds' },

  // Date range filters
  { key: 'authenticationDateAfter', path: 'authenticationDate', kind: 'dateFrom' },
  { key: 'authenticationDateBefore', path: 'authenticationDate', kind: 'dateTo' },
  { key: 'expirationDateAfter', path: 'expirationDate', kind: 'dateFrom' },
  { key: 'expirationDateBefore', path: 'expirationDate', kind: 'dateTo' },
  { key: 'verificationDateAfter', path: 'verificationDate', kind: 'dateFrom' },
  { key: 'verificationDateBefore', path: 'verificationDate', kind: 'dateTo' }
]
