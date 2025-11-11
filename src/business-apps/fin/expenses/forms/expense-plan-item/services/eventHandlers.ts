import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import dayjs from 'dayjs'
import { completeTaskFlow, getOpenedTaskFlow, initiateFlow } from '../../expense-item/context/services/flowHandlers'
import { DEFAULT_EXPENSE_SOURCE, DEFAULT_EXPENSE_STATUS, FLOW_DOMAIN, FLOW_PROCESS_NAME } from '../constants'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EVENTS } from '../../../utils/constants'
import {
  DEFAULT_CURRENCY_ID,
  DEFAULT_EXPENSE_CLASS_ID,
  EXPENSE_SEARCH_TERM
} from '../../expense-item/constants/constants'
import { parseNumericValue } from '@/business-apps/fin/expenses/utils/amountFormatting'

/**
 * Formats custom fields from form values
 */
const formatCustomFields = (
  values: any,
  customFields: { [expenseTypeId: string]: any[] }
): Array<{ id: string; infoValue: string; mandatory: boolean; value: string }> => {
  const customFieldsArray: Array<{
    id: string
    infoValue: string
    mandatory: boolean
    value: string
  }> = []

  if (!values.expenseType || !customFields[values.expenseType]) {
    return customFieldsArray
  }

  const customFieldData = customFields[values.expenseType]
  customFieldData.forEach(field => {
    const fieldValue = values[field.infoValue]
    if (fieldValue) {
      customFieldsArray.push({
        id: field.id,
        infoValue: field.infoValue,
        mandatory: field.mandatory || false,
        value: fieldValue
      })
    }
  })

  return customFieldsArray
}

/**
 * Checks if expense plan exists in additional data
 */
const hasExpensePlan = (additionalData?: any): boolean => {
  return !!(additionalData?.expensePlanId || additionalData?.psi_taskPayload?.psi_initialParameters?.expensePlan)
}

/**
 * Initiates flow and gets task information
 */
const initiateFlowAndGetTask = async (
  accessToken: string,
  employeeId: string,
  userId: string
): Promise<{ flowProcessId: string | null; taskId: string | null; taskName: string | null }> => {
  try {
    const flowResult = await initiateFlow(accessToken, employeeId, FLOW_DOMAIN, FLOW_PROCESS_NAME)

    if (!flowResult?.id) {
      return { flowProcessId: null, taskId: null, taskName: null }
    }

    const flowProcessId = flowResult.id
    const tasksResult = await getOpenedTaskFlow(accessToken, userId, flowProcessId, FLOW_DOMAIN, FLOW_PROCESS_NAME)

    if (!tasksResult || !Array.isArray(tasksResult) || tasksResult.length === 0) {
      return { flowProcessId, taskId: null, taskName: null }
    }

    const firstTask = tasksResult[0]
    if (firstTask && typeof firstTask.id === 'string' && typeof firstTask.name === 'string') {
      return { flowProcessId, taskId: firstTask.id, taskName: firstTask.name }
    }

    return { flowProcessId, taskId: null, taskName: null }
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return { flowProcessId: null, taskId: null, taskName: null }
  }
}

/**
 * Creates submit data payload
 */
const createSubmitData = (
  values: any,
  itemValues: any,
  customFieldsArray: any[],
  catalogueDataResponse: any,
  generalDataResponse: any,
  userInfo: any,
  employeeRuleId: string | null | object,
  expensePlanId: string,
  additionalData?: any
): any => {
  // Normalize amount coming from the form (could be locale-formatted like "12,00")
  const normalizedAmount = parseNumericValue(values.amount) ?? 0
  const isReimbursable = values.reimbursable === true

  return {
    expensePlanItem: {
      ...(itemValues?.id && { id: itemValues.id }),
      ...(itemValues?.id && { version: itemValues.version }),
      title: values.title,
      totalAmount: normalizedAmount,
      currencyRef: values.currency || DEFAULT_CURRENCY_ID,
      reimbursable: isReimbursable,
      expenseClassRef:
        catalogueDataResponse?.data?.expenceClass?.find((element: any) =>
          element.code.toLowerCase().includes(EXPENSE_SEARCH_TERM)
        )?.id || DEFAULT_EXPENSE_CLASS_ID,
      status: DEFAULT_EXPENSE_STATUS,
      employee: generalDataResponse?.data?.Employee?.[0]?.id || userInfo?.employeeDetails?.employeeId || '',
      expenseGroupRef: values.expenseGroup,
      source: values.expenseType ? DEFAULT_EXPENSE_SOURCE : '',
      expenseDate: values.date ? dayjs(values.date).format() : dayjs().format(),
      ...(isReimbursable ? { reimbursableAmount: normalizedAmount } : { nonReimbursableAmount: normalizedAmount }),
      expenseRuleGeneralExpense: values.expenseType || '',
      costCenter: values.costCenter,
      expensePlan: values.expensePlan || expensePlanId || additionalData?.expensePlanId || '',
      additionalProperties: {
        customFields: customFieldsArray
      },
      expenseRule: employeeRuleId as string
    },
    event: EVENTS.SUBMIT
  }
}

/**
 * Completes task flow submission
 */
const submitViaTaskFlow = async (
  flowProcessId: string,
  taskId: string,
  taskName: string,
  accessToken: string,
  userId: string,
  submitData: any
): Promise<boolean> => {
  try {
    await completeTaskFlow(
      accessToken,
      userId,
      flowProcessId,
      taskName,
      taskId,
      submitData,
      FLOW_DOMAIN,
      FLOW_PROCESS_NAME
    )
    return true
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    return false
  }
}

/**
 * Submits via process continue event
 */
const submitViaProcessEvent = (
  submitData: any,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
): boolean => {
  try {
    if (dispatchProcessContinueEventIfEnabled) {
      return dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
    }

    dispatchProcessContinueEvent(EVENTS.SUBMIT, submitData)
    return true
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.error_flows',
        'Error in expense approval process'
      ),
      'error'
    )
    return false
  }
}

/**
 * Shows success message and resets form
 */
const handleSuccess = (form: any, setIsEditMode?: (isEdit: boolean) => void): void => {
  showToast(
    getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_type_item.created_item_notification_message',
      'Expense item created successfully!'
    ),
    'success'
  )

  form.resetFields()
  if (setIsEditMode) {
    setIsEditMode(false)
  }
}

/**
 * Handles the submission of an expense plan item
 */
export const handleSubmit = async (
  form: any,
  customFields: { [expenseTypeId: string]: any[] },
  employeeRuleId: string | null | object,
  generalDataResponse: any,
  catalogueDataResponse: any,
  setLoading: (loading: boolean) => void,
  expensePlanId: string,
  accessToken?: string,
  userInfo?: any,
  additionalData?: any,
  setIsEditMode?: (isEdit: boolean) => void,
  itemValues?: { id: string; version: string | number },
  getIsProcessEventDispatched?: () => boolean,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
) => {
  try {
    setLoading(true)

    await form.validateFields()
    const values = form.getFieldsValue()

    // Format custom fields
    const customFieldsArray = formatCustomFields(values, customFields)

    // Check if we should skip (process event already dispatched)
    if (getIsProcessEventDispatched && getIsProcessEventDispatched()) {
      return
    }

    // Initialize flow variables
    let flowProcessId: string | null = null
    let taskId: string | null = null
    let taskName: string | null = null
    const hasPlan = hasExpensePlan(additionalData)

    // Initiate flow if conditions are met
    if (accessToken && userInfo?.employeeDetails?.employeeId && hasPlan) {
      const flowData = await initiateFlowAndGetTask(
        accessToken,
        userInfo.employeeDetails.employeeId,
        userInfo?.id || ''
      )
      flowProcessId = flowData.flowProcessId
      taskId = flowData.taskId
      taskName = flowData.taskName
    }

    // Create submit data payload
    const submitData = createSubmitData(
      values,
      itemValues,
      customFieldsArray,
      catalogueDataResponse,
      generalDataResponse,
      userInfo,
      employeeRuleId,
      expensePlanId,
      additionalData
    )

    // Submit via appropriate method
    let operationSuccessful = false

    if (flowProcessId && taskId && taskName && hasPlan && accessToken) {
      operationSuccessful = await submitViaTaskFlow(
        flowProcessId,
        taskId,
        taskName,
        accessToken,
        userInfo?.id || '',
        submitData
      )
    } else if (accessToken && userInfo?.employeeDetails?.employeeId && !hasPlan) {
      operationSuccessful = submitViaProcessEvent(submitData, dispatchProcessContinueEventIfEnabled)
    }

    // Handle success
    if (operationSuccessful) {
      handleSuccess(form, setIsEditMode)
    }
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
  } finally {
    setLoading(false)
  }
}

/**
 * Handles the cancellation of an expense plan item
 * @param form Form instance
 * @param setIsEditMode Edit mode setter
 */
export const handleCancel = (form: any, setIsEditMode?: (isEdit: boolean) => void) => {
  form.resetFields()
  if (setIsEditMode) {
    setIsEditMode(false)
  }
}

/**
 * Handles expense group change
 * @param value Selected expense group value
 * @param form Form instance
 * @param setExpenseTypes Expense types setter
 * @param setCustomFields Custom fields setter
 * @param fetchExpenseTypes Function to fetch expense types
 */
export const handleExpenseGroupChange = async (
  value: string,
  form: any,
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  setCustomFields: (fields: any) => void,
  fetchExpenseTypes: (classId: string) => Promise<any[]>
) => {
  // Always clear expense type when expense group changes (including when cleared)
  form.setFieldsValue({
    expenseType: undefined
  })

  if (!value) {
    setExpenseTypes({})
    setCustomFields({})
    return
  }

  try {
    const types = await fetchExpenseTypes(value)
    setExpenseTypes({ [value]: types })
    setCustomFields({})
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.process_error_expense_types',
        'Error processing expense types'
      ),
      'error'
    )
  }
}

/**
 * Handles expense type change
 * @param value Selected expense type value
 * @param form Form instance
 * @param setCustomFields Custom fields setter
 * @param fetchCustomFields Function to fetch custom fields
 */
export const handleExpenseTypeChange = async (
  value: string,
  form: any,
  setCustomFields: (fields: any) => void,
  fetchCustomFields: (expenseTypeIds: string[]) => Promise<any[]>
) => {
  if (!value) {
    setCustomFields({})
    return
  }

  try {
    const fields = await fetchCustomFields([value])
    setCustomFields({ [value]: fields })
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.process_error_expense_custom_groups',
        'Error processing custom groups'
      ),
      'error'
    )
  }
}

/**
 * Handles currency change
 * @param currencyId Selected currency ID
 * @param form Form instance
 */
export const handleCurrencyChange = async (currencyId: string, form: any) => {
  try {
    form.setFieldsValue({ currency: currencyId })
  } catch {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.process_error_data_fetch',
        'Error fetching data'
      ),
      'error'
    )
  }
}
