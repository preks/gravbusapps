import React, { useState, useMemo, useEffect } from 'react'
import { Form, Divider } from 'antd'
import { InputField, SelectField } from '@newwork/gravity-ui-catalog'
import {
  getTranslationFromI18nKeyAndLabel,
  formatNumberFunction,
  getCurrentActiveUserLocale
} from '@/common/utils/windowUtils'
import { useExpensePlanWizardContext } from '../context/ExpensePlanWizardContext'
import { noAllowanceItemsFunction, getAllowanceItemsFunction } from '../utils/itemsScreenUtils'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrencyForUser } from '../queries/ExpensePlanWizardQueries'
import { showToast } from '../../../utils/notificationUtils'
import { useProcessEventState } from '@/business-apps/fin/expenses/utils/useProcessEventState'
import { EVENTS } from '../../../utils/constants'
import { createAdvanceObject, createPaymentScreenLogObject } from '../utils/paymentScreenUtils'
import { DEFAULT_PLAN_CURRENCY_CODE } from '../../expense-request/constants/constants'

interface PaymentScreenProps extends BusinessAppContextProps {
  additionalData?: {
    mdi_modulePayload?: {
      tripData?: any
    }
    [key: string]: any
  }
}

// Payment method constants
const DIRECT_DEPOSIT = 'DIRECT_DEPOSIT'
const CASH_PAYMENT = 'CASH_PAYMENT'

const PaymentScreen: React.FC<PaymentScreenProps> = props => {
  const { accessToken, additionalData } = props
  const { expensePlanData, employeeRuleId, currentTitle, updateTripFormValidation } = useExpensePlanWizardContext()
  const graphQLClient = useGraphqlClient(accessToken)
  const { dispatchProcessContinueEventIfEnabled } = useProcessEventState(additionalData)

  const [amount, setAmount] = useState<string>('')
  const [currency, setCurrency] = useState<string>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('')
  const [currencies, setCurrencies] = useState<any[]>([])
  const [isLoadingCurrencies, setIsLoadingCurrencies] = useState<boolean>(false)
  const [amountError, setAmountError] = useState<string>('')
  const [paymentMethodError, setPaymentMethodError] = useState<string>('')
  const [advancePaymentError, setAdvancePaymentError] = useState<string>('')
  const [form] = Form.useForm()

  // Get default currency from expense plan data
  const defaultCurrency = useMemo(() => {
    const items = expensePlanData?.ExpensePlanItem || []
    if (items.length > 0 && items[0].currency?.code) {
      return items[0].currency.code
    }
    return DEFAULT_PLAN_CURRENCY_CODE
  }, [expensePlanData])

  // Check for initial advance payment
  const initialAdvancePayment = useMemo(() => {
    const planData = expensePlanData?.ExpensePlanByPk
    if (planData?.advancePayment && planData.advancePayment.length > 0) {
      return planData.advancePayment[0]
    }
    return null
  }, [expensePlanData])

  // Set initial form values based on existing advance payment
  useEffect(() => {
    if (initialAdvancePayment) {
      // Prefill with existing advance payment data
      const amountValue = formatNumberFunction(
        initialAdvancePayment.amount ? initialAdvancePayment.amount.toString() : '0.00',
        '0.00[,]00'
      )
      const currencyValue = initialAdvancePayment.currencyRef || ''
      const paymentMethodValue = initialAdvancePayment.paymentMethod || ''

      setAmount(amountValue)
      setCurrency(currencyValue)
      setPaymentMethod(paymentMethodValue)

      form.setFieldsValue({
        amount: amountValue,
        currency: currencyValue,
        paymentMethod: paymentMethodValue
      })
    } else {
      // Default values - leave amount empty so placeholder shows
      form.setFieldsValue({
        amount: '',
        currency: currency
        // Don't set paymentMethod initially so placeholder shows
      })
    }
  }, [form, currency, initialAdvancePayment])

  // Set default currency when currencies are loaded
  useEffect(() => {
    if (currencies.length > 0) {
      if (initialAdvancePayment && initialAdvancePayment.currencyRef) {
        // If we have an initial advance payment with a currency, use that
        setCurrency(initialAdvancePayment.currencyRef)
        form.setFieldsValue({ currency: initialAdvancePayment.currencyRef })
      } else if (defaultCurrency) {
        // Find the currency ID that matches the default currency code
        const matchingCurrency = currencies.find(c => c.code === defaultCurrency)
        if (matchingCurrency) {
          setCurrency(matchingCurrency.id)
          form.setFieldsValue({ currency: matchingCurrency.id })
        } else {
          // Fallback to first currency or default
          setCurrency(currencies[0].id)
          form.setFieldsValue({ currency: currencies[0].id })
        }
      }
    }
  }, [defaultCurrency, currencies, form, initialAdvancePayment])

  // Fetch currencies
  useEffect(() => {
    const fetchCurrencies = async () => {
      if (!accessToken) return

      setIsLoadingCurrencies(true)
      try {
        const response = await graphQLClient.request(getCurrencyForUser, {
          activeUserLocale: getCurrentActiveUserLocale()
        })
        setCurrencies(response.currency || [])
      } catch {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.process_error_expense_requests_fetch',
            'Error fetching data'
          ),
          'error'
        )
      } finally {
        setIsLoadingCurrencies(false)
      }
    }

    fetchCurrencies()
  }, [accessToken, graphQLClient])

  // Payment method options
  const paymentMethodOptions = useMemo(
    () => [
      {
        id: DIRECT_DEPOSIT,
        name: getTranslationFromI18nKeyAndLabel(
          'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
          'Direct Deposit'
        ),
        value: getTranslationFromI18nKeyAndLabel(
          'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
          'Direct Deposit'
        )
      },
      {
        id: CASH_PAYMENT,
        name: getTranslationFromI18nKeyAndLabel(
          'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
          'Cash Payment'
        ),
        value: getTranslationFromI18nKeyAndLabel(
          'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
          'Cash Payment'
        )
      }
    ],
    []
  )

  // Calculate totals
  const estimatedExpensesTotal = useMemo(() => {
    const items = expensePlanData?.ExpensePlanItem || []
    const nonAllowanceItems = noAllowanceItemsFunction(items)
    const total = nonAllowanceItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.totalAmount) || 0)
    }, 0)
    return total
  }, [expensePlanData])

  const allowancesTotal = useMemo(() => {
    const items = expensePlanData?.ExpensePlanItem || []
    const allowanceItems = getAllowanceItemsFunction(items)

    const total = allowanceItems.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.totalAmount) || 0)
    }, 0)
    return total
  }, [expensePlanData])

  const advancePaymentTotal = useMemo(() => {
    return parseFloat(amount) || 0
  }, [amount])

  const currencyCode = expensePlanData?.ExpensePlanByPk?.currency?.code || DEFAULT_PLAN_CURRENCY_CODE

  // Get total amount from expense plan data
  const expensePlanTotalAmount = useMemo(() => {
    return parseFloat(expensePlanData?.ExpensePlanByPk?.totalAmount) || 0
  }, [expensePlanData])

  // Check if currency should be disabled (if it exists in expense plan data or initial advance payment)
  const isCurrencyDisabled = useMemo(() => {
    const items = expensePlanData?.ExpensePlanItem || []
    return (items.length > 0 && items[0].currency?.code) || (initialAdvancePayment && initialAdvancePayment.currencyRef)
  }, [expensePlanData, initialAdvancePayment])

  // Check if payment method should be disabled (if amount is 0 or empty)
  const isPaymentMethodDisabled = useMemo(() => {
    const amountValue = parseFloat(amount) || 0
    return amountValue === 0
  }, [amount])

  // Clear payment method when disabled
  useEffect(() => {
    if (isPaymentMethodDisabled && paymentMethod) {
      setPaymentMethod('')
      form.setFieldsValue({ paymentMethod: undefined })
    }
  }, [isPaymentMethodDisabled, paymentMethod, form])

  // Get the selected currency code for display
  const selectedCurrencyCode = useMemo(() => {
    const selectedCurrency = currencies.find(c => c.id === currency)
    return selectedCurrency?.code || DEFAULT_PLAN_CURRENCY_CODE
  }, [currency, currencies])

  // Handle amount change
  const handleAmountChange = (field: any) => {
    let value = field.value as string

    // Handle both period and comma as decimal separators
    // Normalize to period for internal storage
    const normalizedValue = value.replace(',', '.')

    if (normalizedValue.includes('.')) {
      const parts = normalizedValue.split('.')
      if (parts[1] && parts[1].length > 2) {
        value = `${parts[0]}.${parts[1].substring(0, 2)}`
      } else {
        value = normalizedValue
      }
    } else {
      value = normalizedValue
    }

    // Store the normalized value for calculations
    console.log('[PaymentScreen] handleAmountChange:', {
      rawInput: field.target.value,
      normalizedValue: value,
      locale: getCurrentActiveUserLocale()
    })
    setAmount(value)

    // Validate amount
    const amountError = validateAmount(value)
    setAmountError(amountError)

    // Validate payment method if amount is valid
    if (!amountError && parseFloat(value) !== 0) {
      const paymentMethodError = validatePaymentMethod()
      setPaymentMethodError(paymentMethodError)
    } else {
      setPaymentMethodError('')
    }

    // Validate advance payment with current value
    const advancePaymentErrorValue = validateAdvancePaymentWithValue(value)
    setAdvancePaymentError(advancePaymentErrorValue)
  }

  const handleAmountBlur = () => {
    const currentValue = form.getFieldValue('amount')
    console.log('[PaymentScreen] handleAmountBlur START:', {
      currentValue,
      currentAmountState: amount,
      locale: getCurrentActiveUserLocale()
    })

    if (currentValue === undefined || currentValue === null || String(currentValue).trim() === '') {
      console.log('[PaymentScreen] handleAmountBlur: empty value, returning')
      return
    }
    const normalized = String(currentValue)
      .replace(/[^0-9,.-]/g, '')
      .replace(/,(?=\d{1,2}$)/, '.')
      .replace(/,/g, '')

    console.log('[PaymentScreen] handleAmountBlur normalized:', normalized)

    const num = parseFloat(normalized)
    if (isNaN(num)) {
      console.log('[PaymentScreen] handleAmountBlur: NaN, returning')
      return
    }

    const platformFormatted = formatNumberFunction(String(num), '0.00[,]00')
    const intlFormatted = new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)

    const finalDisplay = platformFormatted && platformFormatted !== String(num) ? platformFormatted : intlFormatted

    console.log('[PaymentScreen] handleAmountBlur formatting:', {
      num,
      platformFormatted,
      intlFormatted,
      finalDisplay,
      willSetStateTo: num.toFixed(2)
    })

    form.setFieldsValue({ amount: finalDisplay })
    // Update state with normalized value (period as decimal) for saving
    setAmount(num.toFixed(2))

    console.log('[PaymentScreen] handleAmountBlur END')
  }

  // Validation functions
  const validateAmount = (value: string) => {
    if (!value || value.trim() === '') {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.valid_number',
        'Please enter a valid number'
      )
    }
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.valid_number',
        'Please enter a valid number'
      )
    }
    return ''
  }

  const validatePaymentMethod = () => {
    if (!paymentMethod) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.change_expense_item_container.errorMessage',
        'Please Select a Payment Method'
      )
    }
    return ''
  }

  const validateAdvancePaymentWithValue = (value: string) => {
    const amountValue = parseFloat(value) || 0
    if (amountValue > expensePlanTotalAmount || selectedCurrencyCode !== currencyCode) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.add_request_trip_details.advance_payment_custom_rule',
        "Advance Payment amount can't be greater than Estimated Expenses and Allowances amount and they need to have the same currency"
      )
    }
    return ''
  }

  // Handle currency change
  const handleCurrencyChange = (value: any) => {
    setCurrency(value.value)

    // Validate advance payment with current amount value
    const advancePaymentErrorValue = validateAdvancePaymentWithValue(amount)
    setAdvancePaymentError(advancePaymentErrorValue)
  }

  // Handle payment method change
  const handlePaymentMethodChange = (value: any) => {
    setPaymentMethod(value.value)
    setPaymentMethodError('')
  }

  // Handle save event
  const handleSave = () => {
    if (expensePlanData?.ExpensePlanByPk) {
      let skipStep = false
      if (additionalData?.psi_taskPayload?.stepKey && additionalData?.psi_taskPayload?.stepKey.includes(EVENTS.SKIP)) {
        skipStep = true
      }
      const advanceObject = createAdvanceObject(
        currency, // Use currency ID instead of selectedCurrencyCode
        amount,
        paymentMethod,
        expensePlanData
      )

      console.log('[PaymentScreen] handleSave:', {
        currency,
        amount,
        amountState: amount,
        paymentMethod,
        advanceObject
      })

      const logObject = createPaymentScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        employeeRuleId || '',
        currentTitle || '',
        advanceObject,
        expensePlanData,
        EVENTS.SAVE,
        skipStep
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.SAVE, logObject)
    }
  }

  // Handle next event
  const handleNext = () => {
    if (expensePlanData?.ExpensePlanByPk) {
      let skipStep = false
      if (additionalData?.psi_taskPayload?.stepKey && additionalData?.psi_taskPayload?.stepKey.includes(EVENTS.SKIP)) {
        skipStep = true
      }
      const advanceObject = createAdvanceObject(
        currency, // Use currency ID instead of selectedCurrencyCode
        amount,
        paymentMethod,
        expensePlanData
      )

      console.log('[PaymentScreen] handleNext:', {
        currency,
        amount,
        amountState: amount,
        paymentMethod,
        advanceObject
      })

      const logObject = createPaymentScreenLogObject(
        expensePlanData.ExpensePlanByPk,
        employeeRuleId || '',
        currentTitle || '',
        advanceObject,
        expensePlanData,
        EVENTS.NEXT,
        skipStep
      )
      dispatchProcessContinueEventIfEnabled(EVENTS.NEXT, logObject)
    }
  }

  // Event listeners for save and next
  useEffect(() => {
    const saveEventHandler = () => {
      handleSave()
    }

    const nextEventHandler = () => {
      handleNext()
    }

    document.addEventListener('expense-plan-save-payment', saveEventHandler)
    document.addEventListener('expense-plan-next-payment', nextEventHandler)

    return () => {
      document.removeEventListener('expense-plan-save-payment', saveEventHandler)
      document.removeEventListener('expense-plan-next-payment', nextEventHandler)
    }
  }, [amount, currency, paymentMethod, expensePlanData, employeeRuleId, currentTitle, selectedCurrencyCode])

  // Check if form is valid
  const isFormValid = useMemo(() => {
    const amountValue = parseFloat(amount) || 0
    const hasAmountError = !!amountError
    const hasPaymentMethodError = !!paymentMethodError
    const hasAdvancePaymentError = !!advancePaymentError

    // Form is valid if:
    // 1. No amount error
    // 2. No payment method error (only if amount > 0)
    // 3. No advance payment error
    // 4. Amount is valid (not 0 or empty)
    const isValid =
      !hasAmountError && !hasAdvancePaymentError && (amountValue === 0 || (!hasPaymentMethodError && !!paymentMethod))

    return isValid
  }, [amount, amountError, paymentMethodError, advancePaymentError, paymentMethod])

  // Update form validation in context
  useEffect(() => {
    updateTripFormValidation(isFormValid)
  }, [isFormValid, updateTripFormValidation])

  return (
    <div className="gba:flex gba:flex-col gba:flex-grow" data-testid="payment-screen-container">
      {/* Form Section - Takes available space */}
      <div
        className="gba:p-y gba:flex gba:flex-col gba:h-[100%]"
        data-testid="payment-form-section"
        style={{ flexGrow: 1 }}
      >
        <Form layout="vertical" form={form}>
          {/* Amount and Currency Inputs */}
          <div
            className={`gba:flex gba:gap-4 ${!advancePaymentError ? 'gba:mb-4' : ''}`}
            data-testid="amount-currency-container"
          >
            <div className="gba:w-1/2" data-testid="amount-field-container">
              <Form.Item
                name="amount"
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_type_item.current_amount_custom_rule',
                      'Please enter an amount'
                    )
                  }
                ]}
                style={{ marginBottom: 0 }}
                validateStatus={amountError ? 'error' : ''}
                help={amountError}
              >
                <InputField
                  label={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_item.change_expense_item_container.current_amount_label',
                    'Amount'
                  )}
                  name="amount"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  data-testid="payment-amount-input"
                  onChange={field => {
                    const prev = amount || ''
                    const nextRaw = String(field.value)
                    const isZeroVariant = (v: string) => {
                      const digits = String(v).replace(/\D/g, '')
                      return digits.length > 0 && /^0+$/.test(digits)
                    }
                    let value = isZeroVariant(prev) ? nextRaw.replace(/^[0.,]+/, '') : nextRaw
                    if (/^0+\d+$/.test(value)) {
                      value = value.replace(/^0+/, '')
                    }
                    if (value.includes('.') || value.includes(',')) {
                      const sep = value.includes('.') ? '.' : ','
                      const parts = value.split(sep)
                      if (parts[1] && parts[1].length > 2) {
                        value = `${parts[0]}${sep}${parts[1].substring(0, 2)}`
                      }
                    }
                    form.setFieldsValue({ amount: value })

                    // Normalize for state storage (replace comma with period)
                    const normalizedValue = value.replace(',', '.')
                    setAmount(normalizedValue)

                    // Validate and handle errors
                    handleAmountChange({ ...field, value })
                  }}
                  onBlur={handleAmountBlur}
                  required={true}
                />
              </Form.Item>
            </div>

            <div className="gba:w-1/2" data-testid="currency-field-container">
              <Form.Item
                name="currency"
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_type_item.current_currency_custom_rule',
                      'Please select a currency'
                    )
                  }
                ]}
                style={{ marginBottom: 0 }}
              >
                <SelectField
                  allowClear={!isCurrencyDisabled}
                  label={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                    'Currency'
                  )}
                  name="currency"
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:change_expense_item_container.current_currency_placeholder',
                    'Select Currency'
                  )}
                  data-testid="payment-currency-select"
                  isDataSorted={false}
                  data={currencies.map(currency => ({
                    id: currency.id,
                    name: currency.code
                  }))}
                  onChange={(value: any) => {
                    form.setFieldsValue({ currency: value.value })
                    handleCurrencyChange(value)
                  }}
                  required={true}
                  disabled={isCurrencyDisabled || isLoadingCurrencies}
                />
              </Form.Item>
            </div>
          </div>

          {/* Advance Payment Error - Displayed under amount and currency inputs */}
          {advancePaymentError && (
            <div className="gba:mb-4 ant-form-item-explain-error" data-testid="advance-payment-error">
              <div className="gba:text-red-500 gba:text-sm" data-testid="advance-payment-error-message">
                {advancePaymentError}
              </div>
            </div>
          )}

          {/* Payment Method Selection */}
          <div className="gba:mb-4" data-testid="payment-method-container">
            <div className="gba:relative">
              <Form.Item
                name="paymentMethod"
                rules={[
                  {
                    required: true,
                    message: getTranslationFromI18nKeyAndLabel(
                      'lowcoder:create_expense_type_item.payment_method_custom_rule',
                      'Please select a payment method'
                    )
                  }
                ]}
                style={{ marginBottom: 0 }}
                validateStatus={paymentMethodError ? 'error' : ''}
                help={paymentMethodError}
              >
                <SelectField
                  allowClear
                  label={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.payment_method',
                    'Payment Method'
                  )}
                  name="paymentMethod"
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_request.add_request_trip_details.payment_method_placeholder',
                    'Select Method'
                  )}
                  data-testid="payment-method-select"
                  isDataSorted={false}
                  data={paymentMethodOptions}
                  onChange={(value: any) => {
                    form.setFieldsValue({ paymentMethod: value.value })
                    handlePaymentMethodChange(value)
                  }}
                  required={true}
                  disabled={isPaymentMethodDisabled}
                />
              </Form.Item>
            </div>
          </div>
        </Form>
      </div>

      {/* Summary Section - Positioned at the bottom */}
      <div className="gba:mt-auto gba:p-6 gba:rounded-lg" data-testid="payment-summary-container">
        <div className="gba:space-y-4">
          {/* Estimated Expenses */}
          <div className="gba:flex gba:justify-between gba:items-center" data-testid="estimated-expenses-row">
            <span className="gba:text-sm gba:font-normal">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:modify_expense_request.request_amount_title_text',
                'Estimated Expenses'
              )}
            </span>
            <span className="gba:text-3xl gba:font-bold" data-testid="estimated-expenses-value">
              {formatNumberFunction(estimatedExpensesTotal.toString(), '0.00[,]00')} {currencyCode}
            </span>
          </div>

          <Divider className="gba:my-6" />

          {/* Allowances */}
          <div className="gba:flex gba:justify-between gba:items-center" data-testid="allowances-row">
            <span className="gba:text-sm gba:font-normal">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.calculation_allowance_code_list.calculation_allowance_code_modal.expense_group_placeholder',
                'Allowances'
              )}
            </span>
            <span className="gba:text-3xl gba:font-bold" data-testid="allowances-value">
              {formatNumberFunction(allowancesTotal.toString(), '0.00[,]00')} {currencyCode}
            </span>
          </div>

          <Divider className="gba:my-6" />

          {/* Advance Payment */}
          <div className="gba:flex gba:justify-between gba:items-center" data-testid="advance-payment-row">
            <span className="gba:text-sm gba:font-normal">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.advance_payment', 'Advance Payment')}
            </span>
            <span
              className={`gba:text-sm gba:font-bold gba:text-${advancePaymentTotal ? '[primary]' : '[#999999]'}`}
              data-testid="advance-payment-value"
            >
              {formatNumberFunction(advancePaymentTotal.toString(), '0.00[,]00')} {selectedCurrencyCode}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PaymentScreen
