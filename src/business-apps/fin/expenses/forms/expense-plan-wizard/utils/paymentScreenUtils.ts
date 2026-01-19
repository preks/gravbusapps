import dayjs from 'dayjs'
import { SCREEN_NAMES_ENUM } from '../constants/constants'
import { EVENTS } from '../../../utils/constants'

export interface AdvanceObject {
  id?: string
  version?: string
  currencyRef: string
  amount: number
  paymentMethod: string | null
  status: string
  expensePlan: string
  costCenter: string
}

export interface PaymentScreenLogObject {
  stepKey: string
  event: string
  expensePlan: {
    id: string
    startDate: string
    endDate: string
    expenseRule: string
    version: string
    costCenter: string
    employee: string
    title: string
    status: string
    planDate: string
    requestTypeRef: string
    additionalProperties: any
    currencyRef: string
    description: string
    totalAmount: number
    project: string
    decisionDate: string
  }
  expensePlanItems: {
    planItems: Array<{
      id: string
      version: string | number
      code: string
      title: string
      ruleId: string
      expensePlan: string
      costCenter: string
      project: string
      expenseGroupRef: string
      source: string
      expenseClassRef: string
      autoCalculated: boolean
    }>
  }
  expenseRequestTrips: {
    expenseTrips: any[]
  }
  advancePayment: AdvanceObject | null
}

export const createAdvanceObject = (
  selectedCurrencyId: string,
  amount: string,
  paymentMethod: string | null,
  expensePlanData: any
): AdvanceObject | null => {
  const planDataPk = expensePlanData?.ExpensePlanByPk
  if (paymentMethod) {
    let initialAdvancePayment = null
    if (planDataPk?.advancePayment && planDataPk.advancePayment.length > 0) {
      initialAdvancePayment = planDataPk.advancePayment[0]
    }
    if (initialAdvancePayment)
      return {
        id: initialAdvancePayment.id,
        version: initialAdvancePayment.version,
        currencyRef: selectedCurrencyId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        status: 'PREPARED',
        expensePlan: planDataPk.id,
        costCenter: planDataPk.costCenter.id
      }
    else
      return {
        currencyRef: selectedCurrencyId,
        amount: parseFloat(amount),
        paymentMethod: paymentMethod,
        status: 'PREPARED',
        expensePlan: planDataPk.id,
        costCenter: planDataPk.costCenter.id
      }
  } else return null
}

export const createPaymentScreenLogObject = (
  initialPlan: any,
  employeeRuleId: string,
  currentTitle: string,
  advanceObject: AdvanceObject | null,
  expensePlanData: any,
  event: string,
  skipStep: boolean
): PaymentScreenLogObject => {
  const planItemsArray: Array<{
    id: string
    version: string | number
    code: string
    title: string
    ruleId: string
    expensePlan: string
    costCenter: string
    project: string
    expenseGroupRef: string
    source: string
    expenseClassRef: string
    autoCalculated: boolean
  }> = []
  if (expensePlanData.ExpensePlanItem && Array.isArray(expensePlanData.ExpensePlanItem)) {
    expensePlanData.ExpensePlanItem.forEach((item: any) => {
      if (item) {
        planItemsArray.push({
          id: item.id,
          version: item.version,
          code: item.code || '',
          title: item.title || '',
          ruleId: item.expenseRuleId || '',
          expensePlan: initialPlan.id || '',
          costCenter: item.costCenterId || '',
          project: item.projectId || '',
          expenseGroupRef: item.expenseGroupRef || '',
          source: item.source || '',
          expenseClassRef: item.expenseClassRef || '',
          autoCalculated: item.autoCalculated || false
        })
      }
    })
  }

  return {
    stepKey: SCREEN_NAMES_ENUM.PAYMENT_TAB + '_' + event + (skipStep ? '_' + EVENTS.SKIP : ''),
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
      currencyRef: initialPlan?.currency?.id || '',
      description: initialPlan?.description || '',
      totalAmount: initialPlan?.totalAmount,
      project: initialPlan?.project?.id || '',
      decisionDate: initialPlan?.decisionDate || ''
    },
    expensePlanItems: {
      planItems: planItemsArray
    },
    expenseRequestTrips: {
      expenseTrips: expensePlanData?.ExpensePlanByPk?.expenseRequestTrip || []
    },
    advancePayment: advanceObject || null
  }
}
