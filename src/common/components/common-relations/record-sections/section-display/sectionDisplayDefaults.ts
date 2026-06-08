import type { RecordSectionDisplayConfigs } from './types'

export const SECTION_DISPLAY_I18N_KEYS = {
  accountInformationTitle: 'section-display-account-information-title',
  contactInformationTitle: 'section-display-contact-information-title',
  relatedAccountsTitle: 'section-display-related-accounts-title',
  relatedContactsTitle: 'section-display-related-contacts-title',
  noAccountDataTitle: 'section-display-no-account-data-title',
  noAccountDataDescription: 'section-display-no-account-data-description',
  noContactDataTitle: 'section-display-no-contact-data-title',
  noContactDataDescription: 'section-display-no-contact-data-description',
  noRelatedAccountsTitle: 'section-display-no-related-accounts-title',
  noRelatedAccountsDescription: 'section-display-no-related-accounts-description',
  noRelatedContactsTitle: 'section-display-no-related-contacts-title',
  noRelatedContactsDescription: 'section-display-no-related-contacts-description'
} as const

/** English fallbacks — single source of truth when translations are unavailable. */
export const SECTION_DISPLAY_DEFAULTS: RecordSectionDisplayConfigs = {
  accountInformation: {
    sectionTitle: 'Account Information',
    emptyStateTitle: 'No Account Data',
    emptyStateDescription:
      'No account data is available for this object. Update its details to see the information here.'
  },
  contactInformation: {
    sectionTitle: 'Contact Information',
    emptyStateTitle: 'No Contact Data',
    emptyStateDescription:
      'No contact data is available for this object. Update its details to see the information here.'
  },
  relatedAccounts: {
    sectionTitle: 'Related Accounts',
    emptyStateTitle: 'No Related Accounts',
    emptyStateDescription: 'No accounts are linked to this record yet.'
  },
  relatedContacts: {
    sectionTitle: 'Related Contacts',
    emptyStateTitle: 'No Related Contacts',
    emptyStateDescription: 'No contacts are linked to this record yet.'
  }
}
