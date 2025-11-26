import { formatDateToISOString } from '../../utils/dateUtils'
import { calculateTotalAmount } from '../../utils/calculationUtils'
import { fetchExpenseTypes, fetchCustomFields } from './dataFetchers'
import { initiateFlow, getOpenedTaskFlow, completeTaskFlow } from './flowHandlers'
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'
import { EMPLOYEE_FILES_LOCATION, EVENTS, FILES_ENDPOINT } from '@/business-apps/fin/expenses/utils/constants'
import {
  DEFAULT_POSITION,
  DEFAULT_EXPENSE_STATUS,
  DEFAULT_EXPENSE_SOURCE,
  DEFAULT_CURRENCY_ID,
  DEFAULT_EXPENSE_CLASS_ID,
  FORM_STEPS,
  REQUEST_STATUS
} from '../../constants/constants'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { FLOW_DOMAIN, FLOW_PROCESS_NAME } from '../constants'

/**
 * Uploads documents to the file server
 * @param fileList Array of file objects to upload
 * @param accessToken Access token for authentication
 * @param employeeId Employee ID for the folder path
 * @param t Translation function
 * @returns Promise with the formatted file data or empty array if no files to upload
 */
export const uploadDocuments = async (
  fileList: any[],
  accessToken: string,
  employeeId: string,
  t: (key: string, fallback: string) => string
): Promise<Array<{ fileType: string; fileUrl: string; fileName: string }>> => {
  if (!fileList || fileList.length === 0) {
    return []
  }

  if (!employeeId) {
    showToast(
      t(
        'lowcoder:create_expense_type_item.document_upload_error_missing_employee_data',
        'Cannot upload files: missing employee data'
      ),
      'error'
    )
    return []
  }

  try {
    const files = fileList.map(f => f.originFileObj).filter(Boolean)

    if (files.length === 0) {
      showToast(
        t('lowcoder:create_expense_type_item.document_upload_error_missing_files', 'No valid files to upload'),
        'info'
      )
      return []
    }

    const uploadPromises = files.map(async (file: File) => {
      const folderPath = encodeURIComponent(`/expenseItemsDocuments/${employeeId}`)
      const mimeType = encodeURIComponent(file.type)
      const url = `${FILES_ENDPOINT}/tenant/files?appName=expenses&folderPath=${folderPath}&mimeType=${mimeType}`
      const formData = new FormData()
      formData.append('fileContent', file)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      })

      if (!response.ok) {
        throw new Error(`File upload failed for ${file.name}: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()
      return responseData
    })

    const results = await Promise.all(uploadPromises)
    const formattedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = []

    results.forEach((element: any) => {
      if (element && element.fileInfo) {
        formattedFiles.push({
          fileType: element.fileInfo.fileMetadata.mimeType,
          fileUrl: EMPLOYEE_FILES_LOCATION + '/' + element.fileInfo.fileId,
          fileName: element.fileInfo.fileMetadata.originalFileName
        })
      } else if (element && element.fileId) {
        formattedFiles.push({
          fileType: element.fileMetadata?.mimeType || 'application/octet-stream',
          fileUrl: EMPLOYEE_FILES_LOCATION + '/' + element.fileId,
          fileName: element.fileMetadata?.originalFileName || 'file'
        })
      }
    })

    return formattedFiles
  } catch {
    showToast(t('lowcoder:create_expense_type_item.document_upload_error_files', 'Error uploading files'), 'error')
    return []
  }
}

export const handleExpenseGroupChange = async (
  value: string,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void,
  expenseTypes: { [classId: string]: any[] },
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  t: (key: string, fallback: string) => string,
  form?: any
) => {
  try {
    const updatedPositions = [...positions]
    updatedPositions[positionIndex].expenseGroup = value
    updatedPositions[positionIndex].expenseType = ''
    updatedPositions[positionIndex].customField = ''
    setPositions(updatedPositions)

    if (form) {
      form.setFieldsValue({
        [`expenseType-${positionIndex}`]: undefined
      })
    }
    const hasExpenseTypesForGroup = Object.keys(expenseTypes).includes(value)
    if (!hasExpenseTypesForGroup) {
      await fetchExpenseTypes(value, positions, employeeRuleId, graphqlClient, setExpenseTypes, t)
    }
  } catch {
    showToast(
      t('lowcoder:create_expense_type_item.process_error_expense_types', 'Error processing expense types'),
      'error'
    )
  }
}

export const handleExpenseTypeChange = async (
  value: string,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void,
  customFields: { [expenseTypeId: string]: any[] },
  graphqlClient: any,
  setCustomFields: (fields: any) => void,
  t: (key: string, fallback: string) => string,
  form?: any
) => {
  try {
    const updatedPositions = [...positions]
    updatedPositions[positionIndex].expenseType = value
    updatedPositions[positionIndex].customField = ''
    setPositions(updatedPositions)

    if (form) {
      form.setFieldsValue({
        [`expenseType-${positionIndex}`]: value || undefined
      })

      const prevExpenseType = positions[positionIndex]?.expenseType

      if (prevExpenseType && customFields[prevExpenseType]) {
        const fieldsToReset: Record<string, undefined> = {}

        customFields[prevExpenseType].forEach(field => {
          fieldsToReset[`customField-${positionIndex}-${field.id}`] = undefined
        })

        if (Object.keys(fieldsToReset).length > 0) {
          form.setFieldsValue(fieldsToReset)
        }
      }
    }

    const hasCustomFieldsForType = Object.keys(customFields).includes(value)

    if (!hasCustomFieldsForType && value) {
      const expenseTypeIds = positions.map(position => position.expenseType).filter(id => id && id.length > 0)

      if (!expenseTypeIds.includes(value)) {
        expenseTypeIds.push(value)
      }

      await fetchCustomFields(expenseTypeIds, graphqlClient, setCustomFields, t)
    }
  } catch {
    showToast(
      t('lowcoder:create_expense_type_item.process_error_expense_custom_groups', 'Error processing custom groups'),
      'error'
    )
  }
}

export const handleAddPosition = (
  positions: any[],
  setPositions: (positions: any[]) => void,
  defaultCostCenter?: string,
  form?: any
) => {
  const newPosition = {
    ...DEFAULT_POSITION,
    id: `position-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    costCenter: defaultCostCenter || '',
    amount: 0
  }

  const newPositions = [...positions, newPosition]
  setPositions(newPositions)

  if (form && defaultCostCenter) {
    const newPositionIndex = newPositions.length - 1
    form.setFieldsValue({
      [`costCenter-${newPositionIndex}`]: defaultCostCenter
    })
  }
}

export const handleRemovePosition = (
  positionId: string,
  positions: any[],
  setPositions: (positions: any[]) => void,
  t: (key: string, fallback: string) => string
) => {
  if (positions.length === 1) {
    showToast(
      t('lowcoder:create_expense_type_item.position_deletion_warning', 'At least one position is required'),
      'warning'
    )
    return
  }

  setPositions(positions.filter(position => position.id !== positionId))
}

export const handleAmountChange = (
  value: number,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void
) => {
  const updatedPositions = [...positions]
  updatedPositions[positionIndex].amount = value
  setPositions(updatedPositions)
}

export const handleSubmit = async (
  form: any,
  positions: any[],
  customFields: { [expenseTypeId: string]: any[] },
  employeeRuleId: string | null | object,
  generalDataResponse: any,
  multiPosition: boolean,
  setPositions: (positions: any[]) => void,
  setFileList: (files: any[]) => void,
  setCurrentStep: (step: 'start' | 'form') => void,
  setLoading: (loading: boolean) => void,
  t: (key: string, fallback: string) => string,
  fileList?: any[],
  accessToken?: string,
  employeeId?: string,
  additionalData?: any,
  userInfo?: any,
  itemValues?: { id: string; version: string | number },
  getIsProcessEventDispatched?: () => boolean,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
) => {
  try {
    setLoading(true)

    await form.validateFields()

    const values = form.getFieldsValue()
    const rawExpenseRequestId: string | undefined = form.getFieldValue('expenseRequestId')
    const coerceRequestId = (id?: string) => (id && id !== '0' ? id : undefined)
    const normalizedExpenseRequestId = coerceRequestId(rawExpenseRequestId)

    let uploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = []
    if (fileList && fileList.length > 0 && accessToken && employeeId) {
      uploadedFiles = await uploadDocuments(fileList, accessToken, employeeId, t)
    }

    // Check if we have an expense request from either the wizard or task payload
    const hasExpenseRequest =
      additionalData?.expenseRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.expenseRequest

    let flowProcessId: string | null = null
    let taskId: string | null = null
    let taskName: string | null = null

    if (accessToken && employeeId && hasExpenseRequest) {
      try {
        // Check if process event is already dispatched
        if (getIsProcessEventDispatched && getIsProcessEventDispatched()) {
          return
        }

        const flowResult = await initiateFlow(accessToken, employeeId, FLOW_DOMAIN, FLOW_PROCESS_NAME)
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
      } catch {
        showToast(t('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'), 'error')
      }
    }

    const formattedPositions = positions.map((position, index) => {
      const customFieldsArray = []
      if (position.expenseType && customFields[position.expenseType] && position.customField) {
        const customFieldData = customFields[position.expenseType][0]
        if (customFieldData) {
          customFieldsArray.push({
            id: customFieldData.id,
            infoValue: customFieldData.infoValue,
            mandatory: customFieldData.mandatory || false,
            value: position.customField
          })
        }
      }

      return {
        ...(itemValues?.id && { expenseItem: itemValues.id }),
        ...(position.persistedId && { id: position.persistedId }),
        ...(position.persistedId && { version: position.persistedVersion }),
        expenseGroupRef: position.expenseGroup,
        expenseTypeRef: position.expenseType,
        totalAmount: position.amount || 0,
        positionOrder: index + 1,
        expenseRuleGeneralExpense: position.expenseType,
        costCenter: position.costCenter,
        reimbursable: position.isReimbursable,
        additionalProperties: {
          customFields: customFieldsArray
        },
        source: DEFAULT_EXPENSE_SOURCE,
        expenseRule: employeeRuleId as string
      }
    })
    const computedExpenseRequestId =
      normalizedExpenseRequestId ??
      coerceRequestId(values?.expenseRequestId) ??
      additionalData?.expenseRequestId ??
      null

    const submitData = {
      expenseItem: {
        ...(itemValues?.id && { id: itemValues.id }),
        ...(itemValues?.id && { version: itemValues.version }),
        title: values.title,
        expenseDate: values.date ? formatDateToISOString(values.date) : formatDateToISOString(new Date()),
        totalAmount: calculateTotalAmount(positions),
        source: DEFAULT_EXPENSE_SOURCE,
        currencyRef: values.currency || DEFAULT_CURRENCY_ID,
        ...(positions[0]?.costCenter ? { costCenter: positions[0].costCenter } : {}),
        reimbursable: positions[0]?.isReimbursable || false,
        expenseClassRef: DEFAULT_EXPENSE_CLASS_ID,
        status: computedExpenseRequestId ? REQUEST_STATUS.ASSIGNED : DEFAULT_EXPENSE_STATUS,
        multiplePositions: multiPosition,
        expenseRequest: computedExpenseRequestId,
        employee: generalDataResponse?.data?.Employee?.[0]?.id || employeeId || '',
        expenseRule: employeeRuleId as string
      },
      event: EVENTS.SUBMIT,
      expensePositions: {
        expensePositions: formattedPositions
      },
      expenseItemFiles: {
        expenseFiles: uploadedFiles.map(element => ({
          fileType: element.fileType,
          fileUrl: element.fileUrl,
          fileName: element.fileName
        }))
      }
    }
    let operationSuccessful = false

    if (flowProcessId && taskId && taskName && hasExpenseRequest && accessToken) {
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
      } catch {
        showToast(t('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'), 'error')
      }
    }

    if (accessToken && employeeId && !hasExpenseRequest) {
      try {
        if (dispatchProcessContinueEventIfEnabled) {
          dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
        } else {
          dispatchProcessContinueEvent(EVENTS.SUBMIT, submitData)
        }
        // operationSuccessful = true;
      } catch {
        showToast(t('lowcoder:create_expense_type_item.error_flows', 'Error in expense approval process'), 'error')
      }
    }

    if (operationSuccessful) {
      showToast(
        t('lowcoder:create_expense_type_item.created_item_notification_message', 'Expense item created successfully!'),
        'success'
      )

      form.resetFields()
      setPositions([DEFAULT_POSITION])
      setFileList([])
      setCurrentStep(FORM_STEPS.START)
    }
  } catch {
    showToast(t('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'), 'error')
  } finally {
    setLoading(false)
  }
}
