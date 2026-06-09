import type { Contact } from '@/common/data/relations/types/contactTypes'
import { CommunicationChannelCode } from '@/common/data/relations/types/relationEnums'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import {
  formatCommunicationChannel,
  formatExportCatalog,
  formatExportDateValue,
  formatExportText,
  formatLinkedAccountNames,
  formatLinkedContactTypes,
  formatOwnerEmployee
} from '../../utils/exportFormatHelpers'
import {
  buildCodeExportField,
  buildOwnerEmployeeIdExportField,
  buildRecordIdExportField
} from '../../utils/exportExternalIdFieldBuilders'

/**
 * Export fields derived from contact form segments (ContactInformation, ContactDetails, Communication).
 * Excludes id, version, and picture binaries.
 */
export function buildCommonContactExportFields<T extends Contact = Contact>(): ExportFieldDefinition<T>[] {
  return [
    {
      key: 'firstName',
      label: 'First Name',
      formKeys: ['firstName'],
      defaultSelected: true,
      format: contact => formatExportText(contact.firstName)
    },
    {
      key: 'lastName',
      label: 'Last Name',
      formKeys: ['lastName'],
      defaultSelected: true,
      format: contact => formatExportText(contact.lastName)
    },
    {
      key: 'salutation',
      label: 'Salutation',
      formKeys: ['salutationRef'],
      defaultSelected: false,
      format: contact => formatExportCatalog(contact.salutation)
    },
    {
      key: 'academicTitle',
      label: 'Academic Title',
      formKeys: ['academicTitleRef'],
      defaultSelected: false,
      format: contact => formatExportCatalog(contact.academicTitle)
    },
    {
      key: 'language',
      label: 'Language',
      formKeys: ['languageRef'],
      defaultSelected: false,
      format: contact => formatExportCatalog(contact.language)
    },
    {
      key: 'email',
      label: 'Email',
      formKeys: ['communicationChannels'],
      defaultSelected: true,
      format: contact => formatCommunicationChannel(contact, CommunicationChannelCode.EMAIL)
    },
    {
      key: 'phone',
      label: 'Phone',
      formKeys: ['communicationChannels'],
      defaultSelected: true,
      format: contact => formatCommunicationChannel(contact, CommunicationChannelCode.PHONE)
    },
    {
      key: 'linkedinUrl',
      label: 'LinkedIn URL',
      formKeys: ['communicationChannels'],
      defaultSelected: false,
      format: contact => formatCommunicationChannel(contact, CommunicationChannelCode.LINKEDIN)
    },
    {
      key: 'xingUrl',
      label: 'Xing URL',
      formKeys: ['communicationChannels'],
      defaultSelected: false,
      format: contact => formatCommunicationChannel(contact, CommunicationChannelCode.XING)
    },
    {
      key: 'department',
      label: 'Department',
      formKeys: ['department'],
      defaultSelected: true,
      format: contact => formatExportText(contact.department)
    },
    {
      key: 'jobPosition',
      label: 'Job Position',
      formKeys: ['jobPosition'],
      defaultSelected: true,
      format: contact => formatExportText(contact.jobPosition)
    },
    {
      key: 'birthDate',
      label: 'Birth Date',
      formKeys: ['birthDate'],
      defaultSelected: false,
      isDateColumn: true,
      format: contact => formatExportDateValue(contact.birthDate)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: contact => formatExportText(contact.description)
    },
    {
      key: 'notesSummary',
      label: 'Notes Summary',
      formKeys: ['notesSummary'],
      defaultSelected: false,
      format: contact => formatExportText(contact.notesSummary)
    },
    {
      key: 'ownerEmployee',
      label: 'Owner',
      formKeys: ['ownerEmployeeId'],
      defaultSelected: true,
      format: contact => formatOwnerEmployee(contact.ownerEmployee)
    },
    {
      key: 'linkedAccounts',
      label: 'Linked Accounts',
      formKeys: ['accountContacts'],
      defaultSelected: false,
      format: contact => formatLinkedAccountNames(contact)
    },
    {
      key: 'contactTypes',
      label: 'Contact Types',
      formKeys: ['accountContacts'],
      defaultSelected: false,
      format: contact => formatLinkedContactTypes(contact)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: contact => formatExportDateValue(contact.createdAt)
    },
    {
      key: 'updatedAt',
      label: 'Updated Date',
      formKeys: [],
      defaultSelected: false,
      isDateColumn: true,
      format: contact => formatExportDateValue(contact.updatedAt)
    },
    buildRecordIdExportField<T>('Contact ID'),
    buildCodeExportField<T>(),
    buildOwnerEmployeeIdExportField<T>()
  ]
}
