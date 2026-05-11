import { SCREEN_NAMES_ENUM } from '../constants/constants'
import dayjs from 'dayjs'
import {
  applyEffectiveCostCenterToRows,
  MANUAL_MAIN_COST_CENTER_ID_KEY,
  resolveInheritedOrSelectedCostCenterId,
  resolveItemCostCenterId,
  resolveMainCostCenterId
} from '../../shared/utils/effectiveCostCenter'

interface ExpenseItem {
  id: any
  version: string | number
  code: string
  title: string
  ruleId?: string
  expenseRuleId?: string
  expenseRequest: string
  costCenterId?: string
  projectId?: string
}

/**
 * Creates a log object for the SummaryScreen button events
 * @param initialRequest - The initial expense request data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense request
 * @param expenseRequestData - The full expense request data
 * @param event - The event type (SAVE, SUBMIT, etc.)
 * @returns Log object for analytics
 */
export const createSummaryScreenLogObject = (
  initialRequest: any,
  employeeRuleId: string | null,
  currentTitle: string,
  expenseRequestData: any,
  event: string,
  mainCostCenterId?: string,
  manualMainCostCenterId?: string
) => {
  const effectiveCostCenterId =
    mainCostCenterId ||
    resolveMainCostCenterId(
      expenseRequestData?.EmployeePosition,
      initialRequest?.costCenterId || '',
      initialRequest?.additionalProperties
    )
  const additionalProperties: Record<string, any> = { ...(initialRequest?.additionalProperties || {}) }
  if (manualMainCostCenterId !== undefined) {
    if (manualMainCostCenterId) {
      additionalProperties[MANUAL_MAIN_COST_CENTER_ID_KEY] = manualMainCostCenterId
    } else {
      delete additionalProperties[MANUAL_MAIN_COST_CENTER_ID_KEY]
    }
  }
  const expenseItemsArray: ExpenseItem[] = (expenseRequestData?.ExpenseItem || []).map((item: any) => ({
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
    autoCalculated: item.autoCalculated || false,
    expenseDate: item.expenseDate || ''
  }))

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
    stepKey: SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + event,
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
      additionalProperties,
      currencyRef: initialRequest?.currency?.id || '',
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
