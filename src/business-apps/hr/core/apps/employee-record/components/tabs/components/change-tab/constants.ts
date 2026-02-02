import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

// Use a function instead of module-level constant to avoid slow initialization
// This function is called at runtime (in useMemo), not at module load time
// This prevents getTranslationFromI18nKeyAndLabel from being called during module initialization
export const getFieldCategories = () => [
  {
    value: 'personal',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.categories.personal', 'Personal Data')
  },
  {
    value: 'address',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.categories.address', 'Address & Communication')
  },
  { value: 'org', label: getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.categories.org', 'Org Assignment') },
  {
    value: 'employment',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.employment', 'Employment')
  },
  {
    value: 'financial',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.categories.financial', 'Financial')
  },
  {
    value: 'skills',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.categories.skills', 'Skills & Capabilities')
  },
  {
    value: 'documents',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.documents', 'Documents')
  }
]
