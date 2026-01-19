import { formatDate, getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import { EVENTS } from '../../../utils/constants'

export const noAllowanceItemsFunction = (arrayOfItems: any[]) => {
  return arrayOfItems?.filter(
    element =>
      !(
        (element.expenseClassRef && element.expenseClassRef.toLowerCase().includes('allowance')) ||
        (element.expenseGroupRef && element.expenseGroupRef.toLowerCase().includes('allowance'))
      )
  )
}

/**
 * Function to get only allowance items from an array
 * @param arrayOfItems - Array of expense items
 * @returns Array containing only allowance items
 */
export const getAllowanceItemsFunction = (arrayOfItems: any[]) => {
  return arrayOfItems?.filter(
    element =>
      (element.expenseClassRef && element.expenseClassRef.toLowerCase().includes('allowance')) ||
      (element.expenseGroupRef && element.expenseGroupRef.toLowerCase().includes('allowance'))
  )
}

/**
 * Function to format array of items for display
 * @param arrayItems - Array of expense items
 * @returns Formatted array of items
 */
export const formatArrayOfItems = (arrayItems: any[]) => {
  return arrayItems?.map(element => {
    return {
      id: element.id,
      title: element.title,
      date: element.expenseDate,
      amount: element.totalAmount,
      currency: element.currency.code,
      expenseGroup: element?.expenseGroup
        ? getCatalogValue(element.expenseGroup) || element.expenseGroup
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_item_request_card.no_expense_group',
            'No expense group'
          ) || '',
      expenseType: element?.expenseRuleGeneralExpense?.name || '',
      costCenter: element?.costCenter
        ? element.costCenter.name
        : getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.no_cost_center', 'No Cost Center') ||
          '',
      attachmentDate:
        element.expenseItemFile?.length > 0 ? formatDate(element?.expenseItemFile[0]?.createdAt, 'date.long') : '',
      totalAdvancePayment: 0
    }
  })
}

/**
 * Creates a log object for the ItemsScreen button events
 * @param initialPlan - The initial expense plan data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense plan
 * @param currentCurrency - The current currency from context
 * @param expenseItems - The expense items array
 * @param expensePlanData - The full expense plan data
 * @param event - The event type (NEXT, SAVE, etc.)
 * @returns Log object for analytics
 */
export const createItemsScreenLogObject = (
  initialPlan: any,
  employeeRuleId: string | null,
  currentTitle: string,
  currentCurrency: string | null,
  expenseItems: any[],
  expensePlanData: any,
  event: string,
  skipStep: boolean
) => {
  const initialAdvancePayment =
    initialPlan.advancePayment && initialPlan.advancePayment.length > 0 ? initialPlan.advancePayment[0] : null
  const expenseItemsArray = expenseItems
    .map(item => ({
      id: item.id,
      version: item.version,
      code: item.code || '',
      title: item.title || '',
      ruleId: item.expenseRuleId || '',
      expensePlan: initialPlan?.id || '',
      costCenter: item.costCenterId || '',
      project: item.projectId || '',
      expenseGroupRef: item.expenseGroupRef || '',
      source: item.source || '',
      expenseClassRef: item.expenseClassRef || '',
      autoCalculated: item.autoCalculated || false
    }))
    .concat(
      getAllowanceItemsFunction(expensePlanData?.ExpensePlanItem || []).map(item => ({
        id: item.id,
        version: item.version,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expensePlan: initialPlan?.id || '',
        costCenter: item.costCenterId || '',
        project: item.projectId || '',
        expenseGroupRef: item.expenseGroupRef || '',
        source: item.source || '',
        expenseClassRef: item.expenseClassRef || '',
        autoCalculated: item.autoCalculated || false
      }))
    )
  return {
    stepKey: SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + event + (skipStep ? '_' + EVENTS.SKIP : ''),
    event: event,
    expensePlan: {
      id: initialPlan?.id,
      startDate: initialPlan?.startDate || '',
      endDate: initialPlan?.endDate || '',
      expenseRule: employeeRuleId || '',
      version: initialPlan?.version || 0,
      costCenter: initialPlan?.costCenterId || '',
      employee: initialPlan?.employeeId || '',
      title: currentTitle || initialPlan?.title || '',
      status: initialPlan?.status,
      planDate: initialPlan?.planDate ? dayjs(initialPlan.planDate).format('YYYY-MM-DD') : '',
      requestTypeRef: initialPlan?.requestTypeRef,
      additionalProperties: initialPlan?.additionalProperties,
      currencyRef: initialPlan?.currency?.id || currentCurrency || '',
      description: initialPlan.description || '',
      totalAmount: initialPlan?.totalAmount,
      project: initialPlan?.project?.id || '',
      decisionDate: initialPlan?.decisionDate || ''
    },
    advancePayment: initialAdvancePayment
      ? {
          id: initialAdvancePayment.id,
          version: initialAdvancePayment.version,
          currencyRef: initialAdvancePayment.currencyRef,
          amount: initialAdvancePayment.amount,
          paymentMethod: initialAdvancePayment.paymentMethod,
          status: initialAdvancePayment.status,
          expensePlan: initialAdvancePayment.expensePlanId,
          costCenter: initialAdvancePayment.costCenterId
        }
      : null,
    expensePlanItems: {
      planItems: expenseItemsArray
    },
    expensePlanTrips: {
      expenseTrips: expensePlanData?.ExpensePlanByPk?.expenseRequestTrip || []
    }
  }
}
