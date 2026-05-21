import { SCREEN_NAMES_ENUM } from '../constants/constants'
import dayjs from 'dayjs'
import { noAllowanceItemsFunction } from './itemsScreenUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  applyEffectiveCostCenterToRows,
  resolveInheritedOrSelectedCostCenterId,
  resolveItemCostCenterId,
  resolveMainCostCenterId
} from '../../shared/utils/effectiveCostCenter'

interface ExpenseItem {
  id: any
  code: string
  title: string
  expenseRequest: string
  costCenter?: string
  project?: string
  ruleId?: string
  expenseRuleId?: string
  expenseGroupRef?: string
  source?: string
  expenseClassRef?: string
  autoCalculated?: boolean
}

/**
 * Creates a log object for the AllowanceScreen button events
 * @param initialRequest - The initial expense request data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense request
 * @param expenseItems - The expense items array
 * @param expenseRequestData - The full expense request data
 * @param event - The event type (NEXT, SAVE, etc.)
 * @returns Log object for analytics
 */
export const createAllowanceScreenLogObject = (
  initialRequest: any,
  employeeRuleId: string | null,
  currentTitle: string,
  expenseItems: any[],
  expenseRequestData: any,
  existingDeductions: any[],
  event: string
) => {
  const effectiveCostCenterId = resolveMainCostCenterId(
    expenseRequestData?.EmployeePosition,
    initialRequest?.costCenterId || '',
    initialRequest?.additionalProperties
  )
  // Map allowance items
  const allowanceItems: ExpenseItem[] = expenseItems.map(item => ({
    id: item.id,
    version: item.version,
    code: item.code || '',
    title: item.title || '',
    expenseRequest: initialRequest?.id || '',
    costCenter: resolveItemCostCenterId(item, effectiveCostCenterId, initialRequest?.costCenterId || ''),
    project: item.projectId || '',
    expenseGroupRef: item.expenseGroupRef || '',
    source: item.source || '',
    expenseClassRef: item.expenseClassRef || '',
    autoCalculated: item.autoCalculated || false
  }))

  // Map non-allowance items
  const nonAllowanceItems: ExpenseItem[] = noAllowanceItemsFunction(expenseRequestData?.ExpenseItem || []).map(
    item => ({
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
    })
  )

  // Combine both arrays
  const expenseItemsArray: ExpenseItem[] = [...allowanceItems, ...nonAllowanceItems]

  // Build travel breakdowns from list data if present
  const listDataArray = expenseItems || []
  const travelBreakdowns: any[] = []

  if (existingDeductions.length > 0) {
    listDataArray.forEach((item: any) => {
      const deductionDay = item?.deductionDay
      if (!deductionDay) {
        return
      }

      const existing = deductionDay.id ? existingDeductions.find((d: any) => d.id === deductionDay.id) : null
      const deductionDayData: any = {
        breakfast: deductionDay.breakfast,
        lunch: deductionDay.lunch,
        dinner: deductionDay.dinner,
        overnight: deductionDay.overnight,
        expenseDate: item.expenseDate,
        travelRegionRef: item.travelRegionRef || existing?.travelRegionRef || '',
        expenseRequest: item.expenseRequestId ?? item.expenseRequest.id,
        costCenter: resolveInheritedOrSelectedCostCenterId(
          item.costCenterId,
          effectiveCostCenterId,
          initialRequest?.costCenterId || ''
        ),
        project: item.projectId,
        id: deductionDay.id ?? null,
        version: deductionDay.id ? (deductionDay.version ?? 0) : 0
      }

      if (existing) {
        deductionDayData.id = existing.id
        deductionDayData.version = existing.version
      }

      travelBreakdowns.push(deductionDayData)
    })
  }

  return {
    stepKey: SCREEN_NAMES_ENUM.ALLOWANCE_TAB + '_' + event,
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

/**
 * Helper function to get the day name from an ISO date string
 */
export const getDayName = (isoDate: string): string => {
  const days = [
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.sunday', 'Sunday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.monday', 'Monday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.tuesday', 'Tuesday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.wednesday', 'Wednesday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.thursday', 'Thursday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.friday', 'Friday'),
    getTranslationFromI18nKeyAndLabel('lowcoder:weekdays.saturday', 'Saturday')
  ]
  return days[new Date(isoDate).getDay()]
}
