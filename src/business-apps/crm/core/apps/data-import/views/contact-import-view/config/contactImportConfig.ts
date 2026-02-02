/**
 * Contact Import Configuration
 */

import { TargetFieldDefinition, ImportConfig } from '@/common/components/common-relations/apps/data-import/types'

export const contactTargetFields: TargetFieldDefinition[] = [
  // Personal Information
  { value: 'salutationRef', label: 'Salutation (Catalog)', type: 'catalog', catalog: 'Salutation' },
  { value: 'academicTitleRef', label: 'Academic Title (Catalog)', type: 'catalog', catalog: 'AcademicTitle' },
  { value: 'firstName', label: 'First Name', type: 'direct' },
  { value: 'lastName', label: 'Last Name', type: 'direct' },
  { value: 'birthDate', label: 'Birth Date', type: 'direct' },
  { value: 'jobPosition', label: 'Job Position', type: 'direct' },
  { value: 'department', label: 'Department', type: 'direct' },

  // Communication Channels (will be transformed into communicationChannels array)
  { value: 'email', label: 'Email', type: 'direct' },
  { value: 'phoneNumber', label: 'Phone Number', type: 'direct' },
  { value: 'mobileNumber', label: 'Mobile Number', type: 'direct' },
  { value: 'faxNumber', label: 'Fax Number', type: 'direct' },
  { value: 'linkedInUrl', label: 'LinkedIn URL', type: 'direct' },
  { value: 'xingUrl', label: 'Xing URL', type: 'direct' },
  { value: 'facebookUrl', label: 'Facebook URL', type: 'direct' },
  { value: 'instagramUrl', label: 'Instagram URL', type: 'direct' },
  { value: 'messengerUrl', label: 'Messenger URL', type: 'direct' },
  { value: 'websiteUrl', label: 'Website URL', type: 'direct' },
  { value: 'xUrl', label: 'X (Twitter) URL', type: 'direct' },
  { value: 'youtubeUrl', label: 'YouTube URL', type: 'direct' },
  { value: 'slackUrl', label: 'Slack URL', type: 'direct' },

  // Language
  { value: 'languageRef', label: 'Language (Catalog)', type: 'catalog', catalog: 'Language' },

  // Address/Location
  { value: 'addressLine', label: 'Address Line', type: 'direct' },
  { value: 'city', label: 'City', type: 'direct' },
  { value: 'postalCode', label: 'Postal Code', type: 'direct' },
  { value: 'countryRef', label: 'Country (Catalog)', type: 'catalog', catalog: 'Country' },
  { value: 'regionRef', label: 'Region (Catalog)', type: 'catalog', catalog: 'Region' },

  // Owner
  { value: 'ownerEmployeeId', label: 'Owner Employee ID', type: 'direct' },

  // Additional
  { value: 'type', label: 'Contact Type', type: 'direct' },
  { value: 'code', label: 'Contact Code', type: 'direct' },
  { value: 'description', label: 'Description', type: 'direct' },
  { value: 'notesSummary', label: 'Notes Summary', type: 'direct' }
]

export const contactImportConfig: ImportConfig = {
  entityType: 'contact',
  domain: 'customer',
  aiAgentName: 'ContactImportAnalyzer',
  targetFields: contactTargetFields,
  requiredCatalogs: ['Salutation', 'AcademicTitle', 'Language', 'Country']
}
