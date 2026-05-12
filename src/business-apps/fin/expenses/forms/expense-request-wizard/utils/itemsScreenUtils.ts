import { formatDate, getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import dayjs from 'dayjs'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import {
  applyEffectiveCostCenterToRows,
  resolveInheritedOrSelectedCostCenterId,
  resolveItemCostCenterId,
  resolveMainCostCenterId
} from '../../shared/utils/effectiveCostCenter'

/**
 * Returns the list of mandatory field labels that are missing on a raw expense item.
 * Used to show a warning on the card so the user knows to edit before adding to the request.
 */
export const getMissingMandatoryFields = (item: any): string[] => {
  const missing: string[] = []
  const positions: any[] = item?.expensePosition || []

  if (positions.length === 0) {
    missing.push(
      getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.expense_group', 'Expense group'),
      getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.expense_type', 'Expense type'),
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_label',
        'Cost center'
      )
    )
    return missing
  }

  const allMissingGroup = positions.every(p => !p.expenseGroup)
  const allMissingType = positions.every(p => !p.expenseRuleGeneralExpense?.name)
  const allMissingCostCenter = positions.every(p => !p.costCenter?.name)

  if (allMissingGroup) {
    missing.push(getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.expense_group', 'Expense group'))
  }
  if (allMissingType) {
    missing.push(getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.expense_type', 'Expense type'))
  }
  if (allMissingCostCenter) {
    missing.push(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:initiate_expense_plan.create_expense_plan.cost_center_select_label',
        'Cost center'
      )
    )
  }

  return missing
}

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
  return arrayItems.map(element => {
    const positionArray = element.expensePosition
    let singularItemValue = { expenseGroup: '', expenseType: '', costCenter: '' }

    if (positionArray.length < 2 && positionArray.length !== 0) {
      singularItemValue = {
        expenseGroup: positionArray[0].expenseGroup,
        expenseType: positionArray[0].expenseRuleGeneralExpense?.name ?? '',
        costCenter: positionArray[0].costCenter?.name ?? ''
      }
    } else {
      singularItemValue = {
        expenseGroup: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_item_request_card.multiple_positions',
          'Multiple Positions'
        ),
        expenseType: '',
        costCenter: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.multiple', 'Multiple')
      }
    }

    return {
      id: element.id,
      version: element.version,
      title: element.title,
      date: element.expenseDate,
      amount: element.totalAmount,
      currency: element.currency.code,
      expenseGroup: singularItemValue?.expenseGroup
        ? getCatalogValue(singularItemValue.expenseGroup) || singularItemValue.expenseGroup
        : getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_item_request_card.no_expense_group',
            'No expense group'
          ) || '',
      expenseType: singularItemValue?.expenseType || '',
      costCenter: singularItemValue?.costCenter
        ? singularItemValue.costCenter
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
 * @param initialRequest - The initial expense request data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense request
 * @param currentCurrency - The current currency from context
 * @param expenseItems - The expense items array
 * @param expenseRequestData - The full expense request data
 * @param event - The event type (NEXT, SAVE, etc.)
 * @returns Log object for analytics
 */
export const createItemsScreenLogObject = (
  initialRequest: any,
  employeeRuleId: string | null,
  currentTitle: string,
  currentCurrency: string | null,
  expenseItems: any[],
  expenseRequestData: any,
  event: string
) => {
  const effectiveCostCenterId = resolveMainCostCenterId(
    expenseRequestData?.EmployeePosition,
    initialRequest?.costCenterId || '',
    initialRequest?.additionalProperties
  )
  const expenseItemsArray = expenseItems
    .map(item => ({
      id: item.id,
      version: item.version,
      code: item.code || '',
      title: item.title || '',
      ruleId: item.expenseRuleId || '',
      expenseRequest: initialRequest?.id || '',
      costCenter: resolveItemCostCenterId(item, effectiveCostCenterId, initialRequest?.costCenterId || ''),
      project: item.projectId || '',
      expenseGroupRef: item.expenseGroupRef || '',
      source: item.source || '',
      expenseClassRef: item.expenseClassRef || '',
      autoCalculated: item.autoCalculated || false
    }))
    .concat(
      getAllowanceItemsFunction(expenseRequestData?.ExpenseItem || []).map(item => ({
        id: item.id,
        version: item.version,
        code: item.code || '',
        title: item.title || '',
        ruleId: item.expenseRuleId || '',
        expenseRequest: initialRequest?.id || '',
        costCenter: resolveItemCostCenterId(item, effectiveCostCenterId, initialRequest?.costCenterId || ''),
        project: item.projectId || '',
        expenseGroupRef: item.expenseGroupRef || '',
        source: item.source || '',
        expenseClassRef: item.expenseClassRef || '',
        autoCalculated: item.autoCalculated || false
      }))
    )
  const travelBreakdowns: any[] = (expenseRequestData?.TravelBreakdown || []).map((item: any) => ({
    id: item.id,
    version: item.version,
    breakfast: item.breakfast,
    lunch: item.lunch,
    dinner: item.dinner,
    overnight: item.overnight,
    expenseDate: item.expenseDate,
    travelRegionRef: item.travelRegionRef,
    project: item.projectId,
    expenseRule: item.expenseRuleId,
    expenseRequest: initialRequest?.id,
    costCenter: resolveInheritedOrSelectedCostCenterId(
      item.costCenterId,
      effectiveCostCenterId,
      initialRequest?.costCenterId || ''
    )
  }))
  return {
    stepKey: SCREEN_NAMES_ENUM.ITEMS_TAB + '_' + event,
    event: event,
    expenseRequest: {
      id: initialRequest?.id,
      startDate: initialRequest?.startDate || '',
      endDate: initialRequest?.endDate || '',
      expenseRule: employeeRuleId || '',
      version: initialRequest?.version || 0,
      costCenter: effectiveCostCenterId,
      employee: initialRequest?.employeeId || '',
      expensePlan: initialRequest?.expensePlanId || '',
      title: currentTitle || initialRequest?.title || '',
      status: initialRequest?.status,
      requestDate: initialRequest?.requestDate ? dayjs(initialRequest.requestDate).format('YYYY-MM-DD') : '',
      requestTypeRef: initialRequest?.requestTypeRef,
      additionalProperties: initialRequest?.additionalProperties,
      currencyRef: initialRequest?.currency?.id || currentCurrency || '',
      overnightAccommodation: !!expenseRequestData?.ExpenseRequestByPk?.overnightAccommodation
    },
    expenseRequestItems: {
      expenseItems: expenseItemsArray
    },
    expenseRequestTrips: {
      expenseTrips: applyEffectiveCostCenterToRows(
        expenseRequestData?.ExpenseRequestByPk?.expenseRequestTrip,
        effectiveCostCenterId
      )
    },
    travelBreakdownWrapper: {
      travelBreakdowns: travelBreakdowns
    }
  }
}
