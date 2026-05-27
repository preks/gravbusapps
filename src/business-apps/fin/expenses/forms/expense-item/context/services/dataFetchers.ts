import { ExpenseType, CustomField } from '../../types'
import { getNewTypes, getCustomFields, fetchExpenseData } from '../../ExpenseItemQueries'
import { prepareExpenseRequestsList } from '../../utils/expenseRequestUtils'
import { getCurrentActiveUserLocale } from '../../../../../../../common/utils/windowUtils'
import dayjs from 'dayjs'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import type { ExpenseItemTranslateFn } from '../../useExpenseItemTranslation'

export const fetchExpenseTypes = async (
  groupId: string,
  positions: any[],
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: ExpenseType[] }) => void,
  t: ExpenseItemTranslateFn
) => {
  try {
    if (typeof employeeRuleId === 'object' || !employeeRuleId) {
      return []
    }

    const expenseGroupIds = positions.map(position => position.expenseGroup).filter(id => id && id.length > 0)

    if (groupId && !expenseGroupIds.includes(groupId)) {
      expenseGroupIds.push(groupId)
    }

    if (expenseGroupIds.length === 0) {
      return []
    }

    const response = await graphqlClient.query({
      query: getNewTypes,
      variables: {
        expenseRuleId: employeeRuleId,
        objectFilter: { useInExpense: true },
        expenseGroupId: expenseGroupIds
      }
    })

    if (!response?.data?.ExpenseRuleGeneralExpense) {
      showToast(t('expense-item-error-expense-types'), 'error')
      return []
    }

    const expenseTypesList = response.data.ExpenseRuleGeneralExpense.map((item: any) => {
      const attachmentInstruction =
        typeof item?.additionalProperties?.postingDetails?.attachment === 'string'
          ? item.additionalProperties.postingDetails.attachment.trim()
          : ''

      return {
        id: item.id,
        name: item.name,
        code: item.code,
        classId: item.expenseGroupRef,
        reimbursable: item.reimbursable,
        additionalProperties: item.additionalProperties,
        attachmentInstruction
      }
    })

    const expenseTypesByGroup = expenseTypesList.reduce((acc: { [key: string]: ExpenseType[] }, item: ExpenseType) => {
      if (!acc[item.classId]) {
        acc[item.classId] = []
      }
      acc[item.classId].push(item)
      return acc
    }, {})

    setExpenseTypes(expenseTypesByGroup)

    return expenseTypesList
  } catch {
    showToast(t('expense-item-error-expense-types'), 'error')
    return []
  }
}

export const fetchCustomFields = async (
  expenseTypeIds: string[],
  graphqlClient: any,
  setCustomFields: (
    fields:
      | { [expenseTypeId: string]: CustomField[] }
      | ((prev: { [expenseTypeId: string]: CustomField[] }) => { [expenseTypeId: string]: CustomField[] })
  ) => void,
  t: ExpenseItemTranslateFn
) => {
  try {
    if (!expenseTypeIds || expenseTypeIds.length === 0) {
      return []
    }

    const response = await graphqlClient.query({
      query: getCustomFields,
      variables: {
        expenseRuleGeneralId: expenseTypeIds
      }
    })

    if (!response?.data?.ExpenseRuleOtherInfo) {
      showToast(t('expense-item-error-custom-groups'), 'error')
      return []
    }

    const customFieldsList = response.data.ExpenseRuleOtherInfo.map((item: any) => ({
      id: item.id,
      infoValue: item.infoValue,
      mandatory: item.mandatory,
      source: item.source,
      expenseRuleGeneralExpenseId: item.expenseRuleGeneralExpenseId,
      expenseGroupRef: item.expenseRuleGeneralExpense?.expenseGroupRef
    }))

    const customFieldsByType = customFieldsList.reduce((acc: { [key: string]: CustomField[] }, item: CustomField) => {
      if (!acc[item.expenseRuleGeneralExpenseId]) {
        acc[item.expenseRuleGeneralExpenseId] = []
      }
      acc[item.expenseRuleGeneralExpenseId].push(item)
      return acc
    }, {})

    setCustomFields(prev => ({
      ...prev,
      ...customFieldsByType
    }))

    return customFieldsList
  } catch {
    showToast(t('expense-item-error-custom-groups'), 'error')
    return []
  }
}

/**
 * Sets the expense date field if valid
 */
const setExpenseDate = (form: any, expenseDate: any): void => {
  if (!expenseDate) return

  try {
    const dateObj = dayjs(expenseDate)
    if (dateObj.isValid()) {
      form.setFieldsValue({ date: dateObj.toDate() })
    }
  } catch {}
}

/**
 * Creates a new position from expense item data
 */
const createNewPosition = (position: any, item: any): any => {
  const positionId = `position-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const newPosition = {
    id: positionId,
    expenseGroup: position.expenseGroup?.id,
    expenseType: undefined as string | undefined,
    amount: position.totalAmount,
    isReimbursable: position.reimbursable !== undefined ? position.reimbursable : true,
    costCenter: position.costCenter?.id || item.costCenter?.id,
    customField: '',
    persistedId: position.id,
    persistedVersion: position.version
  }

  // Extract custom field value if available
  if (
    position.additionalProperties?.customFields &&
    Array.isArray(position.additionalProperties.customFields) &&
    position.additionalProperties.customFields.length > 0
  ) {
    newPosition.customField = position.additionalProperties.customFields[0]?.value || ''
  }

  return newPosition
}

/**
 * Sets form values for position fields
 */
const setPositionFormValues = (form: any, position: any, item: any): void => {
  const formValues = {
    [`expenseGroup-0`]: position.expenseGroup?.id,
    [`amount-0`]: position.totalAmount,
    [`costCenter-0`]: position.costCenter?.id || item.costCenter?.id
  }
  form.setFieldsValue(formValues)
}

/**
 * Updates expense type field based on allowed types
 */
const updateExpenseTypeField = (
  form: any,
  position: any,
  newPosition: any,
  fetchedTypes: ExpenseType[],
  setPositions: (positions: any[]) => void
): void => {
  if (!position.expenseRuleGeneralExpenseId) return

  const allowedTypeIds = (fetchedTypes || []).map((typeItem: ExpenseType) => typeItem.id)
  const isTypeAllowed = allowedTypeIds.includes(position.expenseRuleGeneralExpenseId)

  form.setFieldsValue({
    [`expenseType-0`]: isTypeAllowed ? position.expenseRuleGeneralExpenseId : undefined
  })

  const updatedPositions = [...(form.getFieldValue('positions') || [newPosition])]
  if (updatedPositions[0]) {
    ;(updatedPositions[0] as any).expenseType = isTypeAllowed ? position.expenseRuleGeneralExpenseId : undefined
    setPositions(updatedPositions as any)
  }

  if (newPosition.customField) {
    form.setFieldsValue({ [`customField-0`]: newPosition.customField })
  }
}

/**
 * Processes expense group for a position
 */
const processExpenseGroup = async (
  position: any,
  newPosition: any,
  employeeRuleId: string | null | object,
  graphqlClient: any,
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  expenseTypes: { [classId: string]: any[] },
  setPositions: (positions: any[]) => void,
  handleExpenseGroupChange: any,
  form: any,
  t: ExpenseItemTranslateFn
): Promise<void> => {
  if (!position.expenseGroup?.id) return

  try {
    const fetchedTypes = await fetchExpenseTypes(
      position.expenseGroup.id,
      [newPosition],
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t
    )

    await handleExpenseGroupChange(
      position.expenseGroup.id,
      0,
      [newPosition],
      setPositions,
      expenseTypes,
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t,
      form
    )

    setTimeout(() => {
      updateExpenseTypeField(form, position, newPosition, fetchedTypes, setPositions)
    }, 500)
  } catch {
    showToast(t('expense-item-error-expense-types'), 'error')
  }
}

export const setOnePositionItem = async (
  expenseData: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  _setExpenseRequests: (requests: any[]) => void,
  handleExpenseGroupChange: any,
  graphqlClient: any,
  expenseTypes: { [classId: string]: any[] },
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  employeeRuleId: string | null | object,
  t: ExpenseItemTranslateFn
) => {
  if (!expenseData?.ExpenseItemByPk) return

  const item = expenseData.ExpenseItemByPk
  const position = item.expensePosition?.[0] || {}

  // Set basic fields
  form.setFieldsValue({ title: item.title })
  setExpenseDate(form, item.expenseDate)

  const isMultiPosition = item.multiplePositions || (item.expensePosition && item.expensePosition.length > 1)
  setMultiPosition(isMultiPosition)

  if (item.currency?.id) {
    form.setFieldsValue({ currency: item.currency.id })
  }

  if (item.costCenter?.id) {
    form.setFieldsValue({ costCenter: item.costCenter.id })
  }

  // Process position if available
  if (!position) return

  const newPosition = createNewPosition(position, item)
  setPositions([newPosition])
  setPositionFormValues(form, position, item)

  await processExpenseGroup(
    position,
    newPosition,
    employeeRuleId,
    graphqlClient,
    setExpenseTypes,
    expenseTypes,
    setPositions,
    handleExpenseGroupChange,
    form,
    t
  )
}

export const setMultiPositionItem = async (
  expenseData: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  handleExpenseGroupChange: any,
  handleExpenseTypeChange: any,
  graphqlClient: any,
  expenseTypes: { [classId: string]: any[] },
  setExpenseTypes: (types: { [classId: string]: any[] }) => void,
  customFields: { [expenseTypeId: string]: any[] },
  setCustomFields: (fields: any) => void,
  employeeRuleId: string | null | object,
  t: ExpenseItemTranslateFn
) => {
  if (!expenseData || !expenseData.ExpenseItemByPk) {
    return
  }

  const item = expenseData.ExpenseItemByPk

  form.setFieldsValue({
    title: item.title
  })

  if (item.expenseDate) {
    try {
      const dateObj = dayjs(item.expenseDate)
      if (dateObj.isValid()) {
        form.setFieldsValue({
          date: dateObj.toDate()
        })
      }
    } catch {}
  }

  setMultiPosition(true)

  if (item.currency?.id) {
    form.setFieldsValue({
      currency: item.currency.id
    })
  }

  if (item.expensePosition && item.expensePosition.length > 0) {
    const newPositions = item.expensePosition.map((position: any) => {
      let customFieldValue = ''

      if (
        position.additionalProperties?.customFields &&
        Array.isArray(position.additionalProperties.customFields) &&
        position.additionalProperties.customFields.length > 0
      ) {
        customFieldValue = position.additionalProperties.customFields[0]?.value || ''
      }

      return {
        expenseGroup: position.expenseGroup?.id,
        expenseType: position.expenseRuleGeneralExpenseId,
        amount: position.totalAmount,
        isReimbursable: position.reimbursable !== undefined ? position.reimbursable : true,
        costCenter: position.costCenter?.id || item.costCenter?.id,
        customField: customFieldValue,
        id: position.id || `pos-${Math.random().toString(36).substring(2, 9)}`, // Ensure each position has an ID
        persistedId: position.id,
        persistedVersion: position.version
      }
    })

    setPositions(newPositions)

    newPositions.forEach((pos: any, index: number) => {
      const formValues = {
        [`expenseGroup-${index}`]: pos.expenseGroup,
        [`amount-${index}`]: pos.amount,
        [`costCenter-${index}`]: pos.costCenter,
        [`isReimbursable-${index}`]: pos.isReimbursable
      }

      form.setFieldsValue(formValues)
    })

    const processExpenseGroups = async () => {
      for (let i = 0; i < newPositions.length; i++) {
        const position = newPositions[i]
        if (position.expenseGroup) {
          try {
            await handleExpenseGroupChange(
              position.expenseGroup,
              i,
              newPositions,
              setPositions,
              expenseTypes,
              employeeRuleId,
              graphqlClient,
              setExpenseTypes,
              t,
              form
            )
          } catch {
            showToast(t('expense-item-error-expense-group'), 'error')
          }
        }
      }

      setTimeout(() => {
        const originalPositions = item.expensePosition || []

        for (let i = 0; i < originalPositions.length; i++) {
          const position = originalPositions[i]
          if (position.expenseRuleGeneralExpenseId) {
            const currentGroup = form.getFieldValue(`expenseGroup-${i}`)
            const availableTypeIds =
              currentGroup && expenseTypes[currentGroup] ? expenseTypes[currentGroup].map((t: any) => t.id) : []
            form.setFieldsValue({
              [`expenseType-${i}`]: availableTypeIds.includes(position.expenseRuleGeneralExpenseId)
                ? position.expenseRuleGeneralExpenseId
                : undefined
            })

            if (
              position.additionalProperties?.customFields &&
              Array.isArray(position.additionalProperties.customFields) &&
              position.additionalProperties.customFields.length > 0
            ) {
              const customFieldValue = position.additionalProperties.customFields[0]?.value || ''

              form.setFieldsValue({
                [`customField-${i}`]: customFieldValue
              })

              newPositions[i].customField = customFieldValue
            }

            if (position.expenseRuleGeneralExpenseId) {
              handleExpenseTypeChange(
                position.expenseRuleGeneralExpenseId,
                i,
                newPositions,
                setPositions,
                customFields,
                graphqlClient,
                setCustomFields,
                t,
                form
              )
            }
          }
        }

        setPositions([...newPositions])
      }, 1000)
    }

    processExpenseGroups()
  }

  if (item.costCenter?.id) {
    form.setFieldsValue({
      costCenter: item.costCenter.id
    })
  }
}

export const setByEdit = async (
  expenseId: string,
  graphqlClient: any,
  form: any,
  setPositions: (positions: any[]) => void,
  setMultiPosition: (isMulti: boolean) => void,
  setExpenseRequests: (requests: any[]) => void,
  handleExpenseGroupChange: any,
  handleExpenseTypeChange: any,
  expenseTypes: { [classId: string]: any[] } = {},
  setExpenseTypes: (types: { [classId: string]: any[] }) => void = () => {},
  customFields: { [expenseTypeId: string]: any[] } = {},
  setCustomFields: (fields: any) => void = () => {},
  employeeRuleId: string | null | object = null,
  t: ExpenseItemTranslateFn = ((key, second) => (typeof second === 'string' ? second : key)) as ExpenseItemTranslateFn,
  setInitialItemValues?: (id: string, version: string | number) => void
) => {
  try {
    const response = await graphqlClient.query({
      query: fetchExpenseData,
      variables: {
        expenseId,
        activeUserLocale: getCurrentActiveUserLocale()
      }
    })

    if (response.data) {
      const item = response.data.ExpenseItemByPk

      // Set initial item values if the function is provided
      if (setInitialItemValues && item) {
        setInitialItemValues(item.id, item.version)
      }

      if (item && item.expensePosition && item.expensePosition.length > 1) {
        await setMultiPositionItem(
          response.data,
          form,
          setPositions,
          setMultiPosition,
          handleExpenseGroupChange,
          handleExpenseTypeChange,
          graphqlClient,
          expenseTypes,
          setExpenseTypes,
          customFields,
          setCustomFields,
          employeeRuleId,
          t
        )
      } else {
        await setOnePositionItem(
          response.data,
          form,
          setPositions,
          setMultiPosition,
          setExpenseRequests,
          handleExpenseGroupChange,
          graphqlClient,
          expenseTypes,
          setExpenseTypes,
          employeeRuleId,
          t
        )
      }
      try {
        if (item?.expenseRequest?.id) {
          form.setFieldsValue({ expenseRequestId: item.expenseRequest.id })
        } else form.setFieldsValue({ expenseRequestId: '0' })
      } catch {}
    }

    return response.data
  } catch {
    showToast(t('expense-item-error-data-process'), 'error')
    return null
  }
}

export const addRequests = (
  requestData: any,
  setExpenseRequests: (requests: any[]) => void,
  t: ExpenseItemTranslateFn
) => {
  try {
    if (!requestData || !requestData.data) {
      setExpenseRequests([
        {
          id: '0',
          title: t('expense-item-none')
        }
      ])
      return
    }

    const expenseRequests = requestData.data.ExpenseRequest || []

    const formattedRequests = prepareExpenseRequestsList(expenseRequests, t('expense-item-none'))

    setExpenseRequests(formattedRequests)
  } catch {
    showToast(t('expense-item-error-requests-fetch'), 'error')
    setExpenseRequests([
      {
        id: '0',
        title: t('expense-item-none')
      }
    ])
  }
}
