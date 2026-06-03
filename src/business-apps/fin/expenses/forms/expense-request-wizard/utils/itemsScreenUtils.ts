import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'

type TranslateFn = (key: string, options?: Record<string, unknown>) => string
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
export const getMissingMandatoryFields = (item: any, t: TranslateFn): string[] => {
  const missing: string[] = []
  const positions: any[] = item?.expensePosition || []

  if (positions.length === 0) {
    missing.push(t('expense-group-label'), t('expense-type-label'), t('current-cost-center-label'))
    return missing
  }

  const allMissingGroup = positions.every(p => !p.expenseGroup)
  const allMissingType = positions.every(p => !p.expenseRuleGeneralExpense?.name)
  const allMissingCostCenter = positions.every(p => !p.costCenter?.name)

  if (allMissingGroup) {
    missing.push(t('expense-group-label'))
  }
  if (allMissingType) {
    missing.push(t('expense-type-label'))
  }
  if (allMissingCostCenter) {
    missing.push(t('current-cost-center-label'))
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
export const formatArrayOfItems = (arrayItems: any[], t: TranslateFn) => {
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
        expenseGroup: t('multiple-positions'),
        expenseType: '',
        costCenter: t('item-multiple')
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
        : t('no-expense-group'),
      expenseType: singularItemValue?.expenseType || '',
      costCenter: singularItemValue?.costCenter ? singularItemValue.costCenter : t('no-cost-center'),
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
