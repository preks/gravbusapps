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
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.accommodation', 'ACCOMMODATION')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.allowance', 'ALLOWANCE')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.equipment', 'EQUIPMENT')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.meal', 'MEAL')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.transport', 'TRANSPORT')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.mileage_caps', 'MILEAGE')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.other_transport', 'OTHER_TRANSPORT')

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.other', 'OTHER')

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
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.accommodations', 'Accommodations')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.allowances', 'Allowances')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.equipments', 'Equipments')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.meals', 'Meals')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.means_of_transport', 'Means of Transport')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.mileage', 'Mileage')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_categories.other_transport_costs',
        'Other Transport Costs'
      )

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:expense_categories.others', 'Others')

    default:
      return code
  }
}
