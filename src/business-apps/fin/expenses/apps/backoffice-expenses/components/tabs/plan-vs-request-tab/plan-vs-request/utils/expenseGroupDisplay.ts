import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Maps expense group codes to translated display names
 * @param expenseGroupCode - The expense group code (e.g., "ACCOMMODATION", "ALLOWANCE", "MEAL", etc.)
 * @returns Translated display name
 */
export const getExpenseGroupDisplayName = (expenseGroupCode: string): string => {
  const code = expenseGroupCode?.toUpperCase()

  switch (code) {
    case 'ACCOMMODATION':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.accommodation', '')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.allowance', '')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.equipment', '')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.meal', '')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.transport', '')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.mileage_caps', '')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.other_transport', '')

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.other', '')

    default:
      // Return the code itself if no translation is found
      return code
  }
}

/**
 * Maps expense group codes to translated plural display names
 * @param expenseGroupCode - The expense group code
 * @returns Translated plural display name
 */
export const getExpenseGroupPluralName = (expenseGroupCode: string): string => {
  const code = expenseGroupCode?.toUpperCase()

  switch (code) {
    case 'ACCOMMODATION':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.accommodations', '')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.allowances', '')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.equipments', '')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.meals', '')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.means_of_transport', '')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.mileage', '')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.other_transport_costs', '')

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.others', '')

    default:
      return code
  }
}

