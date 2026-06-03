import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo } from 'react'

import { Form, message } from 'antd'
import { ExpensePosition, ExpenseType, CostCenter, Currency, ExpenseGroup, CustomField } from '../types'
import { useExpenseItemTranslation } from '../useExpenseItemTranslation'

import { getCurrentActiveUserLocale, getCatalogValue } from '../../../../../../common/utils/windowUtils'
import {
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
  expenseRequestByCurrencyQuery,
  getExpenseRuleCurrencyQuery
} from '../ExpenseItemQueries'
import { useEmployeeRuleQuery } from '../ExpenseItemQueries'
import {
  DEFAULT_CURRENCY_ID,
  DEFAULT_EMPLOYEE_ID,
  DEFAULT_POSITION,
  FORM_STEPS,
  FormStepType
} from '../constants/constants'
import { transformCurrencies } from '../utils/currencyUtils'
import { createGraphQLClient } from '../services/graphqlClient'
import {
  addRequests,
  fetchCustomFields,
  fetchExpenseTypes,
  calculateTotal,
  handleAddPosition,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleSubmit,
  handleFileUpload,
  setByEdit,
  normalizeReceiptData
} from './services'
import { showToast } from '../../../utils/notificationUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { EVENTS } from '../../../utils/constants'

interface ExpenseItemContextProps {
  form: any
  currentStep: 'start' | 'form'
  setCurrentStep: (step: 'start' | 'form') => void
  loading: boolean
  setLoading: (loading: boolean) => void
  isInitialized: boolean
  fileList: any[]
  setFileList: (files: any[]) => void
  supportingFileList: any[]
  setSupportingFileList: (files: any[]) => void
  requiredAttachmentInstructions: string[]
  isProcessingFiles: boolean
  setIsProcessingFiles: (isProcessing: boolean) => void
  isFormDisabled: boolean
  setIsFormDisabled: (isDisabled: boolean) => void
  multiPosition: boolean
  setMultiPosition: (isMulti: boolean) => void
  isEditMode: boolean
  setCurrentSelectedDate: (date: Date | null) => void
  isCreating: boolean

  positions: ExpensePosition[]
  setPositions: (positions: ExpensePosition[]) => void
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies: Currency[]
  expenseRequests: any[]

  employeeRuleId: string | null | object
  expenseRuleError: string | null
  receiptCurrencyError: string | null
  hasLinkedExpenseRequest: boolean
  additionalData?: any

  calculateTotal: () => number
  handleFileUpload: (files: File[]) => Promise<any | null>
  handleSubmit: () => Promise<void>
  handleCancel: (noDispatchEvent?: boolean) => void
  handleExpenseGroupChange: (value: string, positionIndex: number) => Promise<void>
  handleExpenseTypeChange: (value: string, positionIndex: number) => Promise<void>
  handleAddPosition: () => void
  handleRemovePosition: (positionId: string) => void
  handleAmountChange: (value: number, positionIndex: number) => void
  handleCurrencyChange: (currencyId: string) => Promise<void>
  fetchExpenseTypes: (classId: string) => Promise<ExpenseType[]>
  fetchCustomFields: (expenseTypeIds: string[]) => Promise<CustomField[]>
  setInitialItemValues: (id: string, version: string | number) => void
}

interface ExpenseItemProviderProps {
  children: ReactNode
  accessToken: string
  userInfo?: any
  additionalData?: any
}

export const ExpenseItemContext = createContext<ExpenseItemContextProps | undefined>(undefined)

export const ExpenseItemProvider: React.FC<ExpenseItemProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData
}): React.ReactNode => {
  const { t } = useExpenseItemTranslation()
  const { fetchEmployeeRule } = useEmployeeRuleQuery({ accessToken })

  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState<FormStepType>(FORM_STEPS.START)
  const [loading, setLoading] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [fileList, setFileListState] = useState<any[]>([])
  const [supportingFileList, setSupportingFileListState] = useState<any[]>([])
  const [isProcessingFiles, setIsProcessingFiles] = useState<boolean>(false)
  const [isFormDisabled, setIsFormDisabled] = useState<boolean>(false)
  const [multiPosition, setMultiPosition] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)

  const [positions, setPositions] = useState<ExpensePosition[]>([DEFAULT_POSITION])
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([])
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[]
  }>({})
  const [customFields, setCustomFields] = useState<{
    [expenseTypeId: string]: CustomField[]
  }>({})
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [expenseRequests, setExpenseRequests] = useState<any[]>([])

  const [employeeRuleId, setEmployeeRuleId] = useState<string | null | object>(null)
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false)
  const [expenseRuleError, setExpenseRuleError] = useState<string | null>(null)
  const [rerunRule, setRerunRule] = useState<boolean>(false)

  const [generalDataResponse, setGeneralDataResponse] = useState<any>(null)
  const [catalogueDataResponse, setCatalogueDataResponse] = useState<any>(null)

  const [userCostCenter, setUserCostCenter] = useState<string>('')
  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date | null>(null)
  const [itemValues, setItemValues] = useState<{ id: string; version: string | number } | null>(null)
  const [receiptCurrencyError, setReceiptCurrencyError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState<boolean>(false)
  const [hasLinkedExpenseRequest, setHasLinkedExpenseRequest] = useState<boolean>(false)

  const graphqlClient = useMemo(() => createGraphQLClient(accessToken), [accessToken])
  const { dispatchProcessContinueEventIfEnabled, getIsProcessEventDispatched } = useProcessEventState(additionalData)
  useEffect(() => {
    fetchInitialData()
  }, [accessToken, userInfo, employeeRuleId, firstRunVariable, rerunRule])

  useEffect(() => {
    if (!accessToken || !generalDataResponse || !catalogueDataResponse || expenseRuleError) {
      return
    }

    try {
      const expenseRuleGeneralExpense = generalDataResponse?.data?.ExpenseRuleGeneralExpense || []

      const uniqueExpenseGroupRefs = [
        ...new Set(
          typeof employeeRuleId === 'object' ? [] : expenseRuleGeneralExpense.map((item: any) => item.expenseGroupRef)
        )
      ]

      const expenseGroups = catalogueDataResponse?.data?.expenseGroup || []

      const matchingItems = expenseGroups.filter((item: any) => uniqueExpenseGroupRefs.includes(item.id))

      setExpenseGroups(matchingItems)
    } catch {
      showToast(t('expense-item-error-expense-group'), 'error')
      setExpenseGroups([])
    }
  }, [generalDataResponse, catalogueDataResponse, accessToken])

  const initialRequestsHydratedRef = useRef(false)

  useEffect(() => {
    if (!catalogueDataResponse || !accessToken || expenseRuleError || initialRequestsHydratedRef.current) {
      return
    }

    const hydrateRequestsForInitialCurrency = async () => {
      try {
        let effectiveCurrencyId: string | undefined = form.getFieldValue('currency')

        // If embedded in a wizard or task (item inside a request), use the provided itemCurrency (request currency)
        if (!effectiveCurrencyId && additionalData?.itemCurrency) {
          effectiveCurrencyId = additionalData.itemCurrency
        }

        // Standalone item or request-type expense: prefill with rule currency (separate query so we can use uuid!; only called when we have a rule id)
        if (!effectiveCurrencyId && typeof employeeRuleId === 'string' && employeeRuleId) {
          try {
            const ruleResp = await graphqlClient.query({
              query: getExpenseRuleCurrencyQuery,
              variables: { expenseRuleId: employeeRuleId }
            })
            effectiveCurrencyId = ruleResp?.data?.ExpenseRuleByPk?.currency?.id
          } catch {
            // fall back to default currency
          }
        }

        // Fall back to default currency for brand new items when no rule currency or not in request context
        if (!effectiveCurrencyId) {
          effectiveCurrencyId = DEFAULT_CURRENCY_ID
        }

        // Persist the chosen currency into the form (unless it already has one)
        if (!form.getFieldValue('currency') && effectiveCurrencyId) {
          form.setFieldsValue({ currency: effectiveCurrencyId })
        }

        // If a wizard forces a single currency, respect that flag
        if (typeof additionalData?.useSingleCurrency === 'boolean') {
          form.setFieldsValue({ fixedCurrency: additionalData.useSingleCurrency })
        }

        if (effectiveCurrencyId) {
          initialRequestsHydratedRef.current = true
          suppressRequestResetRef.current = true
          await handleCurrencyChangeWrapper(effectiveCurrencyId, { suppressRequestReset: true })
          suppressRequestResetRef.current = false
        } else {
          addRequestsWrapper()
          initialRequestsHydratedRef.current = true
        }

        // Get expenseRequestId from either the wizard or task payload.
        // Skip in edit mode: initializeEditMode already applies the correct value
        // after setByEdit completes, so we avoid overwriting it here.
        if (!isEditMode) {
          const expenseRequestId =
            additionalData?.expenseRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.expenseRequest
          if (expenseRequestId) {
            form.setFieldsValue({ expenseRequestId })
          } else {
            form.setFieldsValue({ expenseRequestId: '0' })
          }
        }
      } catch {
        suppressRequestResetRef.current = false
      }
    }

    void hydrateRequestsForInitialCurrency()
  }, [catalogueDataResponse, accessToken, additionalData, expenseRuleError, isEditMode, employeeRuleId])

  // Avoid refetch loops: track attempted (requestId|currency) hydrations
  const attemptedLabelHydrationsRef = useRef<Set<string>>(new Set())
  // Internal flag to avoid clearing request when currency is set programmatically (e.g. on init/label hydration)
  const suppressRequestResetRef = useRef(false)

  // Ensure expense request labels are available after edits/flows
  useEffect(() => {
    const selectedRequestId = form.getFieldValue('expenseRequestId')
    const currencyId = form.getFieldValue('currency')
    const hasLabel = Array.isArray(expenseRequests) && expenseRequests.some((r: any) => r?.id === selectedRequestId)

    if (!selectedRequestId || selectedRequestId === '0' || !currencyId || hasLabel) {
      return
    }

    const hydrateKey = `${selectedRequestId}|${currencyId}`
    if (attemptedLabelHydrationsRef.current.has(hydrateKey)) {
      return
    }
    attemptedLabelHydrationsRef.current.add(hydrateKey)

    suppressRequestResetRef.current = true
    handleCurrencyChangeWrapper(currencyId, { suppressRequestReset: true })
      .catch(() => {
        showToast(t('expense-item-error-requests-fetch'), 'error')
      })
      .finally(() => {
        suppressRequestResetRef.current = false
      })
  }, [expenseRequests])

  useEffect(() => {
    if (firstRunVariable === true) {
      setRerunRule(true)
      fetchInitialData()
    }
  }, [currentSelectedDate])
  const aiGroupsAndTypes = useMemo(() => {
    if (typeof employeeRuleId === 'object' || !generalDataResponse?.data.ExpenseRuleGeneralExpense) {
      return []
    }

    const uniqueLabels = new Map<string, boolean>()

    type ExpenseAIItem = {
      expenseCode: string
      expenseLabel: string
      expenseGroupCode: string
      expenseGroupLabel: string
    }

    const result: ExpenseAIItem[] = []

    try {
      generalDataResponse.data.ExpenseRuleGeneralExpense.forEach((item: any) => {
        if (!item || !item.name || !item.code || !item.expenseGroup) {
          return
        }

        let expenseLabel = item.name

        if (uniqueLabels.has(expenseLabel.toLowerCase())) {
          expenseLabel = `${item.name} (${item.code})`
        }

        if (uniqueLabels.has(expenseLabel.toLowerCase()) && item.expenseGroup.code) {
          expenseLabel = `${item.name} (${item.code}-${item.expenseGroup.code})`
        }

        uniqueLabels.set(expenseLabel.toLowerCase(), true)

        const expenseGroupCode = item.expenseGroup?.code || ''
        const expenseGroupLabel = item.expenseGroup ? getCatalogValue(item.expenseGroup) : ''

        result.push({
          expenseCode: item.code,
          expenseLabel: expenseLabel,
          expenseGroupCode: expenseGroupCode,
          expenseGroupLabel: expenseGroupLabel
        })
      })
    } catch {
      showToast(t('expense-item-error-ai-items'), 'error')
    }

    return result
  }, [generalDataResponse, employeeRuleId])

  const requiredAttachmentInstructions = useMemo(() => {
    const instructions = new Set<string>()

    positions.forEach(position => {
      if (!position.expenseGroup || !position.expenseType) {
        return
      }

      const typeConfig = expenseTypes[position.expenseGroup]?.find(type => type.id === position.expenseType)
      const instruction = typeConfig?.attachmentInstruction?.trim()
      if (instruction) {
        instructions.add(instruction)
      }
    })

    return Array.from(instructions)
  }, [positions, expenseTypes])

  useEffect(() => {
    if (requiredAttachmentInstructions.length === 0 && supportingFileList.length > 0) {
      setSupportingFileListState([])
    }
  }, [requiredAttachmentInstructions.length, supportingFileList.length])

  const addRequestsWrapper = () => {
    if (!accessToken) {
      return
    }

    if (!catalogueDataResponse) {
      setExpenseRequests([
        {
          id: '0',
          name: t('expense-item-none')
        }
      ])
      return
    }

    try {
      addRequests(catalogueDataResponse, setExpenseRequests, t)
    } catch {
      showToast(t('expense-item-error-requests-fetch'), 'error')

      setExpenseRequests([
        {
          id: '0',
          name: t('expense-item-none')
        }
      ])
    }
  }

  /**
   * Fetches employee rule data
   */
  const fetchEmployeeRuleData = async (employeeId: string, currentDate: string) => {
    try {
      const employeeRuleData = await fetchEmployeeRule(employeeId, currentDate)

      if (employeeRuleData && employeeRuleData.expenseRuleId) {
        setEmployeeRuleId(employeeRuleData.expenseRuleId)
        setExpenseRuleError(null)
      } else {
        const errorMsg = t('expense-item-missing-expense-rule')
        setExpenseRuleError(errorMsg)
        setIsInitialized(true)
      }
    } catch {
      const errorMsg = t('expense-item-missing-expense-rule')
      setExpenseRuleError(errorMsg)
      showToast(errorMsg, 'error')
      setIsInitialized(true)
    }
  }

  /**
   * Fetches general expense data
   */
  const fetchGeneralData = async () => {
    try {
      const generalData = await graphqlClient.query({
        query: fetchExpenseRuleGeneralData,
        variables: {
          expenseRuleId: employeeRuleId,
          activeUserLocale: getCurrentActiveUserLocale(),
          objectFilter: { useInExpense: true }
        }
      })
      setGeneralDataResponse(generalData)
    } catch {
      showToast(t('expense-item-error-data-fetch'), 'error')
    }
  }

  /**
   * Fetches catalogue data
   */
  const fetchCatalogueData = async (employeeId: string) => {
    try {
      const catalogueData = await graphqlClient.query({
        query: fetchExpenseCatalogueData,
        variables: {
          employeeId,
          expenseRuleId: employeeRuleId,
          activeUserLocale: getCurrentActiveUserLocale(),
          objectFilter: { useInExpense: true }
        }
      })
      setCatalogueDataResponse(catalogueData)
      return catalogueData
    } catch {
      showToast(t('expense-item-error-data-fetch'), 'error')
      return null
    }
  }

  /**
   * Handles edit mode initialization
   */
  const initializeEditMode = async (expenseId: string) => {
    setCurrentStep('form')
    const editData = await setByEdit(
      expenseId,
      graphqlClient,
      form,
      setPositions,
      setMultiPosition,
      setExpenseRequests,
      handleExpenseGroupChange,
      handleExpenseTypeChange,
      expenseTypes,
      setExpenseTypes,
      customFields,
      setCustomFields,
      employeeRuleId,
      t,
      setInitialItemValues
    )

    // Check if the expense item is linked to any expense request.
    // Also treat it as linked when the wizard embeds this form with an expenseRequestId
    // (even if the item has no backend link yet) so the currency field is locked.
    const linkedRequest = editData?.ExpenseItemByPk?.expenseRequest
    const isEmbeddedWithRequest = !!additionalData?.expenseRequestId && additionalData.expenseRequestId !== '0'
    setHasLinkedExpenseRequest(!!linkedRequest?.id || isEmbeddedWithRequest)

    try {
      const itemCurrencyId = editData?.ExpenseItemByPk?.currency?.id || form.getFieldValue('currency')
      if (itemCurrencyId) {
        suppressRequestResetRef.current = true
        await handleCurrencyChangeWrapper(itemCurrencyId, { suppressRequestReset: true })
        suppressRequestResetRef.current = false
      }
    } catch {
      suppressRequestResetRef.current = false
    }

    // If the item has no backend link but the wizard passes one, apply it now.
    // setByEdit sets expenseRequestId:'0' for unlinked items; we override it here
    // after all async work is done so it wins any race with hydrateRequestsForInitialCurrency.
    if (!linkedRequest?.id) {
      const wizardRequestId = additionalData?.expenseRequestId
      if (wizardRequestId) {
        form.setFieldsValue({ expenseRequestId: wizardRequestId })
      }
    }

    // Clear fixedCurrency so the currency field is always editable when editing
    // a standalone item. The wizard may have set this from a previous create-item flow.
    form.setFieldsValue({ fixedCurrency: false })

    setIsEditMode(true)
  }

  /**
   * Initializes cost centers for employee position
   */
  const initializeCostCenters = async (employeePosition: any, costCenterData: any) => {
    try {
      const updatedPositions = [...positions]
      const allCostCenters = costCenterData?.data?.userCostCenters || []
      const employeePositionCostCenterId = employeePosition[0]?.costCenterId
      const firstCostCenterId = allCostCenters[0]?.id
      const isValidCostCenter =
        employeePositionCostCenterId && allCostCenters.some((c: any) => c.id === employeePositionCostCenterId)

      if (isValidCostCenter) {
        updatedPositions[0].costCenter = employeePositionCostCenterId
        setUserCostCenter(employeePositionCostCenterId)
      } else if (firstCostCenterId) {
        updatedPositions[0].costCenter = firstCostCenterId
        setUserCostCenter(firstCostCenterId)
      }

      setPositions(updatedPositions)

      if (form && updatedPositions[0]?.costCenter) {
        form.setFieldsValue({
          [`costCenter-0`]: updatedPositions[0].costCenter
        })
      }
    } catch {}
  }

  /**
   * Initializes currencies from catalogue data
   */
  const initializeCurrencies = (catalogueData: any) => {
    try {
      const currencyData = catalogueData?.data?.currency
      if (currencyData && Array.isArray(currencyData)) {
        const finalCurrencies = transformCurrencies(currencyData)
        setCurrencies(finalCurrencies)
      } else {
        setCurrencies([])
      }
    } catch {
      setCurrencies([])
    }
  }

  const fetchInitialData = async () => {
    try {
      if (!accessToken || !userInfo) {
        return
      }

      const currentDate = currentSelectedDate ? currentSelectedDate.toISOString() : new Date().toISOString()
      const employeeIdValue = userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID

      if (!employeeIdValue) {
        return
      }

      // Fetch employee rule
      await fetchEmployeeRuleData(employeeIdValue, currentDate)

      // Fetch general data
      await fetchGeneralData()

      // Only fetch catalogue data if not rerunning rule
      if (rerunRule === false) {
        const catalogueData = await fetchCatalogueData(employeeIdValue)

        if (firstRunVariable === false && catalogueData?.data) {
          const employeePosition = catalogueData?.data?.EmployeePosition || []
          const structureId = employeePosition[0]?.structureId || ''
          const expenseIdValue = additionalData?.psi_taskPayload?.psi_initialParameters?.expenseId

          // Handle edit mode
          if (expenseIdValue) {
            await initializeEditMode(expenseIdValue)
          }

          // Fetch and set cost centers
          let costCenterData
          try {
            costCenterData = await graphqlClient.query({
              query: getStructureCostCenter,
              variables: { structureId }
            })
            const userCostCenters = costCenterData?.data?.userCostCenters || []
            setCostCenters(userCostCenters)
          } catch {
            setCostCenters([])
          }

          // Initialize cost centers for positions only when creating a new item.
          // In edit mode, the backend values (hydrated via setByEdit) must not be overridden.
          if (!expenseIdValue) {
            await initializeCostCenters(employeePosition, costCenterData)
          }

          // Initialize currencies
          initializeCurrencies(catalogueData)

          setFirstRunVariable(true)
        }
      }
      setRerunRule(false)
    } catch {
      showToast(t('expense-item-error-data-fetch'), 'error')
    } finally {
      setIsInitialized(true)
    }
  }

  const fetchExpenseTypesWrapper = async (groupId: string): Promise<ExpenseType[]> => {
    return await fetchExpenseTypes(groupId, positions, employeeRuleId, graphqlClient, setExpenseTypes, t)
  }

  const fetchCustomFieldsWrapper = async (expenseTypeIds: string[]): Promise<CustomField[]> => {
    return await fetchCustomFields(expenseTypeIds, graphqlClient, setCustomFields, t)
  }

  const calculateTotalWrapper = (): number => {
    return calculateTotal(positions)
  }

  const validateReceiptCurrency = (data: any): boolean => {
    setReceiptCurrencyError(null)

    if (!additionalData?.itemCurrency) {
      return true
    }

    const requestCurrency = currencies.find(c => c.id === additionalData.itemCurrency)

    if (additionalData?.useSingleCurrency && !requestCurrency) {
      const errorMsg = t('currency-validation-unavailable')
      setReceiptCurrencyError(errorMsg)
      return false
    }

    if (!requestCurrency || !data?.currencyCode) {
      return true
    }

    if (requestCurrency.code === data.currencyCode) {
      return true
    }

    const detailedMessage = t('currency-mismatch-detail', {
      receiptCurrency: data.currencyCode,
      requestCurrency: requestCurrency.code
    })

    setReceiptCurrencyError(detailedMessage)

    return false
  }

  const parseInvoiceDate = (invoiceDate: any): Date | null => {
    try {
      let dateValue: Date

      if (typeof invoiceDate === 'string') {
        if (invoiceDate.includes('T')) {
          dateValue = new Date(invoiceDate)
        } else {
          const [year, month, day] = invoiceDate.split('-').map(Number)
          dateValue = new Date(year, month - 1, day)
        }
      } else {
        dateValue = new Date(invoiceDate)
      }

      const isValidDate = !Number.isNaN(dateValue.getTime())
      return isValidDate ? dateValue : null
    } catch {
      return null
    }
  }

  const populateBasicFields = (data: any): void => {
    if (data.vendor?.name) {
      form.setFieldsValue({ title: data.vendor.name })
    }

    if (data.invoiceDate) {
      const dateValue = parseInvoiceDate(data.invoiceDate)
      if (dateValue) {
        form.setFieldsValue({ date: dateValue })
      }
    }

    if (data.currencyCode) {
      const currencyId = currencies.find(c => c.code === data.currencyCode)?.id
      if (currencyId) {
        form.setFieldsValue({ currency: currencyId })
      }
    }
  }

  /**
   * Matches expense group from receipt item
   */
  const matchExpenseGroup = (item: any): string => {
    if (!item.expenseDetails?.expenseGroupCode) return ''

    // Try direct match first
    const matchingGroup = expenseGroups.find(group => group.code === item.expenseDetails.expenseGroupCode)
    if (matchingGroup) return matchingGroup.id

    // Try AI match
    const aiMatch = aiGroupsAndTypes.find(
      ai =>
        ai.expenseGroupCode === item.expenseDetails.expenseGroupCode &&
        ai.expenseCode === item.expenseDetails.expenseCode
    )

    if (aiMatch) {
      const aiMatchingGroup = expenseGroups.find(group => group.code === aiMatch.expenseGroupCode)
      return aiMatchingGroup?.id || ''
    }

    return ''
  }

  /**
   * Matches expense type from receipt item
   */
  const matchExpenseType = (item: any, groupId: string): string => {
    if (!item.expenseDetails?.expenseCode || !groupId || !expenseTypes[groupId]) {
      return ''
    }

    const matchingType = expenseTypes[groupId].find(type => type.code === item.expenseDetails.expenseCode)
    return matchingType?.id || ''
  }

  /**
   * Creates expense positions from receipt items
   */
  const createPositionsFromReceipt = (data: any): ExpensePosition[] => {
    if (!data.items || data.items.length === 0) return []

    const rawCostCenterId = positions[0]?.costCenter || ''
    const costCenterId = costCenters.some(c => c.id === rawCostCenterId) ? rawCostCenterId : costCenters[0]?.id || ''

    return data.items.map((item: any, index: number) => {
      const expenseGroupId = matchExpenseGroup(item)
      const expenseTypeId = matchExpenseType(item, expenseGroupId)

      return {
        id: `position-${Date.now()}-${index}`,
        expenseGroup: expenseGroupId,
        expenseType: expenseTypeId,
        amount: item.totalPrice || 0,
        costCenter: costCenterId,
        isReimbursable: true,
        customField: ''
      }
    })
  }

  /**
   * Syncs positions to form fields
   */
  const syncPositionsToForm = (newPositions: ExpensePosition[]): void => {
    const formValuesBatch: Record<string, any> = {}
    newPositions.forEach((pos, idx) => {
      formValuesBatch[`expenseGroup-${idx}`] = pos.expenseGroup || undefined
      formValuesBatch[`expenseType-${idx}`] = pos.expenseType || undefined
      formValuesBatch[`amount-${idx}`] = pos.amount
      formValuesBatch[`costCenter-${idx}`] = pos.costCenter
      formValuesBatch[`isReimbursable-${idx}`] = pos.isReimbursable
    })
    form.setFieldsValue(formValuesBatch)
    setMultiPosition(newPositions.length > 1)
  }

  /**
   * Fetches missing expense types for positions whose group is known but type wasn't resolved.
   * Uses a single fetch covering all needed groups to avoid race conditions on setExpenseTypes.
   */
  const fetchMissingExpenseTypes = async (newPositions: ExpensePosition[], data: any): Promise<void> => {
    const missingGroupIds = [
      ...new Set(newPositions.filter(pos => pos.expenseGroup && !pos.expenseType).map(pos => pos.expenseGroup))
    ]
    if (missingGroupIds.length === 0) return

    try {
      const allTypes = await fetchExpenseTypes(
        missingGroupIds[0],
        newPositions,
        employeeRuleId,
        graphqlClient,
        setExpenseTypes,
        t
      )

      const typesByGroup: Record<string, ExpenseType[]> = {}
      allTypes.forEach((type: ExpenseType) => {
        if (!typesByGroup[type.classId]) typesByGroup[type.classId] = []
        typesByGroup[type.classId].push(type)
      })

      const updatedPositions = newPositions.map((position, index) => {
        if (position.expenseType || !position.expenseGroup) return position

        const groupTypes = typesByGroup[position.expenseGroup]
        if (!groupTypes) return position

        const expenseCode = data.items[index]?.expenseDetails?.expenseCode
        if (!expenseCode) return position

        const matchingType = groupTypes.find((type: ExpenseType) => type.code === expenseCode)
        if (!matchingType) return position

        return { ...position, expenseType: matchingType.id }
      })

      setPositions(updatedPositions)
      const formBatch: Record<string, any> = {}
      updatedPositions.forEach((pos, idx) => {
        if (pos.expenseType) {
          formBatch[`expenseType-${idx}`] = pos.expenseType
        }
      })
      form.setFieldsValue(formBatch)
    } catch {
      showToast(t('expense-item-error-receipt-processing'), 'error')
    }
  }

  const setByReceipts = (receiptData: any): void => {
    if (!receiptData?.data) return

    try {
      const rawData = receiptData.data
      const data = normalizeReceiptData(rawData)

      // Ensure we can validate against the configured request currency when provided
      if (
        additionalData?.itemCurrency &&
        (currencies.length === 0 || !currencies.some(currency => currency.id === additionalData.itemCurrency))
      ) {
        const errorMsg = t('currency-validation-unavailable')
        setReceiptCurrencyError(errorMsg)
        return
      }

      // Validate currency match
      if (!validateReceiptCurrency(data)) return

      // Populate basic form fields
      populateBasicFields(data)

      // Process items and create positions
      const newPositions = createPositionsFromReceipt(data)
      if (newPositions.length === 0) return

      setPositions(newPositions)
      syncPositionsToForm(newPositions)

      // Fetch missing expense types asynchronously
      fetchMissingExpenseTypes(newPositions, data)
    } catch {
      showToast(t('expense-item-error-receipt-processing'), 'error')
    }
  }

  const handleFileUploadWrapper = async (files: File[]): Promise<any | null> => {
    if (!files || files.length === 0) {
      message.error(t('expense-item-no-files'))
      return null
    }

    try {
      setIsProcessingFiles(true)
      setIsFormDisabled(true)

      const result = await handleFileUpload(files, accessToken, aiGroupsAndTypes, t)

      if (result) {
        setByReceipts(result)
      }

      setCurrentStep('form')

      setIsProcessingFiles(false)
      setIsFormDisabled(false)

      return result
    } catch {
      showToast(t('expense-item-error-receipt-processing'), 'error')

      setIsProcessingFiles(false)
      setIsFormDisabled(false)

      setCurrentStep('form')

      return null
    }
  }

  const handleSubmitWrapper = async (): Promise<void> => {
    // Block submission if receipt currency doesn't match request currency
    if (receiptCurrencyError) {
      showToast(receiptCurrencyError, 'error')
      throw new Error(receiptCurrencyError)
    }

    // Show overlay spinner for 1 second
    setIsCreating(true)
    const startTime = Date.now()
    const spinnerTimeout = setTimeout(() => {
      setIsCreating(false)
    }, 1000)

    try {
      return await handleSubmit(
        form,
        positions,
        customFields,
        employeeRuleId,
        catalogueDataResponse,
        multiPosition,
        setPositions,
        setFileListState,
        setCurrentStep,
        setLoading,
        t,
        fileList,
        supportingFileList,
        accessToken,
        userInfo?.employeeDetails?.employeeId,
        additionalData,
        userInfo,
        itemValues || undefined,
        setSupportingFileListState,
        getIsProcessEventDispatched,
        dispatchProcessContinueEventIfEnabled
      )
    } finally {
      // Ensure spinner is hidden after exactly 1 second total
      clearTimeout(spinnerTimeout)
      const elapsedTime = Date.now() - startTime
      const remainingTime = Math.max(0, 1000 - elapsedTime)
      setTimeout(() => {
        setIsCreating(false)
      }, remainingTime)
    }
  }

  const handleCancelWrapper = (noDispatchEvent: boolean = false) => {
    try {
      if (noDispatchEvent) {
        form.resetFields()
        setPositions([DEFAULT_POSITION])
        setFileList([])
        setSupportingFileListState([])
        setCurrentStep('start')
      } else {
        dispatchProcessContinueEventIfEnabled(EVENTS.ABORT, {
          event: EVENTS.ABORT,
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: t('expense-item-action-canceled')
          }
        })
      }
    } catch {
      showToast(t('expense-item-error-flows'), 'error')
      form.resetFields()
      setPositions([DEFAULT_POSITION])
      setFileListState([])
      setSupportingFileListState([])
      setCurrentStep('start')
    }
  }

  const handleExpenseGroupChangeWrapper = async (value: string, positionIndex: number): Promise<void> => {
    await handleExpenseGroupChange(
      value,
      positionIndex,
      positions,
      setPositions,
      expenseTypes,
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t,
      form
    )
  }

  const handleCurrencyChangeWrapper = async (
    currencyId: string,
    options?: { suppressRequestReset?: boolean }
  ): Promise<void> => {
    if (!accessToken || !userInfo) {
      return
    }
    try {
      const employeeIdValue = userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID

      if (!employeeIdValue) {
        return
      }

      const currentRequestId = form.getFieldValue('expenseRequestId')
      if (
        isEditMode &&
        !options?.suppressRequestReset &&
        !suppressRequestResetRef.current &&
        currentRequestId &&
        currentRequestId !== '0'
      ) {
        form.setFieldsValue({ expenseRequestId: undefined })
      }

      const expenseRequestByCurrency = await graphqlClient.query({
        query: expenseRequestByCurrencyQuery,
        variables: {
          employeeId: employeeIdValue,
          givenCurrency: currencyId
        }
      })

      addRequests(expenseRequestByCurrency, setExpenseRequests, t)
    } catch {
      showToast(t('expense-item-error-data-fetch'), 'error')
    }
  }

  const handleExpenseTypeChangeWrapper = async (value: string, positionIndex: number): Promise<void> => {
    await handleExpenseTypeChange(
      value,
      positionIndex,
      positions,
      setPositions,
      customFields,
      graphqlClient,
      setCustomFields,
      t,
      form
    )
  }

  const handleAddPositionWrapper = (): void => {
    handleAddPosition(positions, setPositions, userCostCenter, form)
  }

  const handleRemovePositionWrapper = (positionId: string): void => {
    if (positions.length <= 1) {
      showToast(t('expense-item-position-deletion-warning'), 'warning')
      return
    }

    const positionIndex = positions.findIndex(pos => pos.id === positionId)
    if (positionIndex === -1) return

    const updatedPositions = positions.filter(pos => pos.id !== positionId)

    const formValues = form.getFieldsValue()

    const fieldsToReset = []
    for (let i = 0; i < positions.length; i++) {
      fieldsToReset.push(
        `expenseGroup-${i}`,
        `expenseType-${i}`,
        `amount-${i}`,
        `currency-${i}`,
        `costCenter-${i}`,
        `description-${i}`,
        `date-${i}`,
        `isReimbursable-${i}`
      )
    }
    form.resetFields(fieldsToReset)

    setPositions(updatedPositions)

    const newFormValues: Record<string, any> = {}

    updatedPositions.forEach((position, newIndex) => {
      const oldIndex = positions.findIndex(pos => pos.id === position.id)
      if (oldIndex !== -1) {
        newFormValues[`expenseGroup-${newIndex}`] = formValues[`expenseGroup-${oldIndex}`]
        newFormValues[`expenseType-${newIndex}`] = formValues[`expenseType-${oldIndex}`]
        newFormValues[`amount-${newIndex}`] = formValues[`amount-${oldIndex}`]
        newFormValues[`currency-${newIndex}`] = formValues[`currency-${oldIndex}`]
        newFormValues[`costCenter-${newIndex}`] = formValues[`costCenter-${oldIndex}`]
        newFormValues[`description-${newIndex}`] = formValues[`description-${oldIndex}`]
        newFormValues[`date-${newIndex}`] = formValues[`date-${oldIndex}`]
        newFormValues[`isReimbursable-${newIndex}`] = formValues[`isReimbursable-${oldIndex}`]
      }
    })

    form.setFieldsValue(newFormValues)
  }

  const handleAmountChangeWrapper = (value: number, positionIndex: number): void => {
    const updatedPositions = [...positions]
    if (updatedPositions[positionIndex]) {
      updatedPositions[positionIndex].amount = value
      setPositions(updatedPositions)
    }
  }

  const setInitialItemValues = (id: string, version: string | number) => {
    setItemValues({ id, version })
  }

  const setFileList = (files: any[]) => {
    setFileListState(files)

    // Clear currency error when all files are removed
    // When multiple files are uploaded together, they're treated as a batch
    // User must remove all and re-upload only valid receipts
    if (!files || files.length === 0) {
      setReceiptCurrencyError(null)
    }
  }

  const setSupportingFileList = (files: any[]) => {
    setSupportingFileListState(files)
  }

  const contextValue: ExpenseItemContextProps = useMemo(
    () => ({
      form,
      currentStep,
      setCurrentStep,
      loading,
      setLoading,
      isInitialized,
      fileList,
      setFileList,
      supportingFileList,
      setSupportingFileList,
      requiredAttachmentInstructions,
      isProcessingFiles,
      setIsProcessingFiles,
      isFormDisabled,
      setIsFormDisabled,
      multiPosition,
      setMultiPosition,
      isEditMode,
      setCurrentSelectedDate,
      isCreating,
      positions,
      setPositions,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      expenseRequests,
      employeeRuleId,
      expenseRuleError,
      receiptCurrencyError,
      hasLinkedExpenseRequest,
      additionalData,
      calculateTotal: calculateTotalWrapper,
      handleFileUpload: handleFileUploadWrapper,
      handleSubmit: handleSubmitWrapper,
      handleCancel: handleCancelWrapper,
      handleExpenseGroupChange: handleExpenseGroupChangeWrapper,
      handleExpenseTypeChange: handleExpenseTypeChangeWrapper,
      handleAddPosition: handleAddPositionWrapper,
      handleRemovePosition: handleRemovePositionWrapper,
      handleAmountChange: handleAmountChangeWrapper,
      handleCurrencyChange: handleCurrencyChangeWrapper,
      fetchExpenseTypes: fetchExpenseTypesWrapper,
      fetchCustomFields: fetchCustomFieldsWrapper,
      setInitialItemValues: setInitialItemValues
    }),
    [
      form,
      currentStep,
      loading,
      isInitialized,
      fileList,
      supportingFileList,
      isProcessingFiles,
      isFormDisabled,
      multiPosition,
      isEditMode,
      isCreating,
      positions,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      expenseRequests,
      employeeRuleId,
      expenseRuleError,
      receiptCurrencyError,
      hasLinkedExpenseRequest,
      additionalData,
      requiredAttachmentInstructions,
      calculateTotalWrapper,
      handleFileUploadWrapper,
      handleSubmitWrapper,
      handleCancelWrapper,
      handleExpenseGroupChangeWrapper,
      handleExpenseTypeChangeWrapper,
      handleAddPositionWrapper,
      handleRemovePositionWrapper,
      handleAmountChangeWrapper,
      handleCurrencyChangeWrapper,
      fetchExpenseTypesWrapper,
      fetchCustomFieldsWrapper
    ]
  )

  return <ExpenseItemContext.Provider value={contextValue}>{children}</ExpenseItemContext.Provider>
}

export const useExpenseItem = () => {
  const context = useContext(ExpenseItemContext)
  if (context === undefined) {
    throw new Error('useExpenseItem must be used within an ExpenseItemProvider')
  }
  return context
}
