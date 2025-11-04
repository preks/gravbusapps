import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const FIELD_CATEGORIES = [
  { value: 'personal', label: getTranslationFromI18nKeyAndLabel('changelog.categories.personal', 'Personal Data') },
  {
    value: 'address',
    label: getTranslationFromI18nKeyAndLabel('changelog.categories.address', 'Address & Communication')
  },
  { value: 'org', label: getTranslationFromI18nKeyAndLabel('changelog.categories.org', 'Org Assignment') },
  { value: 'employment', label: getTranslationFromI18nKeyAndLabel('changelog.categories.employment', 'Employment') },
  { value: 'financial', label: getTranslationFromI18nKeyAndLabel('changelog.categories.financial', 'Financial') },
  { value: 'skills', label: getTranslationFromI18nKeyAndLabel('changelog.categories.skills', 'Skills & Capabilities') },
  { value: 'documents', label: getTranslationFromI18nKeyAndLabel('changelog.categories.documents', 'Documents') }
]
