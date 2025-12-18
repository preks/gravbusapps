import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useMemo } from 'react'

import { Form, message } from 'antd'
import { ExpensePosition, ExpenseType, CostCenter, Currency, ExpenseGroup, CustomField } from '../types'
import { useTranslation } from '@newwork/nw-design-system'
import expenseItemTranslations from '../_i18n'

import {
  getCurrentActiveUserLocale,
  getCatalogValue,
  getTranslationFromI18nKeyAndLabel
} from '../../../../../../common/utils/windowUtils'
import {
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
  expenseRequestByCurrencyQuery
} from '../ExpenseItemQueries'
import { fetchEmployeeRule } from '../ExpenseItemQueries'
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
  setByEdit
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
  const { t: tNew } = useTranslation(expenseItemTranslations)
  // Wrapper function for backward compatibility with old translation pattern
  const t = (key: string, fallback?: string) => {
    return getTranslationFromI18nKeyAndLabel(key, fallback || key)
  }

  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState<FormStepType>(FORM_STEPS.START)
  const [loading, setLoading] = useState<boolean>(false)
  const [isInitialized, setIsInitialized] = useState<boolean>(false)
  const [fileList, setFileListState] = useState<any[]>([])
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
      showToast(
        t('lowcoder:create_expense_type_item.process_error_expense_group', 'Error processing expense groups'),
        'error'
      )
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

        // If embedded in a wizard or task, prefer the provided itemCurrency
        if (!effectiveCurrencyId && additionalData?.itemCurrency) {
          effectiveCurrencyId = additionalData.itemCurrency
        }

        // Fall back to default currency for brand new items
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

        // Get expenseRequestId from either the wizard or task payload
        const expenseRequestId =
          additionalData?.expenseRequestId || additionalData?.psi_taskPayload?.psi_initialParameters?.expenseRequest
        if (expenseRequestId) {
          form.setFieldsValue({ expenseRequestId })
        } else if (!isEditMode) {
          form.setFieldsValue({ expenseRequestId: '0' })
        }
      } catch {
        suppressRequestResetRef.current = false
      }
    }

    void hydrateRequestsForInitialCurrency()
  }, [catalogueDataResponse, accessToken, additionalData, expenseRuleError, isEditMode])

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
        showToast(
          t(
            'lowcoder:create_expense_type_item.process_error_expense_requests_fetch',
            'Error fetching expense requests'
          ),
          'error'
        )
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
      showToast(
        t('lowcoder:create_expense_type_item.process_error_ai_items', 'Error processing expense AI items'),
        'error'
      )
    }

    return result
  }, [generalDataResponse, employeeRuleId])

  const addRequestsWrapper = () => {
    if (!accessToken) {
      return
    }

    if (!catalogueDataResponse) {
      setExpenseRequests([
        {
          id: '0',
          name: t('lowcoder:create_expense_type_item.none', 'None')
        }
      ])
      return
    }

    try {
      addRequests(catalogueDataResponse, setExpenseRequests, t)
    } catch {
      showToast(
        t(
          'lowcoder:create_expense_type_item.process_error_expense_requests_fetch',
          'Error processing expense requests'
        ),
        'error'
      )

      setExpenseRequests([
        {
          id: '0',
          name: t('lowcoder:create_expense_type_item.none', 'None')
        }
      ])
    }
  }

  /**
   * Fetches employee rule data
   */
  const fetchEmployeeRuleData = async (employeeId: string, currentDate: string) => {
    try {
      const employeeRuleData = await fetchEmployeeRule(employeeId, currentDate, accessToken)

      if (employeeRuleData && employeeRuleData.expenseRuleId) {
        setEmployeeRuleId(employeeRuleData.expenseRuleId)
        setExpenseRuleError(null)
      } else {
        const errorMsg = t(
          'lowcoder:create_expense_item.missing_expense_rule_message',
          'There is no rule set for your user, please reach out to your administrator.'
        )
        setExpenseRuleError(errorMsg)
        setIsInitialized(true)
      }
    } catch {
      const errorMsg = t(
        'lowcoder:create_expense_item.missing_expense_rule_message',
        'There is no rule set for your user, please reach out to your administrator.'
      )
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
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
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
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
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
    setIsEditMode(true)
  }

  /**
   * Initializes cost centers for employee position
   */
  const initializeCostCenters = async (employeePosition: any, costCenterData: any) => {
    try {
      const updatedPositions = [...positions]
      const employeePositionCostCenterId = employeePosition[0]?.costCenterId
      const firstCostCenterId = costCenterData?.data?.userCostCenters?.[0]?.id

      if (employeePositionCostCenterId) {
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
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
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
      const errorMsg = tNew('currency-validation-unavailable')
      setReceiptCurrencyError(errorMsg)
      return false
    }

    if (!requestCurrency || !data?.currencyCode) {
      return true
    }

    if (requestCurrency.code === data.currencyCode) {
      return true
    }

    const detailedMessage = tNew('currency-mismatch-detail', {
      receiptCurrency: data.currencyCode,
      requestCurrency: requestCurrency.code
    } as Record<string, any>)

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

    const costCenterId = positions[0]?.costCenter || ''

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
      formValuesBatch[`amount-${idx}`] = pos.amount
      formValuesBatch[`costCenter-${idx}`] = pos.costCenter
      formValuesBatch[`isReimbursable-${idx}`] = pos.isReimbursable
    })
    form.setFieldsValue(formValuesBatch)
    setMultiPosition(newPositions.length > 1)
  }

  /**
   * Fetches missing expense types for positions
   */
  const fetchMissingExpenseTypes = async (newPositions: ExpensePosition[], data: any): Promise<void> => {
    const promises = newPositions.map(async (position, index) => {
      if (!position.expenseGroup || position.expenseType) return

      try {
        const types = await fetchExpenseTypesWrapper(position.expenseGroup)
        const expenseCode = data.items[index]?.expenseDetails?.expenseCode

        if (expenseCode) {
          const matchingType = types.find(type => type.code === expenseCode)
          if (matchingType) {
            const updatedPositions = [...newPositions]
            updatedPositions[index].expenseType = matchingType.id
            setPositions(updatedPositions)
            form.setFieldsValue({ [`expenseType-${index}`]: matchingType.id })
          }
        }
      } catch {
        showToast(
          t('lowcoder:create_expense_type_item.process_error_receipt_processing', 'Error processing receipt data'),
          'error'
        )
      }
    })

    await Promise.all(promises)
  }

  const setByReceipts = (receiptData: any): void => {
    if (!receiptData?.data) return

    try {
      const data = receiptData.data

      // Ensure we can validate against the configured request currency when provided
      if (
        additionalData?.itemCurrency &&
        (currencies.length === 0 || !currencies.some(currency => currency.id === additionalData.itemCurrency))
      ) {
        const errorMsg = t(
          'lowcoder:expense_item.currency_validation_unavailable',
          'Unable to validate the receipt currency against your expense rule. Please try again or contact your administrator.'
        )
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
      showToast(
        t('lowcoder:create_expense_type_item.process_error_receipt_processing', 'Error processing receipt data'),
        'error'
      )
    }
  }

  const handleFileUploadWrapper = async (files: File[]): Promise<any | null> => {
    if (!files || files.length === 0) {
      message.error(t('lowcoder:expense_item.no_files', 'No files selected for upload'))
      return null
    }

    try {
      setIsProcessingFiles(true)
      setIsFormDisabled(true)

      const result = await handleFileUpload(files, accessToken, aiGroupsAndTypes)

      if (result) {
        setByReceipts(result)
      }

      setCurrentStep('form')

      setIsProcessingFiles(false)
      setIsFormDisabled(false)

      return result
    } catch {
      showToast(
        t('lowcoder:create_expense_type_item.process_error_receipt_processing', 'Error processing receipt data'),
        'error'
      )

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
        accessToken,
        userInfo?.employeeDetails?.employeeId,
        additionalData,
        userInfo,
        itemValues || undefined,
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
        setCurrentStep('start')
      } else {
        dispatchProcessContinueEventIfEnabled(EVENTS.ABORT, {
          event: EVENTS.ABORT,
          pso_exitStrategy: 'abort',
          pso_completeNotification: {
            type: 'error',
            messageKey: getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_module.toast_notification_cancel_create_absence',
              'The action has been canceled.'
            )
          }
        })
      }
    } catch {
      showToast(t('lowcoder:create_expense_type_item.error_flows', 'Error in flow process'), 'error')
      form.resetFields()
      setPositions([DEFAULT_POSITION])
      setFileListState([])
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
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
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
      showToast(
        t('lowcoder:create_expense_type_item.position_deletion_warning', 'At least one position is required'),
        'warning'
      )
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
      additionalData,
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
