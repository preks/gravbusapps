type TranslateFn = (key: string) => string

/**
 * Maps expense group codes to translated plural display names.
 * Accepts a `t` function from `useTranslation` so it can be used outside React components.
 */
export const getExpenseGroupPluralName = (expenseGroupCode: string, t: TranslateFn): string => {
  const code = expenseGroupCode?.replace(/^ExpenseGroup:v1:/i, '').toUpperCase()

  switch (code) {
    case 'ACCOMMODATION':
      return t('category-accommodations')

    case 'ALLOWANCE':
      return t('category-allowances')

    case 'EQUIPMENT':
      return t('category-equipments')

    case 'MEAL':
      return t('category-meals')

    case 'TRANSPORT':
      return t('category-means-of-transport')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return t('category-mileage')

    case 'OTHER_TRANSPORT':
      return t('category-other-transport-costs')

    case 'OTHER':
      return t('category-others')

    default:
      return code
  }
}
