import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CommonAccountContact } from './commonRelationTypes'
import type { CommonActivity } from './commonActivityTypes'
import type { CommonDocument } from './commonDocumentTypes'
import type { CommonLead } from './commonLeadTypes'
import type { CommonNote } from './commonNoteTypes'
import type { CommonOpportunity } from './commonOpportunityTypes'
import type { CommonTask } from './commonTaskTypes'
import type { ContactType } from '../constants/commonContactConstants'

export interface CommonContact extends BaseEntity {
  academicTitle?: CatalogEntry // IRM | CRM
  academicTitleRef?: string // IRM | CRM
  accountContacts?: CommonAccountContact[] // IRM | CRM
  activities?: CommonActivity[] // IRM | CRM
  addresses?: Address[] // IRM | CRM
  birthDate?: string // IRM | CRM
  code?: string // IRM | CRM
  communicationChannels?: CommunicationChannel[] // IRM | CRM
  department?: string // IRM | CRM
  description?: string // IRM | TODO (missing)
  documents?: CommonDocument[] // IRM | CRM
  firstName?: string // IRM | CRM
  fullName?: string // IRM | TODO (missing) --> unclear
  id?: string // IRM | CRM
  jobPosition?: string // IRM | TODO (jobTitle)
  language?: CatalogEntry // IRM | CRM
  languageRef?: string // IRM | CRM
  lastName?: string // IRM | CRM
  leads?: CommonLead[] // IRM | CRM
  notes?: CommonNote[] // IRM | CRM
  notesSummary?: string // IRM | CRM
  opportunityContacts?: CommonOpportunity[] // IRM | CRM
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  picture?: string // IRM | TODO (pictureUrl)
  pictureThumbnail?: string // IRM | TODO (pictureThumbnailUrl)
  salutation?: CatalogEntry // IRM | CRM
  salutationRef?: string // IRM | CRM
  tasks?: CommonTask[] // IRM | CRM
  type?: ContactType // IRM | TODO (contactType)
}

export const COMMON_CONTACT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'academicTitle',
    searchPaths: ['academicTitle.value', 'academicTitle.code'],
    sortPath: 'academicTitle.value',
    type: 'text'
  },
  {
    key: 'accountContacts',
    searchPaths: ['accountContacts.account.name'],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'activities',
    searchPaths: ['activities.title', 'activities.description'],
    sortPath: 'activities.title',
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: ['addresses.locality', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    sortPaths: ['addresses.locality', 'addresses.postalCode', 'addresses.region.value', 'addresses.country.value'],
    type: 'text'
  },
  { key: 'birthDate', searchPaths: ['birthDate'], sortPath: 'birthDate', type: 'date' },
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  {
    key: 'communicationChannels',
    searchPaths: ['communicationChannels.value'],
    sortPath: 'communicationChannels.value',
    type: 'text'
  },
  { key: 'department', searchPaths: ['department'], sortPath: 'department', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'firstName', searchPaths: ['firstName'], sortPath: 'firstName', type: 'text' },
  { key: 'fullName', searchPaths: ['fullName'], sortPath: 'fullName', type: 'text' },
  { key: 'jobPosition', searchPaths: ['jobPosition'], sortPath: 'jobPosition', type: 'text' },
  {
    key: 'language',
    searchPaths: ['language.value', 'language.code'],
    sortPath: 'language.value',
    type: 'text'
  },
  { key: 'lastName', searchPaths: ['lastName'], sortPath: 'lastName', type: 'text' },
  {
    key: 'leads',
    searchPaths: ['leads.firstName', 'leads.lastName', 'leads.companyName'],
    sortPath: 'leads.lastName',
    type: 'text'
  },
  { key: 'notes', searchPaths: ['notes.title', 'notes.text'], sortPath: 'notes.title', type: 'text' },
  { key: 'notesSummary', searchPaths: ['notesSummary'], sortPath: 'notesSummary', type: 'text' },
  {
    key: 'opportunityContacts',
    searchPaths: ['opportunityContacts.opportunity.name'],
    sortPath: 'opportunityContacts.opportunity.name',
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'picture', searchPaths: ['picture'], sortPath: 'picture', type: 'text' },
  { key: 'pictureThumbnail', searchPaths: ['pictureThumbnail'], sortPath: 'pictureThumbnail', type: 'text' },
  {
    key: 'salutation',
    searchPaths: ['salutation.value', 'salutation.code'],
    sortPath: 'salutation.value',
    type: 'text'
  },
  { key: 'tasks', searchPaths: ['tasks.name', 'tasks.description'], sortPath: 'tasks.name', type: 'text' },
  { key: 'type', searchPaths: ['type'], sortPath: 'type', type: 'text' },

  // Filter IDs
  { key: 'academicTitleIds', path: 'academicTitleRef', kind: 'inIds' },
  { key: 'languageIds', path: 'languageRef', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },
  { key: 'salutationIds', path: 'salutationRef', kind: 'inIds' },

  // Date range filters
  { key: 'birthDateAfter', path: 'birthDate', kind: 'dateFrom' },
  { key: 'birthDateBefore', path: 'birthDate', kind: 'dateTo' },

  // Composite display columns (for table sorting)
  // contact: Displays firstName, lastName, fullName - sorts by firstName (primary), lastName (fallback)
  { key: 'contact', searchPaths: ['firstName', 'lastName', 'fullName'], sortPath: 'firstName', type: 'text' },

  // communicationChannels: Displays communicationChannels array - not sortable
  {
    key: 'communicationChannels',
    searchPaths: ['communicationChannels.value'],
    enableSort: false,
    type: 'text'
  }
]
