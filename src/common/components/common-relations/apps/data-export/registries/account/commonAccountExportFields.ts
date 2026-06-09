import type { Account } from '@/common/data/relations/types/accountTypes'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatCommunicationChannel,
  formatExportCatalog,
  formatExportDateValue,
  formatExportText,
  formatFirstAddressField,
  formatLinkedContactNames,
  formatOwnerEmployee,
  formatProspectiveCategory
} from '../../utils/exportFormatHelpers'
import {
  buildCodeExportField,
  buildOwnerEmployeeIdExportField,
  buildRecordIdExportField
} from '../../utils/exportExternalIdFieldBuilders'

/**
 * Export fields derived from account form segments (AccountInformation, CoreInformation, Address, Communication).
 * Excludes id, version, and picture binaries.
 */
export function buildCommonAccountExportFields<T extends Account = Account>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'name',
      label: 'Account Name',
      formKeys: ['name'],
      defaultSelected: true,
      format: account => formatExportText(account.name)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: account => formatOwnerEmployee(account.ownerEmployee)
    },
    {
      key: 'legalForm',
      label: 'Legal Form',
      formKeys: ['legalFormRef'],
      defaultSelected: false,
      format: account => formatExportCatalog(account.legalForm)
    },
    {
      key: 'industryClass',
      label: 'Industry',
      formKeys: ['industryClassRef'],
      defaultSelected: true,
      format: account => formatExportCatalog(account.industryClass)
    },
    {
      key: 'accountPriority',
      label: 'Priority',
      formKeys: ['accountPriorityRef'],
      defaultSelected: false,
      format: account => formatExportCatalog(account.accountPriority)
    },
    {
      key: 'website',
      label: 'Website',
      formKeys: ['website'],
      defaultSelected: true,
      format: account => formatExportText(account.website)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: account => formatExportText(account.description)
    },
    {
      key: 'companySize',
      label: 'Company Size',
      formKeys: ['companySizeRef'],
      defaultSelected: true,
      format: account => formatExportCatalog(account.companySize)
    },
    {
      key: 'accountAnnualRevenueBand',
      label: 'Revenue Band',
      formKeys: ['accountAnnualRevenueBandRef'],
      defaultSelected: true,
      format: account => formatExportCatalog(account.accountAnnualRevenueBand)
    },
    {
      key: 'foundationDate',
      label: 'Foundation Date',
      formKeys: ['foundationDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: account => formatExportDateValue(account.foundationDate)
    },
    {
      key: 'notesSummary',
      label: 'Notes Summary',
      formKeys: ['notesSummary'],
      defaultSelected: false,
      format: account => formatExportText(account.notesSummary)
    },
    {
      key: 'prospective',
      label: 'Category',
      formKeys: ['prospective'],
      defaultSelected: true,
      format: account => formatProspectiveCategory(account.prospective)
    },
    {
      key: 'email',
      label: 'Email',
      formKeys: ['communicationChannels'],
      defaultSelected: false,
      format: account => formatCommunicationChannel(account, CommunicationChannelCode.EMAIL)
    },
    {
      key: 'phone',
      label: 'Phone',
      formKeys: ['communicationChannels'],
      defaultSelected: false,
      format: account => formatCommunicationChannel(account, CommunicationChannelCode.PHONE)
    },
    {
      key: 'locality',
      label: 'City',
      formKeys: ['addresses'],
      defaultSelected: false,
      format: account => formatFirstAddressField(account, 'locality')
    },
    {
      key: 'postalCode',
      label: 'Postal Code',
      formKeys: ['addresses'],
      defaultSelected: false,
      format: account => formatFirstAddressField(account, 'postalCode')
    },
    {
      key: 'region',
      label: 'Region',
      formKeys: ['addresses'],
      defaultSelected: false,
      format: account => formatFirstAddressField(account, 'region')
    },
    {
      key: 'country',
      label: 'Country',
      formKeys: ['addresses'],
      defaultSelected: false,
      format: account => formatFirstAddressField(account, 'country')
    },
    {
      key: 'linkedContacts',
      label: 'Linked Contacts',
      formKeys: ['accountContacts'],
      defaultSelected: false,
      format: account => formatLinkedContactNames(account)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: account => formatExportDateValue(account.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: account => formatExportDateValue(account.updatedAt)
    },
    buildRecordIdExportField<T>('Account ID'),
    buildCodeExportField<T>(),
    buildOwnerEmployeeIdExportField<T>()
  ]
}
