export const getFieldCategories = (t: (key: string) => string) => [
  { value: 'personal', label: t('changelog-category-personal') },
  { value: 'address', label: t('changelog-category-address') },
  { value: 'org', label: t('changelog-category-org') },
  { value: 'employment', label: t('changelog-category-employment') },
  { value: 'financial', label: t('changelog-category-financial') },
  { value: 'skills', label: t('changelog-category-skills') },
  { value: 'documents', label: t('changelog-category-documents') }
]
