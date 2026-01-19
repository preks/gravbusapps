import { formatDate, formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ICONS } from '../../../utils/icons'
import { PLAN_TYPE_ENUM, DEFAULT_PLAN_CURRENCY_CODE } from '../constants/constants'
import { PLAN_TYPES } from '../../expense-plan/constants/constants'

/**
 * Find catalog entry by type code
 * @param typeNeeded - Type code to search for
 * @param expenseCatalogueData - Expense catalogue data
 * @returns Catalog entry object or empty object if not found
 */
export const getCatalogTypeTransformer = (typeNeeded: string, expenseCatalogueData: any): any => {
  try {
    const catalogValue =
      expenseCatalogueData?.expenseRequestType?.find((element: any) =>
        element.code.toLowerCase().includes(typeNeeded.toLowerCase())
      ) ?? {}
    return catalogValue
  } catch {
    return {}
  }
}

/**
 * Transform plan data into card data for display
 * @param planData - Plan data from API
 * @param expenseCatalogueData - Expense catalogue data
 * @param t - Translation function
 * @returns Transformed plan card data
 */
export const getPlanCardData = (planData: any, expenseCatalogueData: any): any => {
  if (!planData) return null

  let planTypeData: (typeof PLAN_TYPE_ENUM)[keyof typeof PLAN_TYPE_ENUM] = PLAN_TYPE_ENUM.TRIP
  try {
    if (expenseCatalogueData) {
      const expenseType = getCatalogTypeTransformer(PLAN_TYPES.EXPENSE, expenseCatalogueData)
      planTypeData = planData.requestTypeRef === expenseType?.id ? PLAN_TYPE_ENUM.EXPENSE : PLAN_TYPE_ENUM.TRIP
    } else {
      // Fallback without catalog: infer from presence of trip segments
      const hasTrips = Array.isArray(planData.expenseRequestTrip) && planData.expenseRequestTrip.length > 0
      planTypeData = hasTrips ? PLAN_TYPE_ENUM.TRIP : PLAN_TYPE_ENUM.EXPENSE
    }
  } catch {
    planTypeData = PLAN_TYPE_ENUM.EXPENSE as (typeof PLAN_TYPE_ENUM)[keyof typeof PLAN_TYPE_ENUM]
  }

  const amountFormated = formatNumberFunction(planData.totalAmount ? planData.totalAmount : 0)
  const paymentamountFormated = formatNumberFunction(planData.advancePaymentTotalAmount || 0)

  let cardDate = formatDate(planData.startDate, 'date.long') || ''
  cardDate += cardDate !== '' ? ' - ' : ''
  cardDate += formatDate(planData.endDate, 'date.long') || ''

  return {
    id: planData.id,
    planType: planTypeData,
    avatarImg: planTypeData === PLAN_TYPE_ENUM.EXPENSE ? ICONS.RECEIPT_ICON : ICONS.TRIP_ICON,
    avatarTitle:
      planTypeData === PLAN_TYPE_ENUM.EXPENSE
        ? getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.expense_select_button', 'Expense')
        : getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.trip_select_button', 'Trip'),
    title: planData.title || '',
    creationDate: planData.createdAt
      ? formatDate(planData.createdAt, 'date.long')
      : `${getTranslationFromI18nKeyAndLabel('lowcoder:expense_summary_request.no_creation_date', 'No creation date')}`,
    tripStart: planData.startDate || '',
    tripEnd: planData.endDate || '',
    tripInterval: cardDate || '',
    paymentAmount: paymentamountFormated || '',
    paymentCurrency: planData.currency && planData.currency.code ? planData.currency.code : DEFAULT_PLAN_CURRENCY_CODE,
    planCurrency: planData.currency && planData.currency.code ? planData.currency.code : DEFAULT_PLAN_CURRENCY_CODE,
    planAmount: amountFormated || ''
  }
}

/**
 * Transform all plans into card data
 * @param expenseCatalogueData - Expense catalogue data
 * @param t - Translation function
 * @returns Array of plan card data
 */
export const transformPlansToCardData = (expenseCatalogueData: any): any[] => {
  if (!expenseCatalogueData?.ExpensePlan) return []

  return expenseCatalogueData.ExpensePlan.map((plan: any) => getPlanCardData(plan, expenseCatalogueData))
}
