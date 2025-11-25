import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'

export interface Lead extends BaseEntity {
  academicTitle?: CatalogEntry // IRM | CRM
  academicTitleRef?: string // IRM / CRM
  accountAnnualRevenueBand?: CatalogEntry // IRM | TODO
  accountAnnualRevenueBandRef?: string // IRM / TODO
  activities?: any[] // IRM / CRM
  addressLine?: { lines: string[] } // IRM / CRM is string
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
  legalForm?: CatalogEntry // IRM / CRM
  legalFormRef?: string // IRM / CRM
  locality?: string // IRM / CRM
  notes?: any[] // IRM / CRM
  ownerEmployee?: Employee // IRM / CRM
  ownerEmployeeId?: string // IRM / CRM
  phoneNumber?: string // IRM / CRM
  jobPosition?: string // IRM / CRM
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

/**
 * Lead Query Field Mapping
 */
export const LeadFields = {
  academicTitle: 'academicTitle',
  academicTitleRef: 'academicTitleRef',
  accountAnnualRevenueBand: 'accountAnnualRevenueBand',
  accountAnnualRevenueBandRef: 'accountAnnualRevenueBandRef',
  activities: 'activities',
  addressLine: 'addressLine',
  code: 'code',
  companyEmail: 'companyEmail',
  companyName: 'companyName',
  companyPhone: 'companyPhone',
  companySize: 'companySize',
  companySizeRef: 'companySizeRef',
  companyWebsite: 'companyWebsite',
  conversionDate: 'conversionDate',
  convertedAccount: 'convertedAccount',
  convertedAccountId: 'convertedAccountId',
  convertedContact: 'convertedContact',
  convertedContactId: 'convertedContactId',
  convertedOpportunity: 'convertedOpportunity',
  convertedOpportunityId: 'convertedOpportunityId',
  country: 'country',
  countryRef: 'countryRef',
  description: 'description',
  documents: 'documents',
  email: 'email',
  firstName: 'firstName',
  id: 'id',
  industryClass: 'industryClass',
  industryClassRef: 'industryClassRef',
  lastName: 'lastName',
  leadRating: 'leadRating',
  leadRatingRef: 'leadRatingRef',
  leadSource: 'leadSource',
  leadSourceRef: 'leadSourceRef',
  leadStatus: 'leadStatus',
  leadStatusRef: 'leadStatusRef',
  legalForm: 'legalForm',
  legalFormRef: 'legalFormRef',
  locality: 'locality',
  notes: 'notes',
  ownerEmployee: 'ownerEmployee',
  ownerEmployeeId: 'ownerEmployeeId',
  phoneNumber: 'phoneNumber',
  jobPosition: 'position',
  postalCode: 'postalCode',
  region: 'region',
  regionRef: 'regionRef',
  rejectionReasons: 'rejectionReasons',
  salutation: 'salutation',
  salutationRef: 'salutationRef',
  sensitive: 'sensitive',
  sourceCompanyName: 'sourceCompanyName',
  sourceIndividualName: 'sourceIndividualName',
  tasks: 'tasks'
} as const

/**
 * Create Common Lead Descriptors with fields mapping
 */
export const createLeadDescriptors = (fields: Record<keyof typeof LeadFields, string> = LeadFields): Descriptor[] => [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'academicTitle',
    searchPaths: [`${fields.academicTitle}.value`, `${fields.academicTitle}.code`],
    sortPath: `${fields.academicTitle}.value`,
    type: 'text'
  },
  {
    key: 'accountAnnualRevenueBand',
    searchPaths: [`${fields.accountAnnualRevenueBand}.value`, `${fields.accountAnnualRevenueBand}.code`],
    sortPath: `${fields.accountAnnualRevenueBand}.value`,
    type: 'text'
  },
  {
    key: 'activities',
    searchPaths: [`${fields.activities}.title`, `${fields.activities}.description`],
    sortPath: `${fields.activities}.title`,
    type: 'text'
  },
  { key: 'addressLine', sortPath: fields.addressLine, type: 'text' },
  { key: 'code', searchPaths: [fields.code], sortPath: fields.code, type: 'text' },
  { key: 'companyEmail', searchPaths: [fields.companyEmail], sortPath: fields.companyEmail, type: 'text' },
  { key: 'companyName', searchPaths: [fields.companyName], sortPath: fields.companyName, type: 'text' },
  { key: 'companyPhone', searchPaths: [fields.companyPhone], sortPath: fields.companyPhone, type: 'text' },
  {
    key: 'companySize',
    searchPaths: [`${fields.companySize}.value`, `${fields.companySize}.code`],
    sortPath: `${fields.companySize}.value`,
    type: 'text'
  },
  { key: 'companyWebsite', searchPaths: [fields.companyWebsite], sortPath: fields.companyWebsite, type: 'text' },
  { key: 'conversionDate', searchPaths: [fields.conversionDate], sortPath: fields.conversionDate, type: 'date' },
  {
    key: 'convertedAccount',
    searchPaths: [`${fields.convertedAccount}.name`],
    sortPath: `${fields.convertedAccount}.name`,
    type: 'text'
  },
  {
    key: 'convertedContact',
    searchPaths: [`${fields.convertedContact}.firstName`, `${fields.convertedContact}.lastName`],
    sortPath: `${fields.convertedContact}.lastName`,
    type: 'text'
  },
  {
    key: 'convertedOpportunity',
    searchPaths: [`${fields.convertedOpportunity}.name`],
    sortPath: `${fields.convertedOpportunity}.name`,
    type: 'text'
  },
  {
    key: 'country',
    searchPaths: [`${fields.country}.value`, `${fields.country}.code`],
    sortPath: `${fields.country}.value`,
    type: 'text'
  },
  { key: 'description', searchPaths: [fields.description], sortPath: fields.description, type: 'text' },
  {
    key: 'documents',
    searchPaths: [`${fields.documents}.name`, `${fields.documents}.description`],
    sortPath: `${fields.documents}.name`,
    type: 'text'
  },
  { key: 'email', searchPaths: [fields.email], sortPath: fields.email, type: 'text' },
  { key: 'firstName', searchPaths: [fields.firstName], sortPath: fields.firstName, type: 'text' },
  {
    key: 'industryClass',
    searchPaths: [`${fields.industryClass}.value`, `${fields.industryClass}.code`],
    sortPath: `${fields.industryClass}.value`,
    type: 'text'
  },
  {
    key: 'legalForm',
    searchPaths: [`${fields.legalForm}.value`, `${fields.legalForm}.code`],
    sortPath: `${fields.legalForm}.value`,
    type: 'text'
  },
  { key: 'lastName', searchPaths: [fields.lastName], sortPath: fields.lastName, type: 'text' },
  {
    key: 'lead',
    searchPaths: [fields.firstName, fields.lastName, fields.companyName],
    sortPath: fields.firstName,
    type: 'text'
  },
  {
    key: 'leadRating',
    searchPaths: [`${fields.leadRating}.value`, `${fields.leadRating}.code`],
    sortPath: `${fields.leadRating}.value`,
    type: 'text'
  },
  {
    key: 'leadSource',
    searchPaths: [`${fields.leadSource}.value`, `${fields.leadSource}.code`],
    sortPath: `${fields.leadSource}.value`,
    type: 'text'
  },
  {
    key: 'leadStatus',
    searchPaths: [`${fields.leadStatus}.value`, `${fields.leadStatus}.code`],
    sortPath: `${fields.leadStatus}.value`,
    type: 'text'
  },
  {
    key: 'address',
    searchPaths: [fields.postalCode, fields.locality, `${fields.region}.value`, `${fields.country}.value`],
    sortPaths: [fields.postalCode, fields.locality, `${fields.region}.value`, `${fields.country}.value`],
    type: 'text'
  },
  { key: 'locality', searchPaths: [fields.locality], sortPath: fields.locality, type: 'text' },
  {
    key: 'notes',
    searchPaths: [`${fields.notes}.title`, `${fields.notes}.text`],
    sortPath: `${fields.notes}.title`,
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
  { key: 'phoneNumber', searchPaths: [fields.phoneNumber], sortPath: fields.phoneNumber, type: 'text' },
  { key: 'jobPosition', searchPaths: [fields.jobPosition], sortPath: fields.jobPosition, type: 'text' },
  { key: 'postalCode', searchPaths: [fields.postalCode], sortPath: fields.postalCode, type: 'text' },
  {
    key: 'region',
    searchPaths: [`${fields.region}.value`, `${fields.region}.code`],
    sortPath: `${fields.region}.value`,
    type: 'text'
  },
  {
    key: 'rejectionReasons',
    searchPaths: [`${fields.rejectionReasons}.rejectionReason.value`],
    sortPath: `${fields.rejectionReasons}.rejectionReason.value`,
    type: 'text'
  },
  {
    key: 'salutation',
    searchPaths: [`${fields.salutation}.value`, `${fields.salutation}.code`],
    sortPath: `${fields.salutation}.value`,
    type: 'text'
  },
  { key: 'sensitive', searchPaths: [fields.sensitive], sortPath: fields.sensitive, type: 'boolean' },
  {
    key: 'sourceCompanyName',
    searchPaths: [fields.sourceCompanyName],
    sortPath: fields.sourceCompanyName,
    type: 'text'
  },
  {
    key: 'sourceIndividualName',
    searchPaths: [fields.sourceIndividualName],
    sortPath: fields.sourceIndividualName,
    type: 'text'
  },
  {
    key: 'tasks',
    searchPaths: [`${fields.tasks}.name`, `${fields.tasks}.description`],
    sortPath: `${fields.tasks}.name`,
    type: 'text'
  },

  // Filter IDs
  { key: 'academicTitleIds', path: fields.academicTitleRef, kind: 'inIds' },
  { key: 'accountAnnualRevenueBandIds', path: fields.accountAnnualRevenueBandRef, kind: 'inIds' },
  { key: 'companySizeIds', path: fields.companySizeRef, kind: 'inIds' },
  {
    key: 'legalFormIds',
    path: fields.legalFormRef,
    filterLabel: 'Legal Form',
    optionSelectPaths: [`${fields.legalForm}.id`, `${fields.legalForm}.value`],
    optionSearchPaths: [`${fields.legalForm}.value`, `${fields.legalForm}.code`],
    optionDistinctOn: [fields.legalFormRef],
    kind: 'inIds'
  },
  { key: 'convertedAccountIds', path: fields.convertedAccountId, kind: 'inIds' },
  { key: 'convertedContactIds', path: fields.convertedContactId, kind: 'inIds' },
  { key: 'convertedOpportunityIds', path: fields.convertedOpportunityId, kind: 'inIds' },
  { key: 'countryIds', path: fields.countryRef, kind: 'inIds' },
  {
    key: 'industryClassIds',
    path: fields.industryClassRef,
    filterLabel: 'Industry',
    optionSelectPaths: [`${fields.industryClass}.id`, `${fields.industryClass}.value`],
    optionSearchPaths: [`${fields.industryClass}.value`, `${fields.industryClass}.code`],
    optionDistinctOn: [fields.industryClassRef],
    kind: 'inIds'
  },
  {
    key: 'leadRatingIds',
    path: fields.leadRatingRef,
    filterLabel: 'Rating',
    optionSelectPaths: [`${fields.leadRating}.id`, `${fields.leadRating}.value`],
    optionSearchPaths: [`${fields.leadRating}.value`, `${fields.leadRating}.code`],
    optionDistinctOn: [fields.leadRatingRef],
    kind: 'inIds'
  },
  {
    key: 'leadSourceIds',
    path: fields.leadSourceRef,
    filterLabel: 'Source',
    optionSelectPaths: [`${fields.leadSource}.id`, `${fields.leadSource}.value`],
    optionSearchPaths: [`${fields.leadSource}.value`, `${fields.leadSource}.code`],
    optionDistinctOn: [fields.leadSourceRef],
    kind: 'inIds'
  },
  {
    key: 'leadStatusIds',
    path: fields.leadStatusRef,
    filterLabel: 'Status',
    optionSelectPaths: [`${fields.leadStatus}.id`, `${fields.leadStatus}.value`],
    optionSearchPaths: [`${fields.leadStatus}.value`, `${fields.leadStatus}.code`],
    optionDistinctOn: [fields.leadStatusRef],
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
  { key: 'regionIds', path: fields.regionRef, kind: 'inIds' },
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
  { key: 'conversionDateFrom', path: fields.conversionDate, kind: 'dateFrom' },
  { key: 'conversionDateTo', path: fields.conversionDate, kind: 'dateTo' },

  // Composite display columns
  {
    key: 'communicationChannels',
    searchPaths: [fields.email, fields.phoneNumber, fields.companyWebsite],
    enableSort: false,
    type: 'text'
  }
]

/**
 * Lead Form Fields Configuration
 * Defines which fields to include in payload
 * Sorted alphabetically by sourceKey
 *
 * Transformations are handled automatically:
 * - Dates → ISO format
 * - Arrays → included only if not empty
 * - Objects → included only if not empty
 * - Primitives → string or undefined
 */
export const leadFormFields = {
  academicTitleRef: 'academicTitleRef',
  accountAnnualRevenueBandRef: 'accountAnnualRevenueBandRef',
  addressLine: 'addressLine',
  code: 'code',
  companyEmail: 'companyEmail',
  companyName: 'companyName',
  companyPhone: 'companyPhone',
  companySizeRef: 'companySizeRef',
  companyWebsite: 'companyWebsite',
  conversionDate: 'conversionDate',
  convertedAccountId: 'convertedAccountId',
  convertedContactId: 'convertedContactId',
  convertedOpportunityId: 'convertedOpportunityId',
  countryRef: 'countryRef',
  description: 'description',
  email: 'email',
  firstName: 'firstName',
  id: 'id',
  industryClassRef: 'industryClassRef',
  lastName: 'lastName',
  leadRatingRef: 'leadRatingRef',
  leadSourceRef: 'leadSourceRef',
  leadStatusRef: 'leadStatusRef',
  legalFormRef: 'legalFormRef',
  locality: 'locality',
  ownerEmployeeId: 'ownerEmployee',
  phoneNumber: 'phoneNumber',
  jobPosition: 'position',
  postalCode: 'postalCode',
  regionRef: 'regionRef',
  salutationRef: 'salutationRef',
  sensitive: 'sensitive',
  sourceCompanyName: 'sourceCompanyName',
  sourceIndividualName: 'sourceIndividualName',
  timeZoneRef: 'timeZoneRef',
  version: 'version'
} as const
