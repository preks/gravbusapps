import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Address, CommunicationChannel } from '@/common/data/common/types/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { CommonAccountContact } from './commonRelationTypes'
import type { CommonActivity } from './commonActivityTypes'
import type { CommonContact } from './commonContactTypes'
import type { CommonDocument } from './commonDocumentTypes'
import type { CommonLead } from './commonLeadTypes'
import type { CommonNote } from './commonNoteTypes'
import type { CommonOpportunity } from './commonOpportunityTypes'
import type { CommonTask } from './commonTaskTypes'

export interface CommonAccount extends BaseEntity {
  accountAnnualRevenueBand?: CatalogEntry // IRM | TODO (annualRevenue in CRM)
  accountAnnualRevenueBandRef?: string // IRM | TODO (annualRevenueRef in CRM)
  accountContacts?: CommonAccountContact[] // IRM | TODO (accountContacts in CRM)
  activities?: CommonActivity[] // IRM | TODO (CRM missing)
  addresses?: Address[] // IRM | CRM
  code?: string // IRM | CRM
  communicationChannels?: CommunicationChannel[] // IRM | CRM
  companySize?: CatalogEntry // IRM | TODO (numberOfEmployees in CRM)
  companySizeRef?: string // IRM | TODO (numberOfEmployeesRef in CRM)
  contacts?: CommonContact[] // IRM | TODO (contact in CRM)
  documents?: CommonDocument[] // IRM | CRM
  foundationDate?: string // IRM | CRM
  id?: string // IRM | CRM
  industryClass?: CatalogEntry // IRM | TODO (industry in CRM)
  industryClassRef?: string // IRM | TODO (industryRef in CRM)
  leads?: CommonLead[] // IRM | TODO (CRM missing)
  legalForm?: CatalogEntry // IRM | CRM
  legalFormRef?: string // IRM | CRM
  liquidationDate?: string // IRM | CRM
  name?: string // IRM | CRM
  notes?: CommonNote[] // IRM | CRM
  notesSummary?: string // IRM | CRM
  opportunities?: CommonOpportunity[] // IRM | TODO (opportunity in CRM)
  ownerEmployee?: Employee // IRM | CRM
  ownerEmployeeId?: string // IRM | CRM
  picture?: string // IRM | TODO (pictureUrl in CRM)
  pictureThumbnail?: string // IRM | TODO (pictureThumbnailUrl in CRM)
  tasks?: CommonTask[] // IRM | CRM
  timeZone?: CatalogEntry // IRM | CRM
  timeZoneRef?: string // IRM | CRM
}

export const COMMON_ACCOUNT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,

  // CommonAccount fields (alphabetically sorted, matching interface)
  {
    key: 'accountAnnualRevenueBand',
    searchPaths: ['accountAnnualRevenueBand.value', 'accountAnnualRevenueBand.code'],
    sortPath: 'accountAnnualRevenueBand.value',
    type: 'text'
  },
  {
    key: 'accountAnnualRevenueBandRef',
    searchPaths: ['accountAnnualRevenueBandRef'],
    sortPath: 'accountAnnualRevenueBandRef',
    type: 'text'
  },
  {
    key: 'accountContacts',
    searchPaths: ['accountContacts.firstName', 'accountContacts.lastName'],
    sortPath: 'accountContacts.lastName',
    type: 'text'
  },
  {
    key: 'activities',
    searchPaths: ['activities.subject', 'activities.description'],
    sortPath: 'activities.subject',
    type: 'text'
  },
  {
    key: 'addresses',
    searchPaths: ['addresses.addressLine', 'addresses.locality'],
    enableSort: false,
    type: 'text'
  },
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  {
    key: 'communicationChannels',
    searchPaths: ['communicationChannels.value'],
    enableSort: false,
    type: 'text'
  },
  {
    key: 'companySize',
    searchPaths: ['companySize.value', 'companySize.code'],
    sortPath: 'companySize.value',
    type: 'text'
  },
  { key: 'companySizeRef', searchPaths: ['companySizeRef'], sortPath: 'companySizeRef', type: 'text' },
  {
    key: 'contacts',
    searchPaths: ['contacts.firstName', 'contacts.lastName'],
    sortPath: 'contacts.lastName',
    type: 'text'
  },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'foundationDate', searchPaths: ['foundationDate'], sortPath: 'foundationDate', type: 'date' },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'industryClass',
    searchPaths: ['industryClass.value', 'industryClass.code'],
    sortPath: 'industryClass.value',
    type: 'text'
  },
  { key: 'industryClassRef', searchPaths: ['industryClassRef'], sortPath: 'industryClassRef', type: 'text' },
  {
    key: 'leads',
    searchPaths: ['leads.firstName', 'leads.lastName', 'leads.companyName'],
    sortPath: 'leads.lastName',
    type: 'text'
  },
  {
    key: 'legalForm',
    searchPaths: ['legalForm.value', 'legalForm.code'],
    sortPath: 'legalForm.value',
    type: 'text'
  },
  { key: 'legalFormRef', searchPaths: ['legalFormRef'], sortPath: 'legalFormRef', type: 'text' },
  { key: 'liquidationDate', searchPaths: ['liquidationDate'], sortPath: 'liquidationDate', type: 'date' },
  { key: 'name', searchPaths: ['name'], sortPath: 'name', type: 'text' },
  { key: 'notes', searchPaths: ['notes.subject', 'notes.content'], sortPath: 'notes.subject', type: 'text' },
  { key: 'notesSummary', searchPaths: ['notesSummary'], sortPath: 'notesSummary', type: 'text' },
  {
    key: 'opportunities',
    searchPaths: ['opportunities.name', 'opportunities.description'],
    sortPath: 'opportunities.name',
    type: 'text'
  },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'ownerEmployeeId', searchPaths: ['ownerEmployeeId'], sortPath: 'ownerEmployeeId', type: 'text' },
  { key: 'picture', searchPaths: ['picture'], sortPath: 'picture', type: 'text' },
  { key: 'pictureThumbnail', searchPaths: ['pictureThumbnail'], sortPath: 'pictureThumbnail', type: 'text' },
  { key: 'tasks', searchPaths: ['tasks.subject', 'tasks.description'], sortPath: 'tasks.subject', type: 'text' },
  {
    key: 'timeZone',
    searchPaths: ['timeZone.value', 'timeZone.code'],
    sortPath: 'timeZone.value',
    type: 'text'
  },
  { key: 'timeZoneRef', searchPaths: ['timeZoneRef'], sortPath: 'timeZoneRef', type: 'text' },

  // Filter IDs for Refs
  { key: 'accountAnnualRevenueBandIds', path: 'accountAnnualRevenueBandRef', kind: 'inIds' },
  { key: 'companySizeIds', path: 'companySizeRef', kind: 'inIds' },
  { key: 'industryClassIds', path: 'industryClassRef', kind: 'inIds' },
  { key: 'legalFormIds', path: 'legalFormRef', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },
  { key: 'timeZoneIds', path: 'timeZoneRef', kind: 'inIds' },

  // Date range filters
  { key: 'foundationDateAfter', path: 'foundationDate', kind: 'dateFrom' },
  { key: 'foundationDateBefore', path: 'foundationDate', kind: 'dateTo' },
  { key: 'liquidationDateAfter', path: 'liquidationDate', kind: 'dateFrom' },
  { key: 'liquidationDateBefore', path: 'liquidationDate', kind: 'dateTo' },

  // size: Displays companySize catalog entry - sorts by companySize.value
  { key: 'size', searchPaths: ['companySize.value', 'companySize.code'], sortPath: 'companySize.value', type: 'text' },

  // revenue: Displays accountAnnualRevenueBand catalog entry - sorts by accountAnnualRevenueBand.value
  {
    key: 'revenue',
    searchPaths: ['accountAnnualRevenueBand.value', 'accountAnnualRevenueBand.code'],
    sortPath: 'accountAnnualRevenueBand.value',
    type: 'text'
  }
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
