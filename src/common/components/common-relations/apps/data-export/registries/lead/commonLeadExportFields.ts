import type { Lead } from '@/common/data/relations/types/leadTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatAddressLine,
  formatExportBoolean,
  formatExportCatalog,
  formatExportDateValue,
  formatExportText,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import {
  buildCodeExportField,
  buildOwnerEmployeeIdExportField,
  buildRecordIdExportField
} from '../../utils/exportExternalIdFieldBuilders'

/**
 * Export fields derived from lead form segments (LeadInformation, LeadPerson, LeadCompany).
 * Excludes fields not bound on the lead form UI (e.g. salutationRef, description).
 */
export function buildCommonLeadExportFields<T extends Lead = Lead>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'firstName',
      label: 'First Name',
      formKeys: ['firstName'],
      defaultSelected: true,
      format: lead => formatExportText(lead.firstName)
    },
    {
      key: 'lastName',
      label: 'Last Name',
      formKeys: ['lastName'],
      defaultSelected: true,
      format: lead => formatExportText(lead.lastName)
    },
    {
      key: 'email',
      label: 'Email',
      formKeys: ['email'],
      defaultSelected: true,
      format: lead => formatExportText(lead.email)
    },
    {
      key: 'phoneNumber',
      label: 'Phone',
      formKeys: ['phoneNumber'],
      defaultSelected: true,
      format: lead => formatExportText(lead.phoneNumber)
    },
    {
      key: 'secondaryNumber',
      label: 'Secondary Phone',
      formKeys: ['secondaryNumber'],
      defaultSelected: false,
      format: lead => formatExportText(lead.secondaryNumber)
    },
    {
      key: 'companyName',
      label: 'Company',
      formKeys: ['companyName'],
      defaultSelected: true,
      format: lead => formatExportText(lead.companyName)
    },
    {
      key: 'jobPosition',
      label: 'Job Position',
      formKeys: ['jobPosition'],
      defaultSelected: true,
      format: lead => formatExportText(lead.jobPosition)
    },
    {
      key: 'linkedinUrl',
      label: 'LinkedIn URL',
      formKeys: ['linkedinUrl'],
      defaultSelected: false,
      format: lead => formatExportText(lead.linkedinUrl)
    },
    {
      key: 'leadStatus',
      label: 'Status',
      formKeys: ['leadStatusRef'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.leadStatus)
    },
    {
      key: 'leadRating',
      label: 'Rating',
      formKeys: ['leadRatingRef'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.leadRating)
    },
    {
      key: 'leadSource',
      label: 'Source',
      formKeys: ['leadSourceRef'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.leadSource)
    },
    {
      key: 'industryClass',
      label: 'Industry',
      formKeys: ['industryClassRef'],
      defaultSelected: true,
      format: lead => formatExportCatalog(lead.industryClass)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: lead => formatOwnerEmployee(lead.ownerEmployee)
    },
    {
      key: 'sensitive',
      label: 'Sensitive',
      formKeys: ['sensitive'],
      defaultSelected: false,
      format: lead => formatExportBoolean(lead.sensitive)
    },
    {
      key: 'academicTitle',
      label: 'Academic Title',
      formKeys: ['academicTitleRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.academicTitle)
    },
    {
      key: 'legalForm',
      label: 'Legal Form',
      formKeys: ['legalFormRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.legalForm)
    },
    {
      key: 'companyWebsite',
      label: 'Company Website',
      formKeys: ['companyWebsite'],
      defaultSelected: false,
      format: lead => formatExportText(lead.companyWebsite)
    },
    {
      key: 'companyEmail',
      label: 'Company Email',
      formKeys: ['companyEmail'],
      defaultSelected: false,
      format: lead => formatExportText(lead.companyEmail)
    },
    {
      key: 'companyPhone',
      label: 'Company Phone',
      formKeys: ['companyPhone'],
      defaultSelected: false,
      format: lead => formatExportText(lead.companyPhone)
    },
    {
      key: 'companySize',
      label: 'Company Size',
      formKeys: ['companySizeRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.companySize)
    },
    {
      key: 'accountAnnualRevenueBand',
      label: 'Annual Revenue',
      formKeys: ['accountAnnualRevenueBandRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.accountAnnualRevenueBand)
    },
    {
      key: 'addressLine',
      label: 'Address',
      formKeys: ['addressLine'],
      defaultSelected: false,
      format: lead => formatAddressLine(lead.addressLine)
    },
    {
      key: 'postalCode',
      label: 'Postal Code',
      formKeys: ['postalCode'],
      defaultSelected: false,
      format: lead => formatExportText(lead.postalCode)
    },
    {
      key: 'locality',
      label: 'City',
      formKeys: ['locality'],
      defaultSelected: false,
      format: lead => formatExportText(lead.locality)
    },
    {
      key: 'region',
      label: 'Region',
      formKeys: ['regionRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.region)
    },
    {
      key: 'country',
      label: 'Country',
      formKeys: ['countryRef'],
      defaultSelected: false,
      format: lead => formatExportCatalog(lead.country)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: lead => formatExportDateValue(lead.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: lead => formatExportDateValue(lead.updatedAt)
    },
    buildRecordIdExportField<T>('Lead ID'),
    buildCodeExportField<T>('Lead Code'),
    buildOwnerEmployeeIdExportField<T>()
  ]
}
