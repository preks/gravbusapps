import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { Form } from 'antd'
import { ExpenseType, CostCenter, Currency, ExpenseGroup, CustomField } from '../types'

import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  fetchExpenseCatalogueData,
  fetchExpenseRuleGeneralData,
  getStructureCostCenter,
  fetchExpenseData,
  fetchEmployeeRule
} from '../ExpensePlanItemQueries'
import { transformCurrencies } from '../../expense-item/utils/currencyUtils'
import { createGraphQLClient } from '../../expense-item/services/graphqlClient'
import { fetchExpenseTypes, fetchCustomFields } from '../../expense-item/context/services/dataFetchers'
import { showToast } from '../../../utils/notificationUtils'
import {
  handleSubmit,
  handleCancel,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleCurrencyChange
} from '../services/eventHandlers'
import { DEFAULT_EMPLOYEE_ID } from '../../expense-item/constants/constants'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { DEFAULT_CURRENCY_CODE } from '../constants'

interface ExpensePlanItemContextProps {
  form: any
  loading: boolean
  setLoading: (loading: boolean) => void
  isFormDisabled: boolean
  setIsFormDisabled: (isDisabled: boolean) => void
  isEditMode: boolean
  setCurrentSelectedDate: (date: Date | null) => void

  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies: Currency[]

  employeeRuleId: string | null | object
  expenseRuleError: string | null
  itemValues: { id: string; version: string | number } | null
  additionalData?: any

  handleSubmit: () => Promise<void>
  handleCancel: () => void
  handleExpenseGroupChange: (value: string) => Promise<void>
  handleExpenseTypeChange: (value: string) => Promise<void>
  handleCurrencyChange: (currencyId: string) => Promise<void>
  fetchExpenseTypes: (classId: string) => Promise<ExpenseType[]>
  fetchCustomFields: (expenseTypeIds: string[]) => Promise<CustomField[]>
  setInitialItemValues: (id: string, version: string | number) => void
}

interface ExpensePlanItemProviderProps {
  children: ReactNode
  accessToken: string
  userInfo?: any
  additionalData?: any
}

export const ExpensePlanItemContext = createContext<ExpensePlanItemContextProps | undefined>(undefined)

export const ExpensePlanItemProvider: React.FC<ExpensePlanItemProviderProps> = ({
  children,
  accessToken,
  userInfo,
  additionalData
}): React.ReactNode => {
  const t = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(key, fallback)
  const { dispatchProcessContinueEventIfEnabled, getIsProcessEventDispatched } = useProcessEventState(additionalData)

  const [form] = Form.useForm()
  const [loading, setLoading] = useState<boolean>(false)
  const [isFormDisabled, setIsFormDisabled] = useState<boolean>(false)
  const [isEditMode, setIsEditMode] = useState<boolean>(false)
  const [expensePlanId, setExpensePlanId] = useState<string>('')
  const [expenseGroups, setExpenseGroups] = useState<ExpenseGroup[]>([])
  const [expenseTypes, setExpenseTypes] = useState<{
    [classId: string]: ExpenseType[]
  }>({})
  const [customFields, setCustomFields] = useState<{
    [expenseTypeId: string]: CustomField[]
  }>({})
  const [costCenters, setCostCenters] = useState<CostCenter[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  const [employeeRuleId, setEmployeeRuleId] = useState<string | null | object>(null)
  const [firstRunVariable, setFirstRunVariable] = useState<boolean>(false)
  const [expenseRuleError, setExpenseRuleError] = useState<string | null>(null)
  const [rerunRule, setRerunRule] = useState<boolean>(false)
  const [itemValues, setItemValues] = useState<{ id: string; version: string | number } | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userCostCenter, setUserCostCenter] = useState<string>('')

  const [generalDataResponse, setGeneralDataResponse] = useState<any>(null)
  const [catalogueDataResponse, setCatalogueDataResponse] = useState<any>(null)

  const [currentSelectedDate, setCurrentSelectedDate] = useState<Date | null>(null)

  const graphqlClient = useMemo(() => createGraphQLClient(accessToken), [accessToken])

  useEffect(() => {
    fetchInitialData()
  }, [accessToken, userInfo, employeeRuleId, rerunRule])

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

  useEffect(() => {
    if (catalogueDataResponse && accessToken && !expenseRuleError) {
      addCurrencyWrapper()
      const expensePlanId =
        additionalData?.expensePlanId || additionalData?.psi_taskPayload?.psi_initialParameters?.expensePlan
      // Set expensePlanId in form
      if (expensePlanId) {
        setExpensePlanId(expensePlanId)
      }
      if (additionalData?.itemCurrency && currencies.length > 0) {
        const currencyToSet = currencies.find(c => c.id === additionalData.itemCurrency)
        if (currencyToSet) {
          if (typeof additionalData?.useSingleCurrency === 'boolean') {
            form.setFieldsValue({ fixedCurrency: additionalData.useSingleCurrency })
          }
          form.setFieldsValue({ currency: currencyToSet.id })
        }
      } else if (currencies.length > 0) {
        form.setFieldsValue({ currency: currencies[0].id })
      }
      const expensePlanItemId =
        additionalData?.expensePlanItemId || additionalData?.psi_taskPayload?.psi_initialParameters?.expensePlanItem
      if (expensePlanItemId) {
        setIsEditMode(true)
        setByEditWrapper(expensePlanItemId)
      }
    }
  }, [catalogueDataResponse, accessToken, expenseRuleError])

  useEffect(() => {
    if (firstRunVariable === true) {
      setRerunRule(true)
      fetchInitialData()
    }
  }, [currentSelectedDate])

  const addCurrencyWrapper = () => {
    try {
      const transformedCurrencies = transformCurrencies(catalogueDataResponse?.data?.currency || [])
      setCurrencies(transformedCurrencies)

      // Set default currency if available
      if (transformedCurrencies.length > 0) {
        const defaultCurrency =
          transformedCurrencies.find(currency => currency.code === DEFAULT_CURRENCY_CODE) || transformedCurrencies[0]

        form.setFieldsValue({
          currency: defaultCurrency.id
        })
      }
    } catch {
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
    }
  }

  /**
   * Fetches and sets employee rule data
   */
  const fetchEmployeeRuleData = async (employeeId: string, currentDate: string): Promise<string | null> => {
    try {
      const employeeRuleData = await fetchEmployeeRule(employeeId, currentDate, accessToken)

      if (employeeRuleData?.expenseRuleId) {
        setEmployeeRuleId(employeeRuleData.expenseRuleId)
        setExpenseRuleError(null)
        return employeeRuleData.expenseRuleId
      }

      const errorMessage = t(
        'lowcoder:create_expense_item.missing_expense_rule_message',
        'There is no rule set for your user, please reach out to your administrator.'
      )
      setExpenseRuleError(errorMessage)
      return null
    } catch {
      const errorMessage = t(
        'lowcoder:create_expense_item.missing_expense_rule_message',
        'There is no rule set for your user, please reach out to your administrator.'
      )
      setExpenseRuleError(errorMessage)
      showToast(errorMessage, 'error')
      return null
    }
  }

  /**
   * Fetches general data for expense rule
   */
  const fetchGeneralData = async (): Promise<void> => {
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
   * Fetches catalogue data for employee
   */
  const fetchCatalogueData = async (employeeId: string): Promise<any> => {
    try {
      const catalogueData = await graphqlClient.query({
        query: fetchExpenseCatalogueData,
        variables: {
          employeeId: employeeId,
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
   * Sets default cost center from employee position or first available
   */
  const setDefaultCostCenter = (userCostCenters: any[], employeePosition: any[]): void => {
    if (userCostCenters.length === 0) return

    const employeePositionCostCenterId = employeePosition[0]?.costCenterId
    const firstCostCenterId = userCostCenters[0]?.id
    const defaultCostCenter = employeePositionCostCenterId || firstCostCenterId

    if (defaultCostCenter) {
      form.setFieldsValue({ costCenter: defaultCostCenter })
      setUserCostCenter(defaultCostCenter)
    }
  }

  /**
   * Fetches and sets cost centers for structure
   */
  const fetchAndSetCostCenters = async (structureId: string, employeePosition: any[]): Promise<void> => {
    try {
      const costCenterData = await graphqlClient.query({
        query: getStructureCostCenter,
        variables: { structureId: structureId }
      })

      const userCostCenters = costCenterData?.data?.userCostCenters || []
      setCostCenters(userCostCenters)
      setDefaultCostCenter(userCostCenters, employeePosition)
    } catch {
      setCostCenters([])
    }
  }

  /**
   * Processes and sets currencies from catalogue data
   */
  const processCurrencies = (catalogueData: any): void => {
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
      // Early validation
      if (!accessToken || !userInfo) return

      const currentDate = currentSelectedDate ? currentSelectedDate.toISOString() : new Date().toISOString()
      const employeeIdValue = userInfo?.employeeDetails?.employeeId || DEFAULT_EMPLOYEE_ID

      if (!employeeIdValue) return

      // Fetch employee rule
      await fetchEmployeeRuleData(employeeIdValue, currentDate)

      // Fetch general data
      await fetchGeneralData()

      // Fetch catalogue data and initialize if needed
      if (rerunRule === false) {
        const catalogueData = await fetchCatalogueData(employeeIdValue)

        if (firstRunVariable === false && catalogueData?.data) {
          const employeePosition = catalogueData?.data?.EmployeePosition || []
          const structureId = employeePosition[0]?.structureId || ''

          await fetchAndSetCostCenters(structureId, employeePosition)
          processCurrencies(catalogueData)
          setFirstRunVariable(true)
        }
      }

      setRerunRule(false)
    } catch {
      showToast(t('lowcoder:create_expense_type_item.process_error_data_fetch', 'Error fetching data'), 'error')
    }
  }

  const fetchExpenseTypesWrapper = async (groupId: string): Promise<ExpenseType[]> => {
    return await fetchExpenseTypes(
      groupId,
      [], // No positions for expense plan item
      employeeRuleId,
      graphqlClient,
      setExpenseTypes,
      t
    )
  }

  const fetchCustomFieldsWrapper = async (expenseTypeIds: string[]): Promise<CustomField[]> => {
    return await fetchCustomFields(expenseTypeIds, graphqlClient, setCustomFields, t)
  }

  const setByEditWrapper = async (expensePlanItemId: string) => {
    try {
      const activeUserLocale = getCurrentActiveUserLocale()
      const response = await graphqlClient.query({
        query: fetchExpenseData,
        variables: {
          expenseId: expensePlanItemId,
          activeUserLocale
        }
      })

      const item = response?.data?.ExpensePlanItemByPk
      if (!item) {
        showToast(t('lowcoder:create_expense_type_item.item_not_found', 'Expense plan item not found'), 'error')
        return
      }

      // Set initial item values for edit mode
      setInitialItemValues(item.id, item.version)

      // Prefill form fields
      form.setFieldsValue({
        title: item.title,
        amount: item.totalAmount,
        currency: item.currency?.id,
        expenseGroup: item.expenseGroup?.id,
        expenseType: item.expenseRuleGeneralExpenseId,
        costCenter: item.costCenter?.id,
        reimbursable: item.reimbursable,
        date: item.expenseDate ? new Date(item.expenseDate) : new Date()
      })

      // Handle cascading data fetching for edit mode
      if (item.expenseGroup?.id) {
        try {
          // First, fetch expense types for the selected group
          await fetchExpenseTypesWrapper(item.expenseGroup.id)

          // Wait a bit for the state to update, then set the expense type
          setTimeout(async () => {
            if (item.expenseRuleGeneralExpenseId) {
              // Set the expense type in the form
              form.setFieldsValue({
                expenseType: item.expenseRuleGeneralExpenseId
              })

              // Fetch custom fields for the selected expense type
              await fetchCustomFieldsWrapper([item.expenseRuleGeneralExpenseId])

              // Set custom field values after custom fields are loaded
              setTimeout(() => {
                if (item.additionalProperties) {
                  try {
                    const additionalProps = item.additionalProperties
                    // Handle custom fields from the customFields array
                    if (additionalProps.customFields && Array.isArray(additionalProps.customFields)) {
                      additionalProps.customFields.forEach((customField: any) => {
                        if (customField.infoValue && customField.value !== undefined) {
                          form.setFieldsValue({ [customField.infoValue]: customField.value })
                        }
                      })
                    }
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
              }, 300) // Wait for custom fields to be loaded
            }
          }, 500) // Wait 500ms for expense types to load
        } catch {
          showToast(
            t('lowcoder:create_expense_type_item.process_error_expense_types', 'Error processing expense types'),
            'error'
          )
        }
      }
      form.validateFields()
    } catch {
      showToast(t('lowcoder:create_expense_type_item.error_loading_item', 'Error loading expense plan item'), 'error')
    }
  }

  const handleSubmitWrapper = async (): Promise<void> => {
    await handleSubmit(
      form,
      customFields,
      employeeRuleId,
      generalDataResponse,
      catalogueDataResponse,
      setLoading,
      expensePlanId,
      accessToken,
      userInfo,
      additionalData,
      setIsEditMode,
      itemValues || undefined,
      getIsProcessEventDispatched,
      dispatchProcessContinueEventIfEnabled
    )
  }

  const handleCancelWrapper = () => {
    handleCancel(form, setIsEditMode)
  }

  const handleExpenseGroupChangeWrapper = async (value: string): Promise<void> => {
    await handleExpenseGroupChange(value, form, setExpenseTypes, setCustomFields, fetchExpenseTypesWrapper)
  }

  const handleCurrencyChangeWrapper = async (currencyId: string): Promise<void> => {
    await handleCurrencyChange(currencyId, form)
  }

  const handleExpenseTypeChangeWrapper = async (value: string): Promise<void> => {
    await handleExpenseTypeChange(value, form, setCustomFields, fetchCustomFieldsWrapper)
  }

  const setInitialItemValues = (id: string, version: string | number) => {
    setItemValues({ id, version })
  }

  const contextValue: ExpensePlanItemContextProps = useMemo(
    () => ({
      form,
      loading,
      setLoading,
      isFormDisabled,
      setIsFormDisabled,
      isEditMode,
      setCurrentSelectedDate,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      employeeRuleId,
      expenseRuleError,
      itemValues,
      additionalData,
      handleSubmit: handleSubmitWrapper,
      handleCancel: handleCancelWrapper,
      handleExpenseGroupChange: handleExpenseGroupChangeWrapper,
      handleExpenseTypeChange: handleExpenseTypeChangeWrapper,
      handleCurrencyChange: handleCurrencyChangeWrapper,
      fetchExpenseTypes: fetchExpenseTypesWrapper,
      fetchCustomFields: fetchCustomFieldsWrapper,
      setInitialItemValues: setInitialItemValues
    }),
    [
      form,
      loading,
      isFormDisabled,
      isEditMode,
      expenseGroups,
      expenseTypes,
      customFields,
      costCenters,
      currencies,
      employeeRuleId,
      expenseRuleError,
      itemValues,
      additionalData,
      handleSubmitWrapper,
      handleCancelWrapper,
      handleExpenseGroupChangeWrapper,
      handleExpenseTypeChangeWrapper,
      handleCurrencyChangeWrapper,
      fetchExpenseTypesWrapper,
      fetchCustomFieldsWrapper
    ]
  )

  return <ExpensePlanItemContext.Provider value={contextValue}>{children}</ExpensePlanItemContext.Provider>
}

export const useExpensePlanItem = () => {
  const context = useContext(ExpensePlanItemContext)
  if (context === undefined) {
    throw new Error('useExpensePlanItem must be used within an ExpensePlanItemProvider')
  }
  return context
}
