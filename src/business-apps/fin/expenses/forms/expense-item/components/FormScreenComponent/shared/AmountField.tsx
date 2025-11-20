import React, { useEffect, useRef } from 'react'
import { InputField, SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { Currency } from '../../../types'
import { formatAmountForLocale, parseAndFormatAmount } from '@/business-apps/fin/expenses/utils/amountFormatting'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface AmountFieldProps {
  index: number
  amountValue?: number
  currencyValue?: string
  currencies?: Currency[]
  isProcessingFiles: boolean
  form: any
  showCurrencyField?: boolean
  onAmountChange: (value: number) => void
  onCurrencyChange?: (value: string) => void
}

export const AmountField: React.FC<AmountFieldProps> = ({
  index,
  amountValue,
  currencyValue,
  currencies,
  isProcessingFiles,
  form,
  showCurrencyField = false,
  onAmountChange,
  onCurrencyChange
}) => {
  const t = getTranslationFromI18nKeyAndLabel
  const previousAmountValueRef = useRef<number | undefined>(amountValue)
  const isUserEditingRef = useRef(false)

  const handleAmountBlur = () => {
    const currentValue = form.getFieldValue(`amount-${index}`)

    if (currentValue === undefined || currentValue === null || String(currentValue).trim() === '') {
      return
    }

    const result = parseAndFormatAmount(String(currentValue))
    if (!result) {
      return
    }

    form.setFieldsValue({ [`amount-${index}`]: result.formattedValue })
    onAmountChange(result.numValue)
    isUserEditingRef.current = false
  }

  // Format amount when it changes from external source (e.g., OCR from receipt)
  // Only trigger when amountValue prop changes (not on user input)
  useEffect(() => {
    // Skip if user is actively editing
    if (isUserEditingRef.current) {
      return
    }

    // Only process if amountValue changed from external source (OCR)
    if (amountValue === previousAmountValueRef.current) {
      return
    }

    previousAmountValueRef.current = amountValue

    // Skip if no value
    if (!amountValue || amountValue === 0) {
      return
    }

    // Format the OCR value
    const finalDisplay = formatAmountForLocale(amountValue)

    setTimeout(() => {
      form.setFieldsValue({ [`amount-${index}`]: finalDisplay })
      onAmountChange(amountValue)
      form.validateFields([`amount-${index}`])
    }, 100)
  }, [amountValue, form, index, onAmountChange])

  const renderAmountInput = () => (
    <InputField
      label={t('lowcoder:create_expense_item.change_expense_item_container.current_amount_label', 'Amount')}
      disabled={isProcessingFiles}
      name={`amount-${index}`}
      data-testid={`amount-input-${index}`}
      type="text"
      inputMode="decimal"
      value={amountValue}
      placeholder={t(
        'lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder',
        'Enter Amount'
      )}
      onChange={field => {
        // Mark that user is actively editing (prevents useEffect from interfering)
        isUserEditingRef.current = true

        let value = String(field.value)

        // Limit to 2 decimal places (accept both . and , as decimal separator)
        if (value.includes('.') || value.includes(',')) {
          const sep = value.includes('.') ? '.' : ','
          const parts = value.split(sep)
          if (parts[1] && parts[1].length > 2) {
            value = `${parts[0]}${sep}${parts[1].substring(0, 2)}`
          }
        }

        form.setFieldsValue({ [`amount-${index}`]: value })

        // Parse for immediate validation (normalize comma to period for Number.parseFloat)
        const normalizedValue = value.replace(',', '.')
        onAmountChange(Number.parseFloat(normalizedValue) || 0)
      }}
      onBlur={handleAmountBlur}
      required={true}
    />
  )

  if (showCurrencyField && currencies && onCurrencyChange) {
    return (
      <div className="gba:mb-4" data-testid={`amount-currency-container-${index}`}>
        <div className="gba:flex gba:gap-4">
          <div className="gba:w-1/2" data-testid={`amount-field-container-${index}`}>
            <Form.Item
              name={`amount-${index}`}
              rules={[
                {
                  required: true,
                  message: t('lowcoder:create_expense_type_item.amount_error_message', 'Please enter an amount')
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              {renderAmountInput()}
            </Form.Item>
          </div>
          <div className="gba:w-1/2" data-testid={`currency-field-container-${index}`}>
            <Form.Item
              name="currency"
              style={{ marginBottom: 0 }}
              rules={[
                {
                  required: true,
                  message: t(
                    'lowcoder:create_expense_item.change_expense_item_container.current_currency_custom_rule',
                    'Please select a currency'
                  )
                }
              ]}
            >
              <SelectField
                label={t(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                  'Currency'
                )}
                disabled={isProcessingFiles || !!form.getFieldValue('fixedCurrency')}
                name="currency"
                data-testid={`currency-select-${index}`}
                isDataSorted={false}
                allowClear
                data={currencies.map(currency => ({
                  id: currency.id,
                  name: currency.code
                }))}
                value={currencyValue}
                onChange={(value: any) => {
                  form.setFieldsValue({ currency: value.value })
                  if (value && value.value) {
                    onCurrencyChange(value.value)
                  }
                }}
                placeholder={t(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_placeholder',
                  'Select Currency'
                )}
                required={true}
              />
            </Form.Item>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="gba:mb-4" data-testid={`amount-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`amount-${index}`}
          rules={[
            {
              required: true,
              message: t('lowcoder:create_expense_type_item.amount_error_message', 'Please enter an amount')
            }
          ]}
          style={{ marginBottom: 0 }}
        >
          {renderAmountInput()}
        </Form.Item>
      </div>
    </div>
  )
}
