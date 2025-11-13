import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CommonAccountContact } from './relationTypes'
import type { Activity } from './activityTypes'
import type { Contact } from './contactTypes'
import type { Document } from './documentTypes'
import type { Lead } from './leadTypes'
import type { Note } from './noteTypes'
import type { Opportunity } from './opportunityTypes'
import type { Task } from './taskTypes'

export interface Account extends BaseEntity {
  accountAnnualRevenueBand?: CatalogEntry // IRM | TODO (annualRevenue in CRM)
  accountAnnualRevenueBandRef?: string // IRM | TODO (annualRevenueRef in CRM)
  accountContacts?: CommonAccountContact[] // IRM | TODO (accountContacts in CRM)
  activities?: Activity[] // IRM | TODO (CRM missing)
  addresses?: Address[] // IRM | CRM
  code?: string // IRM | CRM
  communicationChannels?: CommunicationChannel[] // IRM | CRM
  companySize?: CatalogEntry // IRM | TODO (numberOfEmployees in CRM)
  companySizeRef?: string // IRM | TODO (numberOfEmployeesRef in CRM)
  contacts?: Contact[] // IRM | TODO (contact in CRM)
  documents?: Document[] // IRM | CRM
  foundationDate?: string // IRM | CRM
  id?: string // IRM | CRM
  industryClass?: CatalogEntry // IRM | TODO (industry in CRM)
  industryClassRef?: string // IRM | TODO (industryRef in CRM)
  leads?: Lead[] // IRM | TODO (CRM missing)
  legalForm?: CatalogEntry // IRM | CRM
  legalFormRef?: string // IRM | CRM
  liquidationDate?: string // IRM | CRM
  name?: string // IRM | CRM
  notes?: Note[] // IRM | CRM
  notesSummary?: string // IRM | CRM
  opportunities?: Opportunity[] // IRM | TODO (opportunity in CRM)
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  picture?: string // IRM | TODO (pictureUrl in CRM)
  pictureThumbnail?: string // IRM | TODO (pictureThumbnailUrl in CRM)
  tasks?: Task[] // IRM | CRM
  timeZone?: CatalogEntry // IRM | CRM
  timeZoneRef?: string // IRM | CRM
  wesbite?: string // IRM | CRM
}

export const AccountFields = {
  accountAnnualRevenueBand: 'accountAnnualRevenueBand',
  accountAnnualRevenueBandRef: 'accountAnnualRevenueBandRef',
  accountContacts: 'accountContacts',
  activities: 'activities',
  addresses: 'addresses',
  code: 'code',
  communicationChannels: 'communicationChannels',
  companySize: 'companySize',
  companySizeRef: 'companySizeRef',
  contacts: 'contacts',
  documents: 'documents',
  foundationDate: 'foundationDate',
  id: 'id',
  industryClass: 'industryClass',
  industryClassRef: 'industryClassRef',
  leads: 'leads',
  legalForm: 'legalForm',
  legalFormRef: 'legalFormRef',
  liquidationDate: 'liquidationDate',
  name: 'name',
  notes: 'notes',
  notesSummary: 'notesSummary',
  opportunities: 'opportunities',
  ownerEmployee: 'ownerEmployee',
  ownerEmployeeId: 'ownerEmployeeId',
  picture: 'picture',
  pictureThumbnail: 'pictureThumbnail',
  tasks: 'tasks',
  timeZone: 'timeZone',
  timeZoneRef: 'timeZoneRef',
  website: 'website'
} as const

// Type helper
export type AccountFieldName = (typeof AccountFields)[keyof typeof AccountFields]

/**
 * Create Common Account Descriptors with fields mapping
 * @param fields - AccountFields mapping (default: AccountFields)
 * @returns Descriptor array with field paths using the provided mapping
 */
export const createAccountDescriptors = (
  fields: Record<keyof typeof AccountFields, string> = AccountFields
): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,

  // Account fields (alphabetically sorted, matching interface)
  {
    key: 'accountAnnualRevenueBand',
    searchPaths: [`${fields.accountAnnualRevenueBand}.value`, `${fields.accountAnnualRevenueBand}.code`],
    sortPath: `${fields.accountAnnualRevenueBand}.value`,
    type: 'text'
  },
  {
    key: 'accountContacts',
    searchPaths: [`${fields.accountContacts}.contact.firstName`, `${fields.accountContacts}.contact.lastName`],
    sortPaths: [`${fields.accountContacts}.contact.firstName`, `${fields.accountContacts}.contact.lastName`],
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
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  {
    key: 'communicationChannels',
    searchPaths: [`${fields.communicationChannels}.value`],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'companySize',
    searchPaths: [`${fields.companySize}.value`, `${fields.companySize}.code`],
    sortPath: `${fields.companySize}.value`,
    type: 'text'
  },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  { key: 'foundationDate', searchPaths: [fields.foundationDate], sortPath: fields.foundationDate, type: 'date' },
  {
    key: 'industryClass',
    searchPaths: [`${fields.industryClass}.value`, `${fields.industryClass}.code`],
    sortPath: `${fields.industryClass}.value`,
    type: 'text'
  },
  {
    key: 'leads',
    searchPaths: [`${fields.leads}.firstName`, `${fields.leads}.lastName`, `${fields.leads}.companyName`],
    sortPath: `${fields.leads}.lastName`,
    type: 'text'
  },
  {
    key: 'legalForm',
    searchPaths: [`${fields.legalForm}.value`, `${fields.legalForm}.code`],
    sortPath: `${fields.legalForm}.value`,
    type: 'text'
  },
  { key: 'liquidationDate', searchPaths: [fields.liquidationDate], sortPath: fields.liquidationDate, type: 'date' },
  { key: 'name', searchPaths: [fields.name], sortPath: fields.name, type: 'text' },
  {
    key: 'notes',
    searchPaths: [`${fields.notes}.title`, `${fields.notes}.text`],
    sortPath: `${fields.notes}.title`,
    type: 'text'
  },
  { key: 'notesSummary', searchPaths: [fields.notesSummary], sortPath: fields.notesSummary, type: 'text' },
  {
    key: 'opportunities',
    searchPaths: [`${fields.opportunities}.name`],
    sortPath: `${fields.opportunities}.name`,
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
    key: 'tasks',
    searchPaths: [`${fields.tasks}.name`, `${fields.tasks}.description`],
    sortPath: `${fields.tasks}.name`,
    type: 'text'
  },
  {
    key: 'timeZone',
    searchPaths: [`${fields.timeZone}.value`, `${fields.timeZone}.code`],
    sortPath: `${fields.timeZone}.value`,
    type: 'text'
  },
  { key: 'wesbite', searchPaths: [fields.website], sortPath: fields.website, type: 'text' },

  // Filter IDs for Refs
  {
    key: 'accountAnnualRevenueBandIds',
    path: fields.accountAnnualRevenueBandRef,
    filterLabel: 'Revenue Band',
    optionSelectPaths: [
      `${fields.accountAnnualRevenueBand}.id`,
      `${fields.accountAnnualRevenueBand}.value`,
      `${fields.accountAnnualRevenueBand}.code`
    ],
    optionSearchPaths: [`${fields.accountAnnualRevenueBand}.value`, `${fields.accountAnnualRevenueBand}.code`],
    optionDistinctOn: [fields.accountAnnualRevenueBandRef],
    kind: 'inIds'
  },
  {
    key: 'companySizeIds',
    path: fields.companySizeRef,
    filterLabel: 'Company Size',
    optionSelectPaths: [`${fields.companySize}.id`, `${fields.companySize}.value`, `${fields.companySize}.code`],
    optionSearchPaths: [`${fields.companySize}.value`, `${fields.companySize}.code`],
    optionDistinctOn: [fields.companySizeRef],
    kind: 'inIds'
  },
  {
    key: 'countryIds',
    path: `${fields.addresses}.countryRef`,
    optionSelectPaths: [
      `${fields.addresses}.country.id`,
      `${fields.addresses}.country.value`,
      `${fields.addresses}.country.code`
    ],
    optionSearchPaths: [`${fields.addresses}.country.value`, `${fields.addresses}.country.code`],
    optionDistinctOn: [`${fields.addresses}.countryRef`],
    filterLabel: 'Country',
    kind: 'inIds'
  },
  {
    key: 'industryClassIds',
    path: fields.industryClassRef,
    filterLabel: 'Industry',
    optionSelectPaths: [`${fields.industryClass}.id`, `${fields.industryClass}.value`, `${fields.industryClass}.code`],
    optionSearchPaths: [`${fields.industryClass}.value`, `${fields.industryClass}.code`],
    optionDistinctOn: [fields.industryClassRef],
    kind: 'inIds'
  },
  {
    key: 'legalFormIds',
    path: fields.legalFormRef,
    filterLabel: 'Legal Form',
    optionSelectPaths: [`${fields.legalForm}.id`, `${fields.legalForm}.value`, `${fields.legalForm}.code`],
    optionSearchPaths: [`${fields.legalForm}.value`, `${fields.legalForm}.code`],
    optionDistinctOn: [fields.legalFormRef],
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
  { key: 'timeZoneIds', path: fields.timeZoneRef, kind: 'inIds' },

  // Date range filters
  { key: 'foundationDateFrom', path: fields.foundationDate, kind: 'dateFrom' },
  { key: 'foundationDateTo', path: fields.foundationDate, kind: 'dateTo' },
  { key: 'liquidationDateFrom', path: fields.liquidationDate, kind: 'dateFrom' },
  { key: 'liquidationDateTo', path: fields.liquidationDate, kind: 'dateTo' }
]

// Deprecated - remove later
interface FilterOption {
  id: string
  label: string
}

export interface CommonAccountFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  industries: FilterOption[]
  legalForms: FilterOption[]
  companySizes: FilterOption[]
  revenueBands: FilterOption[]

  // Geography filters
  countries: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    industries?: number
    legalForms?: number
    companySizes?: number
    revenueBands?: number
    countries?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchIndustries?: (query: string) => Promise<FilterOption[]>
  searchLegalForms?: (query: string) => Promise<FilterOption[]>
  searchCompanySizes?: (query: string) => Promise<FilterOption[]>
  searchRevenueBands?: (query: string) => Promise<FilterOption[]>
  searchCountries?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMoreIndustries?: () => Promise<void>
  loadMoreLegalForms?: () => Promise<void>
  loadMoreCompanySizes?: () => Promise<void>
  loadMoreRevenueBands?: () => Promise<void>
  loadMoreCountries?: () => Promise<void>
}
