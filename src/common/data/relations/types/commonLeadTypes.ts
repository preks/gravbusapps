import type { BaseEntity, CatalogEntry } from '@/common/network/graphql/commonTypes'
import { BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface CommonLead extends BaseEntity {
  academicTitle?: CatalogEntry // IRM | CRM
  academicTitleRef?: string // IRM / CRM
  accountAnnualRevenueBand?: CatalogEntry // IRM | TODO
  accountAnnualRevenueBandRef?: string // IRM / TODO
  activities?: any[] // IRM / CRM
  addressLine?: string | { lines: string[] } | any // IRM / CRM is string
  code?: string // IRM / CRM
  companyEmail?: string // IRM / CRM
  companyName?: string // IRM / CRM
  companyPhone?: string // IRM / CRM
  companySize?: CatalogEntry // IRM / TODO (numberOfEmployees)
  companySizeRef?: string // IRM / TODO (numberOfEmployeesRef)
  companyWebsite?: string // IRM / CRM
  conversionDate?: string // IRM / CRM
  convertedAccount?: any // IRM / CRM
  convertedAccountId?: string // IRM / CRM
  convertedContact?: any // IRM / CRM
  convertedContactId?: string
  convertedOpportunity?: any // IRM / CRM
  convertedOpportunityId?: string // IRM / CRM
  country?: CatalogEntry // IRM / CRM
  countryRef?: string // IRM / CRM
  description?: string // IRM / CRM
  documents?: any[] // IRM / CRM
  email?: string // IRM / CRM
  firstName?: string // IRM / CRM
  id: string
  industryClass?: CatalogEntry // IRM / TODO (industry)
  industryClassRef?: string // IRM / TODO (industryRef)
  lastName?: string // IRM / CRM
  leadRating?: CatalogEntry // IRM / CRM
  leadRatingRef?: string // IRM / CRM
  leadSource?: CatalogEntry // IRM / CRM
  leadSourceRef?: string // IRM / CRM
  leadStatus?: CatalogEntry // IRM / CRM
  leadStatusRef?: string // IRM / CRM
  locality?: string // IRM / TODO (city)
  notes?: any[] // IRM / CRM
  ownerEmployee?: Employee // IRM / CRM
  ownerEmployeeId?: string // IRM / CRM
  phoneNumber?: string // IRM / CRM
  position?: string // IRM / CRM
  postalCode?: string // IRM / CRM
  region?: CatalogEntry // IRM / CRM
  regionRef?: string // IRM / CRM
  rejectionReasons?: any[] // IRM / TODO (missing)
  salutation?: CatalogEntry // IRM / CRM
  salutationRef?: string // IRM / CRM
  sensitive?: boolean // IRM / CRM
  sourceCompanyName?: string // IRM / CRM
  sourceIndividualName?: string // IRM / CRM
  tasks?: any[] // IRM / CRM
}

export const COMMON_LEAD_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'academicTitle',
    searchPaths: ['academicTitle.value', 'academicTitle.code'],
    sortPath: 'academicTitle.value',
    type: 'text'
  },
  { key: 'academicTitleRef', searchPaths: ['academicTitleRef'], sortPath: 'academicTitleRef', type: 'text' },
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
    key: 'activities',
    searchPaths: ['activities.title', 'activities.description'],
    sortPath: 'activities.title',
    type: 'text'
  },
  { key: 'addressLine', searchPaths: ['addressLine'], sortPath: 'addressLine', type: 'text' },
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'companyEmail', searchPaths: ['companyEmail'], sortPath: 'companyEmail', type: 'text' },
  { key: 'companyName', searchPaths: ['companyName'], sortPath: 'companyName', type: 'text' },
  { key: 'companyPhone', searchPaths: ['companyPhone'], sortPath: 'companyPhone', type: 'text' },
  {
    key: 'companySize',
    searchPaths: ['companySize.value', 'companySize.code'],
    sortPath: 'companySize.value',
    type: 'text'
  },
  { key: 'companySizeRef', searchPaths: ['companySizeRef'], sortPath: 'companySizeRef', type: 'text' },
  { key: 'companyWebsite', searchPaths: ['companyWebsite'], sortPath: 'companyWebsite', type: 'text' },
  { key: 'conversionDate', searchPaths: ['conversionDate'], sortPath: 'conversionDate', type: 'date' },
  { key: 'convertedAccount', searchPaths: ['convertedAccount.name'], sortPath: 'convertedAccount.name', type: 'text' },
  { key: 'convertedAccountId', searchPaths: ['convertedAccountId'], sortPath: 'convertedAccountId', type: 'text' },
  {
    key: 'convertedContact',
    searchPaths: ['convertedContact.firstName', 'convertedContact.lastName'],
    sortPath: 'convertedContact.lastName',
    type: 'text'
  },
  { key: 'convertedContactId', searchPaths: ['convertedContactId'], sortPath: 'convertedContactId', type: 'text' },
  {
    key: 'convertedOpportunity',
    searchPaths: ['convertedOpportunity.name'],
    sortPath: 'convertedOpportunity.name',
    type: 'text'
  },
  {
    key: 'convertedOpportunityId',
    searchPaths: ['convertedOpportunityId'],
    sortPath: 'convertedOpportunityId',
    type: 'text'
  },
  {
    key: 'country',
    searchPaths: ['country.value', 'country.code'],
    sortPath: 'country.value',
    type: 'text'
  },
  { key: 'countryRef', searchPaths: ['countryRef'], sortPath: 'countryRef', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  {
    key: 'documents',
    searchPaths: ['documents.name', 'documents.description'],
    sortPath: 'documents.name',
    type: 'text'
  },
  { key: 'email', searchPaths: ['email'], sortPath: 'email', type: 'text' },
  { key: 'firstName', searchPaths: ['firstName'], sortPath: 'firstName', type: 'text' },
  { key: 'id', searchPaths: ['id'], sortPath: 'id', type: 'text' },
  {
    key: 'industryClass',
    searchPaths: ['industryClass.value', 'industryClass.code'],
    sortPath: 'industryClass.value',
    type: 'text'
  },
  { key: 'industryClassRef', searchPaths: ['industryClassRef'], sortPath: 'industryClassRef', type: 'text' },
  { key: 'lastName', searchPaths: ['lastName'], sortPath: 'lastName', type: 'text' },
  {
    key: 'lead',
    searchPaths: ['firstName', 'lastName', 'companyName'],
    sortPath: 'firstName',
    type: 'text'
  },
  {
    key: 'leadRating',
    searchPaths: ['leadRating.value', 'leadRating.code'],
    sortPath: 'leadRating.value',
    type: 'text'
  },
  { key: 'leadRatingRef', searchPaths: ['leadRatingRef'], sortPath: 'leadRatingRef', type: 'text' },
  {
    key: 'leadSource',
    searchPaths: ['leadSource.value', 'leadSource.code'],
    sortPath: 'leadSource.value',
    type: 'text'
  },
  { key: 'leadSourceRef', searchPaths: ['leadSourceRef'], sortPath: 'leadSourceRef', type: 'text' },
  {
    key: 'leadStatus',
    searchPaths: ['leadStatus.value', 'leadStatus.code'],
    sortPath: 'leadStatus.value',
    type: 'text'
  },
  { key: 'leadStatusRef', searchPaths: ['leadStatusRef'], sortPath: 'leadStatusRef', type: 'text' },
  {
    key: 'address',
    searchPaths: ['addressLine', 'postalCode', 'locality', 'region.value', 'country.value'],
    sortPaths: ['addressLine.lines[0]', 'postalCode', 'locality', 'region.value', 'country.value'],
    type: 'text'
  },
  { key: 'locality', searchPaths: ['locality'], sortPath: 'locality', type: 'text' },
  { key: 'notes', searchPaths: ['notes.subject', 'notes.content'], sortPath: 'notes.subject', type: 'text' },
  {
    key: 'ownerEmployee',
    searchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    sortPath: 'ownerEmployee.displayName',
    type: 'text'
  },
  { key: 'ownerEmployeeId', searchPaths: ['ownerEmployeeId'], sortPath: 'ownerEmployeeId', type: 'text' },
  { key: 'phoneNumber', searchPaths: ['phoneNumber'], sortPath: 'phoneNumber', type: 'text' },
  { key: 'position', searchPaths: ['position'], sortPath: 'position', type: 'text' },
  { key: 'postalCode', searchPaths: ['postalCode'], sortPath: 'postalCode', type: 'text' },
  {
    key: 'region',
    searchPaths: ['region.value', 'region.code'],
    sortPath: 'region.value',
    type: 'text'
  },
  { key: 'regionRef', searchPaths: ['regionRef'], sortPath: 'regionRef', type: 'text' },
  {
    key: 'rejectionReasons',
    searchPaths: ['rejectionReasons.reason'],
    sortPath: 'rejectionReasons.reason',
    type: 'text'
  },
  {
    key: 'salutation',
    searchPaths: ['salutation.value', 'salutation.code'],
    sortPath: 'salutation.value',
    type: 'text'
  },
  { key: 'salutationRef', searchPaths: ['salutationRef'], sortPath: 'salutationRef', type: 'text' },
  { key: 'sensitive', searchPaths: ['sensitive'], sortPath: 'sensitive', type: 'boolean' },
  { key: 'sourceCompanyName', searchPaths: ['sourceCompanyName'], sortPath: 'sourceCompanyName', type: 'text' },
  {
    key: 'sourceIndividualName',
    searchPaths: ['sourceIndividualName'],
    sortPath: 'sourceIndividualName',
    type: 'text'
  },
  { key: 'tasks', searchPaths: ['tasks.subject', 'tasks.description'], sortPath: 'tasks.subject', type: 'text' },

  // Filter IDs
  { key: 'academicTitleIds', path: 'academicTitleRef', kind: 'inIds' },
  { key: 'accountAnnualRevenueBandIds', path: 'accountAnnualRevenueBandRef', kind: 'inIds' },
  { key: 'companySizeIds', path: 'companySizeRef', kind: 'inIds' },
  { key: 'countryIds', path: 'countryRef', kind: 'inIds' },
  { key: 'industryClassIds', path: 'industryClassRef', kind: 'inIds' },
  { key: 'leadRatingIds', path: 'leadRatingRef', kind: 'inIds' },
  { key: 'leadSourceIds', path: 'leadSourceRef', kind: 'inIds' },
  { key: 'leadStatusIds', path: 'leadStatusRef', kind: 'inIds' },
  { key: 'ownerEmployeeIds', path: 'ownerEmployeeId', kind: 'inIds' },
  { key: 'regionIds', path: 'regionRef', kind: 'inIds' },
  { key: 'salutationIds', path: 'salutationRef', kind: 'inIds' },

  // Date range filters
  { key: 'conversionDateAfter', path: 'conversionDate', kind: 'dateFrom' },
  { key: 'conversionDateBefore', path: 'conversionDate', kind: 'dateTo' },

  // Composite display columns (not sortable)
  // communicationChannels: Displays email, phoneNumber, companyWebsite - not sortable
  {
    key: 'communicationChannels',
    searchPaths: ['email', 'phoneNumber', 'companyWebsite'],
    enableSort: false,
    type: 'text'
  },

  // address: Displays addressLine, locality, postalCode, region, country - not sortable
  { key: 'address', searchPaths: ['locality', 'postalCode', 'addressLine'], enableSort: false, type: 'text' }
]

//TODO: REPLACE WITH DESCRIPTOR INTERFACE
interface FilterOption {
  id: string
  label: string
}
//TODO: REPLACE WITH DESCRIPTOR INTERFACE
export interface CommonLeadFilters {
  // Standard catalog-based filters
  owners: FilterOption[]
  salutations: FilterOption[]
  sources: FilterOption[]
  statuses: FilterOption[]
  ratings: FilterOption[]
  industries: FilterOption[]

  // Loading state
  isLoading: boolean

  // Total counts for pagination
  totalCounts?: {
    owners?: number
    salutations?: number
    sources?: number
    statuses?: number
    ratings?: number
    industries?: number
  }

  // Lifecycle functions
  prefetchFilters?: () => Promise<void>

  // Search functions (individual per filter group)
  searchOwners?: (query: string) => Promise<FilterOption[]>
  searchSalutations?: (query: string) => Promise<FilterOption[]>
  searchSources?: (query: string) => Promise<FilterOption[]>
  searchStatuses?: (query: string) => Promise<FilterOption[]>
  searchRatings?: (query: string) => Promise<FilterOption[]>
  searchIndustries?: (query: string) => Promise<FilterOption[]>

  // Load more functions (pagination)
  loadMoreOwners?: () => Promise<void>
  loadMoreSalutations?: () => Promise<void>
  loadMoreSources?: () => Promise<void>
  loadMoreStatuses?: () => Promise<void>
  loadMoreRatings?: () => Promise<void>
  loadMoreIndustries?: () => Promise<void>
}
