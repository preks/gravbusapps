import { EVENTS } from '../../../utils/constants'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import dayjs from 'dayjs'

interface ExpenseItem {
  id: any
  version: string | number
  code: string
  title: string
  ruleId?: string
  expenseRuleId?: string
  expensePlan: string
  costCenterId?: string
  projectId?: string
}

/**
 * Creates a log object for the PlanSummaryScreen button events
 * @param initialPlan - The initial expense plan data
 * @param employeeRuleId - The employee rule ID
 * @param currentTitle - The current title of the expense plan
 * @param expensePlanData - The full expense plan data
 * @param event - The event type (SAVE, SUBMIT, etc.)
 * @returns Log object for analytics
 */
export const createSummaryScreenLogObject = (
  initialPlan: any,
  employeeRuleId: string | null,
  currentTitle: string,
  expensePlanData: any,
  event: string,
  skipStep: boolean,
  createBusinessTrip: boolean = false
) => {
  const expenseItemsArray: ExpenseItem[] = (expensePlanData?.ExpensePlanItem || []).map((item: any) => ({
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

  const initialAdvancePayment =
    initialPlan.advancePayment && initialPlan.advancePayment.length > 0 ? initialPlan.advancePayment[0] : null

  return {
    stepKey: SCREEN_NAMES_ENUM.SUMMARY_TAB + '_' + event + (skipStep ? '_' + EVENTS.SKIP : ''),
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
      currencyRef: initialPlan?.currency?.id || ''
    },
    expensePlanItems: {
      planItems: expenseItemsArray
    },
    expensePlanTrips: {
      expenseTrips: expensePlanData?.ExpensePlanByPk?.expenseRequestTrip || []
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
    createBusinessTrip: createBusinessTrip,
    employeeAbsence: {
      typeRef: 'AbsenceType:v1:A101',
      employeeId: initialPlan.employeeId,
      startDate: initialPlan.startDate,
      endDate: initialPlan.endDate,
      description: initialPlan.description,
      substituteEmployee: ''
    }
  }
}
