import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Maps expense group codes to translated display names
 * @param expenseGroupCode - The expense group code (e.g., "ACCOMMODATION", "ALLOWANCE", "MEAL", etc.)
 * @returns Translated display name
 */
export const getExpenseGroupDisplayName = (expenseGroupCode: string): string => {
  // Strip the ExpenseGroup:v1: prefix if present
  const code = expenseGroupCode?.replace(/^ExpenseGroup:v1:/i, '').toUpperCase()

  switch (code) {
    case 'ACCOMMODATION':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.accommodation', 'ACCOMMODATION')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.allowance', 'ALLOWANCE')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.equipment', 'EQUIPMENT')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.meal', 'MEAL')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.transport', 'TRANSPORT')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.mileage_caps', 'MILEAGE')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.other_transport', 'OTHER_TRANSPORT')

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.other', 'OTHER')

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
  // Strip the ExpenseGroup:v1: prefix if present
  const code = expenseGroupCode?.replace(/^ExpenseGroup:v1:/i, '').toUpperCase()

  switch (code) {
    case 'ACCOMMODATION':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.accommodations', 'Accommodations')

    case 'ALLOWANCE':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.allowances', 'Allowances')

    case 'EQUIPMENT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.equipments', 'Equipments')

    case 'MEAL':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.meals', 'Meals')

    case 'TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.means_of_transport', 'Means of Transport')

    case 'MILEAGE':
    case 'MILEAGE_CAPS':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.mileage', 'Mileage')

    case 'OTHER_TRANSPORT':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.other_transport_costs', 'Other Transport Costs')

    case 'OTHER':
      return getTranslationFromI18nKeyAndLabel('lowcoder:cards.others', 'Others')

    default:
      return code
  }
}
