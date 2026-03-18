import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface Document extends BaseEntity {
  account?: any // IRM | CRM
  accountId?: string // IRM | CRM
  activity?: any // IRM | TODO
  activityId?: string // IRM | TODO
  authenticated?: boolean // IRM | CRM
  authenticationDate?: string // IRM | CRM
  childDocuments?: any[] // TODO | CRM
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
  fileSize?: number | null // TODO deprecated
  folder?: boolean // IRM | CRM
  id: string // IRM | CRM
  lead?: any // IRM | CRM
  leadId?: string // IRM | CRM
  mandatory?: boolean // IRM | CRM
  mimeType?: string | null // TODO deprecated
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

/**
 * Document Query Field Mapping
 */
export const DocumentFields = {
  account: 'account',
  accountId: 'accountId',
  activity: 'activity',
  activityId: 'activityId',
  authenticated: 'authenticated',
  authenticationDate: 'authenticationDate',
  childDocuments: 'childDocuments',
  contact: 'contact',
  contactId: 'contactId',
  description: 'description',
  documentGroup: 'documentGroup',
  documentGroupRef: 'documentGroupRef',
  documentType: 'documentType',
  documentTypeRef: 'documentTypeRef',
  expirationDate: 'expirationDate',
  file: 'file',
  fileInfo: 'fileInfo',
  fileSize: 'fileSize',
  folder: 'folder',
  id: 'id',
  lead: 'lead',
  leadId: 'leadId',
  mandatory: 'mandatory',
  mimeType: 'mimeType',
  name: 'name',
  note: 'note',
  noteId: 'noteId',
  opportunity: 'opportunity',
  opportunityId: 'opportunityId',
  parentDocument: 'parentDocument',
  parentDocumentId: 'parentDocumentId',
  source: 'source',
  task: 'task',
  taskId: 'taskId',
  verificationDate: 'verificationDate',
  verified: 'verified'
} as const

export const DocumentFormFields = {
  accountId: 'account',
  activityId: 'activity',
  authenticated: 'authenticated',
  authenticationDate: 'authenticationDate',
  contactId: 'contact',
  description: 'description',
  documentGroupRef: 'documentGroupRef',
  documentTypeRef: 'documentTypeRef',
  expirationDate: 'expirationDate',
  fileInfo: 'fileInfo',
  folder: 'folder',
  id: 'id',
  leadId: 'lead',
  mandatory: 'mandatory',
  name: 'name',
  noteId: 'note',
  opportunityId: 'opportunity',
  parentDocumentId: 'parentDocument',
  source: 'source',
  taskId: 'task',
  verificationDate: 'verificationDate',
  verified: 'verified'
}

/**
 * Create Common Document Descriptors with fields mapping
 */
export const createDocumentDescriptors = (
  fields: Record<keyof typeof DocumentFields, string> = DocumentFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'account',
    searchPaths: [`${fields.account}.name`, `${fields.account}.code`],
    sortPath: `${fields.account}.name`,
    type: 'text'
  },
  {
    key: 'activity',
    searchPaths: [`${fields.activity}.title`, `${fields.activity}.description`],
    sortPath: `${fields.activity}.title`,
    type: 'text'
  },
  { key: 'authenticated', searchPaths: [fields.authenticated], sortPath: fields.authenticated, type: 'boolean' },
  {
    key: 'authenticationDate',
    searchPaths: [fields.authenticationDate],
    sortPath: fields.authenticationDate,
    type: 'date'
  },
  {
    key: 'childDocuments',
    searchPaths: [`${fields.childDocuments}.name`],
    sortPath: `${fields.childDocuments}.name`,
    type: 'text'
  },
  {
    key: 'contact',
    searchPaths: [`${fields.contact}.firstName`, `${fields.contact}.lastName`],
    sortPath: `${fields.contact}.lastName`,
    type: 'text'
  },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  {
    key: 'documentGroup',
    searchPaths: [`${fields.documentGroup}.value`, `${fields.documentGroup}.code`],
    sortPath: `${fields.documentGroup}.value`,
    type: 'text'
  },
  {
    key: 'documentType',
    searchPaths: [`${fields.documentType}.value`, `${fields.documentType}.code`],
    sortPath: `${fields.documentType}.value`,
    type: 'text'
  },
  { key: 'expirationDate', searchPaths: [fields.expirationDate], sortPath: fields.expirationDate, type: 'date' },
  { key: 'file', searchPaths: [fields.file], sortPath: fields.file, type: 'text' },
  { key: 'fileInfo', searchPaths: [fields.fileInfo], sortPath: fields.fileInfo, type: 'text' },
  { key: 'fileSize', searchPaths: [fields.fileSize], sortPath: fields.fileSize, type: 'number' },
  { key: 'folder', searchPaths: [fields.folder], sortPath: fields.folder, type: 'boolean' },
  {
    key: 'lead',
    searchPaths: [`${fields.lead}.firstName`, `${fields.lead}.lastName`, `${fields.lead}.companyName`],
    sortPath: `${fields.lead}.lastName`,
    type: 'text'
  },
  { key: 'mandatory', searchPaths: [fields.mandatory], sortPath: fields.mandatory, type: 'boolean' },
  { key: 'mimeType', searchPaths: [fields.mimeType], sortPath: fields.mimeType, type: 'text' },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  {
    key: 'note',
    searchPaths: [`${fields.note}.title`, `${fields.note}.text`],
    sortPath: `${fields.note}.title`,
    type: 'text'
  },
  {
    key: 'opportunity',
    searchPaths: [`${fields.opportunity}.name`, `${fields.opportunity}.description`],
    sortPath: `${fields.opportunity}.name`,
    type: 'text'
  },
  {
    key: 'parentDocument',
    searchPaths: [`${fields.parentDocument}.name`],
    sortPath: `${fields.parentDocument}.name`,
    type: 'text'
  },
  { key: 'source', searchPaths: [fields.source], sortPath: fields.source, type: 'text' },
  {
    key: 'task',
    searchPaths: [`${fields.task}.name`, `${fields.task}.description`],
    sortPath: `${fields.task}.name`,
    type: 'text'
  },
  { key: 'verificationDate', searchPaths: [fields.verificationDate], sortPath: fields.verificationDate, type: 'date' },
  { key: 'verified', searchPaths: [fields.verified], sortPath: fields.verified, type: 'boolean' },

  // Filter IDs
  { key: 'accountIds', path: fields.accountId, kind: 'inIds' },
  { key: 'activityIds', path: fields.activityId, kind: 'inIds' },
  { key: 'contactIds', path: fields.contactId, kind: 'inIds' },
  { key: 'documentGroupIds', path: fields.documentGroupRef, kind: 'inIds' },
  { key: 'documentTypeIds', path: fields.documentTypeRef, kind: 'inIds' },
  { key: 'leadIds', path: fields.leadId, kind: 'inIds' },
  { key: 'noteIds', path: fields.noteId, kind: 'inIds' },
  { key: 'opportunityIds', path: fields.opportunityId, kind: 'inIds' },
  { key: 'parentDocumentIds', path: fields.parentDocumentId, kind: 'inIds' },
  { key: 'taskIds', path: fields.taskId, kind: 'inIds' },

  // Date range filters
  { key: 'authenticationDateFrom', path: fields.authenticationDate, kind: 'dateFrom' },
  { key: 'authenticationDateTo', path: fields.authenticationDate, kind: 'dateTo' },
  { key: 'expirationDateFrom', path: fields.expirationDate, kind: 'dateFrom' },
  { key: 'expirationDateTo', path: fields.expirationDate, kind: 'dateTo' },
  { key: 'verificationDateFrom', path: fields.verificationDate, kind: 'dateFrom' },
  { key: 'verificationDateTo', path: fields.verificationDate, kind: 'dateTo' }
]
