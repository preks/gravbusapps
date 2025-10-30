import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { InputField, SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { Currency } from '../../../types'
import { getCurrentActiveUserLocale, formatNumberFunction } from '@/common/utils/windowUtils'

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
  const { t } = useTranslation()

  const handleAmountBlur = () => {
    const currentValue = form.getFieldValue(`amount-${index}`)

    if (currentValue === undefined || currentValue === null || String(currentValue).trim() === '') {
      return
    }

    const valueStr = String(currentValue).trim()

    // Remove non-numeric characters except decimal separators (both . and ,)
    let cleaned = valueStr.replace(/[^0-9,.-]/g, '')

    // Find the last occurrence of . or ,
    const lastCommaIndex = cleaned.lastIndexOf(',')
    const lastPeriodIndex = cleaned.lastIndexOf('.')
    const lastSepIndex = Math.max(lastCommaIndex, lastPeriodIndex)

    // If we have separators, the rightmost one is the decimal separator
    if (lastSepIndex > -1) {
      // Check if it's followed by 1-2 digits (typical decimal pattern)
      const afterSep = cleaned.substring(lastSepIndex + 1)
      const isDecimalSeparator = /^\d{1,2}$/.test(afterSep)

      if (isDecimalSeparator) {
        // This is the decimal separator - convert to period and remove all others
        const beforeDecimal = cleaned.substring(0, lastSepIndex).replace(/[,.]/g, '')
        const afterDecimal = afterSep
        cleaned = `${beforeDecimal}.${afterDecimal}`
      } else {
        // No clear decimal separator, remove all
        cleaned = cleaned.replace(/[,.]/g, '')
      }
    }

    const num = parseFloat(cleaned)
    if (isNaN(num)) {
      return
    }

    // Format using platform i18n formatting
    const platformFormatted = formatNumberFunction(String(num), '0.00[,]00')

    // Fallback to Intl.NumberFormat for locale-specific formatting
    const intlFormatted = new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num)

    const finalDisplay = platformFormatted && platformFormatted !== String(num) ? platformFormatted : intlFormatted

    form.setFieldsValue({ [`amount-${index}`]: finalDisplay })
    onAmountChange(num)
  }

  // Format amount when it changes from external source (e.g., OCR from receipt)
  useEffect(() => {
    if (amountValue !== undefined && amountValue !== null && amountValue > 0) {
      const currentFormValue = form.getFieldValue(`amount-${index}`)

      // Only format if the form value is a simple number without locale formatting
      // This happens when OCR sets the value
      if (currentFormValue && /^[\d,.]+$/.test(String(currentFormValue))) {
        const numValue =
          typeof currentFormValue === 'number'
            ? currentFormValue
            : parseFloat(String(currentFormValue).replace(',', '.'))

        if (!isNaN(numValue)) {
          const platformFormatted = formatNumberFunction(String(numValue), '0.00[,]00')
          const intlFormatted = new Intl.NumberFormat(getCurrentActiveUserLocale() || 'en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(numValue)

          const finalDisplay =
            platformFormatted && platformFormatted !== String(numValue) ? platformFormatted : intlFormatted

          // Only update if format is different to avoid infinite loop
          if (String(currentFormValue) !== finalDisplay) {
            form.setFieldsValue({ [`amount-${index}`]: finalDisplay })
          }
        }
      }
    }
  }, [amountValue, form, index])

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

        // Parse for immediate validation (normalize comma to period for parseFloat)
        const normalizedValue = value.replace(',', '.')
        onAmountChange(parseFloat(normalizedValue) || 0)
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
