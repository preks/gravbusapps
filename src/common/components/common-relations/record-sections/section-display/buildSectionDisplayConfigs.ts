import { SECTION_DISPLAY_DEFAULTS, SECTION_DISPLAY_I18N_KEYS } from './sectionDisplayDefaults'
import type { RecordSectionDisplayConfigs, SectionDisplayConfig } from './types'

type TranslateFn = (key: string) => string

const translateWithFallback = (t: TranslateFn, key: string, fallback: string): string => {
  const value = t(key)
  if (!value || value === key) {
    return fallback
  }
  return value
}

const buildConfig = (
  t: TranslateFn,
  titleKey: keyof typeof SECTION_DISPLAY_I18N_KEYS,
  emptyTitleKey: keyof typeof SECTION_DISPLAY_I18N_KEYS,
  emptyDescriptionKey: keyof typeof SECTION_DISPLAY_I18N_KEYS,
  defaults: SectionDisplayConfig
): SectionDisplayConfig => ({
  sectionTitle: translateWithFallback(t, SECTION_DISPLAY_I18N_KEYS[titleKey], defaults.sectionTitle),
  emptyStateTitle: translateWithFallback(t, SECTION_DISPLAY_I18N_KEYS[emptyTitleKey], defaults.emptyStateTitle),
  emptyStateDescription: translateWithFallback(
    t,
    SECTION_DISPLAY_I18N_KEYS[emptyDescriptionKey],
    defaults.emptyStateDescription
  )
})

export const buildSectionDisplayConfigs = (t: TranslateFn): RecordSectionDisplayConfigs => ({
  accountInformation: buildConfig(
    t,
    'accountInformationTitle',
    'noAccountDataTitle',
    'noAccountDataDescription',
    SECTION_DISPLAY_DEFAULTS.accountInformation
  ),
  contactInformation: buildConfig(
    t,
    'contactInformationTitle',
    'noContactDataTitle',
    'noContactDataDescription',
    SECTION_DISPLAY_DEFAULTS.contactInformation
  ),
  relatedAccounts: buildConfig(
    t,
    'relatedAccountsTitle',
    'noRelatedAccountsTitle',
    'noRelatedAccountsDescription',
    SECTION_DISPLAY_DEFAULTS.relatedAccounts
  ),
  relatedContacts: buildConfig(
    t,
    'relatedContactsTitle',
    'noRelatedContactsTitle',
    'noRelatedContactsDescription',
    SECTION_DISPLAY_DEFAULTS.relatedContacts
  )
})
