export interface SectionDisplayConfig {
  sectionTitle: string
  emptyStateTitle: string
  emptyStateDescription: string
}

export interface RecordSectionDisplayConfigs {
  accountInformation: SectionDisplayConfig
  contactInformation: SectionDisplayConfig
  relatedAccounts: SectionDisplayConfig
  relatedContacts: SectionDisplayConfig
}
