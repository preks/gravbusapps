import { formatDateToISOString } from '../../utils/dateUtils'
import type { ExpenseItemTranslateFn } from '../../useExpenseItemTranslation'
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

type EmployeeRuleId = string | null | object

let positionIdFallbackCounter = 0

const createPositionId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `position-${crypto.randomUUID()}`
  }

  positionIdFallbackCounter += 1
  return `position-${Date.now()}-${positionIdFallbackCounter}`
}

const coerceRequestId = (id?: string) => (id && id !== '0' ? id : undefined)

const uploadReceiptAndSupportingFiles = async ({
  fileList,
  supportingFileList,
  accessToken,
  employeeId,
  t
}: {
  fileList?: any[]
  supportingFileList?: any[]
  accessToken?: string
  employeeId?: string
  t: ExpenseItemTranslateFn
}) => {
  let receiptUploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = []
  let supportingUploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }> = []

  if (accessToken && employeeId) {
    if (fileList && fileList.length > 0) {
      receiptUploadedFiles = await uploadDocuments(fileList, accessToken, employeeId, t)
    }
    if (supportingFileList && supportingFileList.length > 0) {
      supportingUploadedFiles = await uploadDocuments(supportingFileList, accessToken, employeeId, t)
    }
  }

  return { receiptUploadedFiles, supportingUploadedFiles }
}

const resolveFlowContext = async ({
  accessToken,
  employeeId,
  hasExpenseRequest,
  userInfo,
  getIsProcessEventDispatched,
  t
}: {
  accessToken?: string
  employeeId?: string
  hasExpenseRequest: any
  userInfo?: any
  getIsProcessEventDispatched?: () => boolean
  t: ExpenseItemTranslateFn
}) => {
  let flowProcessId: string | null = null
  let taskId: string | null = null
  let taskName: string | null = null

  if (!accessToken || !employeeId || !hasExpenseRequest) {
    return { flowProcessId, taskId, taskName }
  }

  try {
    if (getIsProcessEventDispatched?.()) {
      return { flowProcessId, taskId, taskName }
    }

    const flowResult = await initiateFlow(accessToken, employeeId, FLOW_DOMAIN, FLOW_PROCESS_NAME, t)
    if (!flowResult?.id) {
      return { flowProcessId, taskId, taskName }
    }

    flowProcessId = flowResult.id
    const userId = userInfo?.id || ''

    const tasksResult = await getOpenedTaskFlow(accessToken, userId, flowProcessId, FLOW_DOMAIN, FLOW_PROCESS_NAME, t)
    const firstTask = Array.isArray(tasksResult) ? tasksResult[0] : null

    if (firstTask && typeof firstTask.id === 'string' && typeof firstTask.name === 'string') {
      taskId = firstTask.id
      taskName = firstTask.name
    }
  } catch {
    showToast(t('expense-item-error-flows'), 'error')
  }

  return { flowProcessId, taskId, taskName }
}

const formatExpensePositions = ({
  positions,
  customFields,
  itemValues,
  employeeRuleId
}: {
  positions: any[]
  customFields: { [expenseTypeId: string]: any[] }
  itemValues?: { id: string; version: string | number }
  employeeRuleId: EmployeeRuleId
}) => {
  return positions.map((position, index) => {
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
}

const buildSubmitData = ({
  values,
  positions,
  itemValues,
  computedExpenseRequestId,
  generalDataResponse,
  employeeId,
  employeeRuleId,
  multiPosition,
  formattedPositions,
  receiptUploadedFiles,
  supportingUploadedFiles
}: {
  values: any
  positions: any[]
  itemValues?: { id: string; version: string | number }
  computedExpenseRequestId: string | null
  generalDataResponse: any
  employeeId?: string
  employeeRuleId: EmployeeRuleId
  multiPosition: boolean
  formattedPositions: any[]
  receiptUploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }>
  supportingUploadedFiles: Array<{ fileType: string; fileUrl: string; fileName: string }>
}) => {
  return {
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
      expenseFiles: [
        ...receiptUploadedFiles.map(element => ({
          fileType: element.fileType,
          fileUrl: element.fileUrl,
          fileName: element.fileName
        })),
        ...supportingUploadedFiles.map(element => ({
          // Explicit marker so backend/parser can treat this as non-receipt attachment.
          fileType: 'SUPPORTING_DOCUMENT',
          fileUrl: element.fileUrl,
          fileName: element.fileName
        }))
      ].map(element => ({
        fileType: element.fileType,
        fileUrl: element.fileUrl,
        fileName: element.fileName
      }))
    }
  }
}

const submitExpenseItem = async ({
  flowProcessId,
  taskId,
  taskName,
  hasExpenseRequest,
  accessToken,
  employeeId,
  userInfo,
  submitData,
  dispatchProcessContinueEventIfEnabled,
  t
}: {
  flowProcessId: string | null
  taskId: string | null
  taskName: string | null
  hasExpenseRequest: any
  accessToken?: string
  employeeId?: string
  userInfo?: any
  submitData: any
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
  t: ExpenseItemTranslateFn
}) => {
  let operationSuccessful = false

  if (flowProcessId && taskId && taskName && hasExpenseRequest && accessToken) {
    try {
      const userId = userInfo?.id || ''
      await completeTaskFlow(
        accessToken,
        userId,
        flowProcessId,
        taskName,
        taskId,
        submitData,
        FLOW_DOMAIN,
        FLOW_PROCESS_NAME,
        t
      )
      operationSuccessful = true
    } catch {
      showToast(t('expense-item-error-flows'), 'error')
    }
  }

  if (accessToken && employeeId && !hasExpenseRequest) {
    try {
      if (dispatchProcessContinueEventIfEnabled) {
        dispatchProcessContinueEventIfEnabled(EVENTS.SUBMIT, submitData)
      } else {
        dispatchProcessContinueEvent(EVENTS.SUBMIT, submitData)
      }
    } catch {
      showToast(t('expense-item-error-flows'), 'error')
    }
  }

  return operationSuccessful
}

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
  t: ExpenseItemTranslateFn
): Promise<Array<{ fileType: string; fileUrl: string; fileName: string }>> => {
  if (!fileList || fileList.length === 0) {
    return []
  }

  if (!employeeId) {
    showToast(t('expense-item-error-missing-employee'), 'error')
    return []
  }

  try {
    const files = fileList.map(f => f.originFileObj).filter(Boolean)

    if (files.length === 0) {
      showToast(t('expense-item-error-missing-files'), 'info')
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
    showToast(t('expense-item-error-upload-files'), 'error')
    return []
  }
}

export const handleExpenseGroupChange = async (
  value: string,
  positionIndex: number,
  positions: any[],
  setPositions: (positions: any[]) => void,
  expenseTypes: { [classId: string]: any[] },
  employeeRuleId: EmployeeRuleId,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  t: ExpenseItemTranslateFn,
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
    showToast(t('expense-item-error-expense-types'), 'error')
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
  t: ExpenseItemTranslateFn,
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
    showToast(t('expense-item-error-custom-groups'), 'error')
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
    id: createPositionId(),
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
  t: ExpenseItemTranslateFn
) => {
  if (positions.length === 1) {
    showToast(t('expense-item-position-deletion-warning'), 'warning')
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
  employeeRuleId: EmployeeRuleId,
  generalDataResponse: any,
  multiPosition: boolean,
  setPositions: (positions: any[]) => void,
  setFileList: (files: any[]) => void,
  setCurrentStep: (step: 'start' | 'form') => void,
  setLoading: (loading: boolean) => void,
  t: ExpenseItemTranslateFn,
  fileList?: any[],
  supportingFileList?: any[],
  accessToken?: string,
  employeeId?: string,
  additionalData?: any,
  userInfo?: any,
  itemValues?: { id: string; version: string | number },
  setSupportingFileList?: (files: any[]) => void,
  getIsProcessEventDispatched?: () => boolean,
  dispatchProcessContinueEventIfEnabled?: (event: string, payload: any) => boolean
) => {
  try {
    setLoading(true)
    await form.validateFields()

    const values = form.getFieldsValue()
    const rawExpenseRequestId: string | undefined = form.getFieldValue('expenseRequestId')
    const normalizedExpenseRequestId = coerceRequestId(rawExpenseRequestId)

    const { receiptUploadedFiles, supportingUploadedFiles } = await uploadReceiptAndSupportingFiles({
      fileList,
      supportingFileList,
      accessToken,
      employeeId,
      t
    })

    // Check if we have an expense request from either the wizard or task payload
    const hasExpenseRequest =
      additionalData?.expenseRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.expenseRequest

    const { flowProcessId, taskId, taskName } = await resolveFlowContext({
      accessToken,
      employeeId,
      hasExpenseRequest,
      userInfo,
      getIsProcessEventDispatched,
      t
    })

    const formattedPositions = formatExpensePositions({
      positions,
      customFields,
      itemValues,
      employeeRuleId
    })

    const computedExpenseRequestId =
      normalizedExpenseRequestId ??
      coerceRequestId(values?.expenseRequestId) ??
      additionalData?.expenseRequestId ??
      null

    const submitData = buildSubmitData({
      values,
      positions,
      itemValues,
      computedExpenseRequestId,
      generalDataResponse,
      employeeId,
      employeeRuleId,
      multiPosition,
      formattedPositions,
      receiptUploadedFiles,
      supportingUploadedFiles
    })

    const operationSuccessful = await submitExpenseItem({
      flowProcessId,
      taskId,
      taskName,
      hasExpenseRequest,
      accessToken,
      employeeId,
      userInfo,
      submitData,
      dispatchProcessContinueEventIfEnabled,
      t
    })

    if (operationSuccessful) {
      showToast(t('expense-item-created-success'), 'success')

      form.resetFields()
      setPositions([DEFAULT_POSITION])
      setFileList([])
      if (setSupportingFileList) {
        setSupportingFileList([])
      }
      setCurrentStep(FORM_STEPS.START)
    }
  } catch {
    showToast(t('expense-item-error-flows'), 'error')
  } finally {
    setLoading(false)
  }
}
