import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const FIELD_CATEGORIES = [
  { value: 'personal', label: getTranslationFromI18nKeyAndLabel('changelog.categories.personal', 'Personal Info') },
  { value: 'address', label: getTranslationFromI18nKeyAndLabel('changelog.categories.address', 'Address & Contact') },
  { value: 'org', label: getTranslationFromI18nKeyAndLabel('changelog.categories.org', 'Org Assignment') },
  { value: 'working', label: getTranslationFromI18nKeyAndLabel('changelog.categories.working', 'Working Conditions') },
  { value: 'financial', label: getTranslationFromI18nKeyAndLabel('changelog.categories.financial', 'Financial') },
  { value: 'skills', label: getTranslationFromI18nKeyAndLabel('changelog.categories.skills', 'Skills & Capabilities') },
  {
    value: 'performance',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.performance', 'Performance & Goals')
  },
  {
    value: 'absence',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.absence', 'Absence Entitlements')
  },
  {
    value: 'emergency',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.emergency', 'Emergency Contacts')
  }
]
