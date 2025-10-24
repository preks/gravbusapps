import React from 'react'
import { useTranslation } from 'react-i18next'
import { InputField, SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { Currency } from '../../../types'

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

  const renderAmountInput = () => (
    <InputField
      label={t('lowcoder:create_expense_item.change_expense_item_container.current_amount_label', 'Amount')}
      className="gba:[&>input[type=number]]:appearance-textfield 
         gba:[&>input[type=number]::-webkit-inner-spin-button]:appearance-none 
         gba:[&>input[type=number]::-webkit-inner-spin-button]:m-0 
         gba:[&>input[type=number]::-webkit-outer-spin-button]:appearance-none 
         gba:[&>input[type=number]::-webkit-outer-spin-button]:m-0"
      disabled={isProcessingFiles}
      name={`amount-${index}`}
      data-testid={`amount-input-${index}`}
      type="number"
      step="0.01"
      min="0"
      value={amountValue}
      placeholder={t(
        'lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder',
        'Enter Amount'
      )}
      onChange={field => {
        let value = field.value as string
        if (value.includes('.')) {
          const parts = value.split('.')
          if (parts[1] && parts[1].length > 2) {
            value = `${parts[0]}.${parts[1].substring(0, 2)}`
          }
        }
        form.setFieldsValue({ [`amount-${index}`]: value })
        onAmountChange(parseFloat(value) || 0)
      }}
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
