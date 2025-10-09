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

/**
 * Handles the submission of an expense plan item
 * @param form Form instance
 * @param customFields Custom fields data
 * @param employeeRuleId Employee rule ID
 * @param generalDataResponse General data response
 * @param catalogueDataResponse Catalogue data response
 * @param setLoading Loading state setter
 * @param t Translation function
 * @param accessToken Access token for authentication
 * @param userInfo User information
 * @param additionalData Additional data from props
 * @param setIsEditMode Edit mode setter
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

    // Format custom fields for the expense plan item
    const customFieldsArray: Array<{
      id: string
      infoValue: string
      mandatory: boolean
      value: string
    }> = []
    if (values.expenseType && customFields[values.expenseType]) {
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
    }

    // Check if we have an expense plan from either the wizard or task payload
    const hasExpensePlan =
      additionalData?.expensePlanId || additionalData?.psi_taskPayload?.psi_initialParameters?.expensePlan

    let flowProcessId: string | null = null
    let taskId: string | null = null
    let taskName: string | null = null

    if (accessToken && userInfo?.employeeDetails?.employeeId && hasExpensePlan) {
      try {
        // Check if process event is already dispatched
        if (getIsProcessEventDispatched && getIsProcessEventDispatched()) {
          return
        }

        const flowResult = await initiateFlow(
          accessToken,
          userInfo.employeeDetails.employeeId,
          FLOW_DOMAIN,
          FLOW_PROCESS_NAME
        )
        if (flowResult && flowResult.id) {
          flowProcessId = flowResult.id
          const userId = userInfo?.id || ''

          const tasksResult = await getOpenedTaskFlow(
            accessToken,
            userId,
            flowProcessId as string,
            FLOW_DOMAIN,
            FLOW_PROCESS_NAME
          )

          if (tasksResult && Array.isArray(tasksResult) && tasksResult.length > 0) {
            const firstTask = tasksResult[0]
            if (firstTask && typeof firstTask.id === 'string' && typeof firstTask.name === 'string') {
              taskId = firstTask.id
              taskName = firstTask.name
            }
          }
        }
      } catch (flowError) {
        showToast(
          getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
          'error'
        )
      }
    }

    const submitData = {
      expensePlanItem: {
        ...(itemValues?.id && { id: itemValues.id }),
        ...(itemValues?.id && { version: itemValues.version }),
        title: values.title,
        totalAmount: values.amount || 0,
        currencyRef: values.currency || DEFAULT_CURRENCY_ID,
        reimbursable: values.reimbursable || false,
        expenseClassRef:
          catalogueDataResponse?.data?.expenceClass?.find((element: any) =>
            element.code.toLowerCase().includes(EXPENSE_SEARCH_TERM)
          )?.id || DEFAULT_EXPENSE_CLASS_ID,
        status: DEFAULT_EXPENSE_STATUS,
        employee: generalDataResponse?.data?.Employee?.[0]?.id || userInfo?.employeeDetails?.employeeId || '',
        expenseGroupRef: values.expenseGroup,
        source: values.expenseType ? DEFAULT_EXPENSE_SOURCE : '',
        expenseDate: values.date ? dayjs(values.date).format() : dayjs().format(),
        reimbursableAmount: values.reimbursable === true ? values.amount : '',
        nonReimbursableAmount: values.reimbursable !== true ? values.amount : '',
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

    let operationSuccessful = false

    if (flowProcessId && taskId && taskName && hasExpensePlan && accessToken) {
      try {
        const userId = userInfo?.id || ''
        await completeTaskFlow(
          accessToken,
          userId,
          flowProcessId as string,
          taskName as string,
          taskId as string,
          submitData,
          FLOW_DOMAIN,
          FLOW_PROCESS_NAME
        )
        operationSuccessful = true
      } catch (completeError) {
        showToast(
          getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
          'error'
        )
      }
    }

    if (accessToken && userInfo?.employeeDetails?.employeeId && !hasExpensePlan) {
      try {
        if (dispatchProcessContinueEventIfEnabled) {
          const success = dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
          if (success) {
            operationSuccessful = true
          }
        } else {
          dispatchProcessContinueEvent(EVENTS.SUBMIT, submitData)
          operationSuccessful = true
        }
      } catch (processError) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.error_flows',
            'Error in expense approval process'
          ),
          'error'
        )
      }
    }

    if (operationSuccessful) {
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
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'),
      'error'
    )
    throw error
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
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    showToast(
      getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_type_item.process_error_data_fetch',
        'Error fetching data'
      ),
      'error'
    )
  }
}
