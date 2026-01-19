import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CommonAccountContact } from './relationTypes'
import type { Activity } from './activityTypes'
import type { Document } from './documentTypes'
import type { Lead } from './leadTypes'
import type { Note } from './noteTypes'
import type { Opportunity } from './opportunityTypes'
import type { Task } from './taskTypes'
import type { ContactType } from '../constants/contactConstants'

export interface Contact extends BaseEntity {
  academicTitle?: CatalogEntry // IRM | CRM
  academicTitleRef?: string // IRM | CRM
  accountContacts?: CommonAccountContact[] // IRM | CRM
  activities?: Activity[] // IRM | CRM
  addresses?: Address[] // IRM | CRM
  birthDate?: string // IRM | CRM
  code?: string // IRM | CRM
  communicationChannels?: CommunicationChannel[] // IRM | CRM
  department?: string // IRM | CRM
  description?: string // IRM | TODO (missing)
  documents?: Document[] // IRM | CRM
  firstName?: string // IRM | CRM
  fullName?: string // IRM | TODO (missing) --> unclear
  id?: string // IRM | CRM
  jobPosition?: string // IRM | TODO (jobTitle)
  language?: CatalogEntry // IRM | CRM
  languageRef?: string // IRM | CRM
  lastName?: string // IRM | CRM
  leads?: Lead[] // IRM | CRM
  notes?: Note[] // IRM | CRM
  notesSummary?: string // IRM | CRM
  opportunityContacts?: Opportunity[] // IRM | CRM
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  picture?: string // IRM | TODO (pictureUrl)
  pictureThumbnail?: string // IRM | TODO (pictureThumbnailUrl)
  salutation?: CatalogEntry // IRM | CRM
  salutationRef?: string // IRM | CRM
  tasks?: Task[] // IRM | CRM
  type?: ContactType // IRM | TODO (contactType)
  userId?: string // Platform user ID for this contact (optional)
}

/**
 * Contact Query Field Mapping
 */
export const ContactFields = {
  academicTitle: 'academicTitle',
  academicTitleRef: 'academicTitleRef',
  accountContacts: 'accountContacts',
  activities: 'activities',
  addresses: 'addresses',
  birthDate: 'birthDate',
  code: 'code',
  communicationChannels: 'communicationChannels',
  department: 'department',
  description: 'description',
  documents: 'documents',
  firstName: 'firstName',
  fullName: 'fullName',
  id: 'id',
  jobPosition: 'jobPosition',
  language: 'language',
  languageRef: 'languageRef',
  lastName: 'lastName',
  leads: 'leads',
  notes: 'notes',
  notesSummary: 'notesSummary',
  opportunityContacts: 'opportunityContacts',
  ownerEmployee: 'ownerEmployee',
  ownerEmployeeId: 'ownerEmployeeId',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  salutation: 'salutation',
  salutationRef: 'salutationRef',
  tasks: 'tasks',
  type: 'type',
  userId: 'userId'
} as const

/**
 * Create Common Contact Descriptors with fields mapping
 */
export const createContactDescriptors = (
  fields: Record<keyof typeof ContactFields, string> = ContactFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  {
    key: 'academicTitle',
    searchPaths: [`${fields.academicTitle}.value`, `${fields.academicTitle}.code`],
    sortPath: `${fields.academicTitle}.value`,
    type: 'text'
  },
  {
    key: 'accountContacts',
    searchPaths: [`${fields.accountContacts}.account.name`],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'activities',
    searchPaths: [`${fields.activities}.title`, `${fields.activities}.description`],
    sortPath: `${fields.activities}.title`,
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: [
      `${fields.addresses}.locality`,
      `${fields.addresses}.postalCode`,
      `${fields.addresses}.region.value`,
      `${fields.addresses}.country.value`
    ],
    sortPaths: [
      `${fields.addresses}.locality`,
      `${fields.addresses}.postalCode`,
      `${fields.addresses}.region.value`,
      `${fields.addresses}.country.value`
    ],
    type: 'text'
  },
  { key: 'birthDate', searchPaths: [fields.birthDate], sortPath: fields.birthDate, type: 'date' },
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  {
    key: 'communicationChannels',
    searchPaths: [`${fields.communicationChannels}.value`],
    sortPath: `${fields.communicationChannels}.value`,
    type: 'text'
  },
  { key: 'department', searchPaths: [fields.department], sortPath: fields.department, type: 'text' },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  { key: 'firstName', searchPaths: [fields.firstName], sortPath: fields.firstName, type: 'text' },
  { key: 'fullName', searchPaths: [fields.fullName], sortPath: fields.fullName, type: 'text' },
  { key: 'jobPosition', searchPaths: [fields.jobPosition], sortPath: fields.jobPosition, type: 'text' },
  {
    key: 'language',
    searchPaths: [`${fields.language}.value`, `${fields.language}.code`],
    sortPath: `${fields.language}.value`,
    type: 'text'
  },
  { key: 'lastName', searchPaths: [fields.lastName], sortPath: fields.lastName, type: 'text' },
  {
    key: 'leads',
    searchPaths: [`${fields.leads}.firstName`, `${fields.leads}.lastName`, `${fields.leads}.companyName`],
    sortPath: `${fields.leads}.lastName`,
    type: 'text'
  },
  {
    key: 'notes',
    searchPaths: [`${fields.notes}.title`, `${fields.notes}.text`],
    sortPath: `${fields.notes}.title`,
    type: 'text'
  },
  { key: 'notesSummary', searchPaths: [fields.notesSummary], sortPath: fields.notesSummary, type: 'text' },
  {
    key: 'opportunityContacts',
    searchPaths: [`${fields.opportunityContacts}.opportunity.name`],
    sortPath: `${fields.opportunityContacts}.opportunity.name`,
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
  { key: 'picture', searchPaths: [fields.picture], sortPath: fields.picture, type: 'text' },
  { key: 'pictureThumbnail', searchPaths: [fields.pictureThumbnail], sortPath: fields.pictureThumbnail, type: 'text' },
  {
    key: 'salutation',
    searchPaths: [`${fields.salutation}.value`, `${fields.salutation}.code`],
    sortPath: `${fields.salutation}.value`,
    type: 'text'
  },
  {
    key: 'tasks',
    searchPaths: [`${fields.tasks}.name`, `${fields.tasks}.description`],
    sortPath: `${fields.tasks}.name`,
    type: 'text'
  },
  { key: 'type', searchPaths: [fields.type], sortPath: fields.type, type: 'text' },

  // Filter IDs
  {
    key: 'academicTitleIds',
    path: fields.academicTitleRef,
    filterLabel: 'Academic Title',
    optionSelectPaths: [`${fields.academicTitle}.id`, `${fields.academicTitle}.value`],
    optionSearchPaths: [`${fields.academicTitle}.value`, `${fields.academicTitle}.code`],
    optionDistinctOn: [fields.academicTitleRef],
    kind: 'inIds'
  },
  {
    key: 'departmentIds',
    path: fields.department,
    filterLabel: 'Department',
    optionSelectPaths: [`${fields.department}`],
    optionSearchPaths: [`${fields.department}`],
    optionDistinctOn: [fields.department],
    kind: 'inIds'
  },

  {
    key: 'languageIds',
    path: fields.languageRef,
    filterLabel: 'Language',
    optionSelectPaths: [`${fields.language}.id`, `${fields.language}.value`],
    optionSearchPaths: [`${fields.language}.value`, `${fields.language}.code`],
    optionDistinctOn: [fields.languageRef],
    kind: 'inIds'
  },
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
  {
    key: 'salutationIds',
    path: fields.salutationRef,
    filterLabel: 'Salutation',
    optionSelectPaths: [`${fields.salutation}.id`, `${fields.salutation}.value`],
    optionSearchPaths: [`${fields.salutation}.value`, `${fields.salutation}.code`],
    optionDistinctOn: [fields.salutationRef],
    kind: 'inIds'
  },

  // Date range filters
  { key: 'birthDateFrom', path: fields.birthDate, kind: 'dateFrom' },
  { key: 'birthDateTo', path: fields.birthDate, kind: 'dateTo' },

  // Composite display columns
  {
    key: 'contact',
    searchPaths: [fields.firstName, fields.lastName, fields.fullName],
    sortPath: fields.firstName,
    type: 'text'
  },
  {
    key: 'communicationChannels',
    searchPaths: [`${fields.communicationChannels}.value`],
    enableSort: false,
    type: 'text'
  }
]

/**
 * Contact Form Fields Configuration
 * Defines which fields to include in payload
 * Sorted alphabetically by sourceKey
 *
 * Transformations are handled automatically:
 * - Dates → ISO format
 * - Arrays → included only if not empty
 * - Objects → included only if not empty
 * - Primitives → string or undefined
 */
export const contactFormFields = {
  academicTitleRef: 'academicTitleRef',
  accountContacts: 'accountContacts',
  addresses: 'addresses',
  birthDate: 'birthDate',
  businessKey: 'businessKey',
  code: 'code',
  communicationChannels: 'communicationChannels',
  department: 'department',
  description: 'description',
  documents: 'documents',
  firstName: 'firstName',
  fullName: 'fullName',
  id: 'id',
  jobPosition: 'jobPosition',
  languageRef: 'languageRef',
  lastName: 'lastName',
  notesSummary: 'notesSummary',
  ownerEmployeeId: 'ownerEmployee',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  professionalTitleRef: 'professionalTitleRef',
  salutationRef: 'salutationRef',
  type: 'type',
  userId: 'userId',
  version: 'version'
} as const
