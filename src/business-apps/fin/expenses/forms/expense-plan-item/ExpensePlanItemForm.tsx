import React, { useState } from 'react'
import { Button, DateInputField, Divider, InputField, SelectField, Switch } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from './types'
import { useExpensePlanItem } from './context/ExpensePlanItemContext'
import { Alert } from 'antd'
import {
  getCurrentActiveUserLocale,
  getDateFormat,
  getCatalogValue,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { parseAndFormatAmount } from '@/business-apps/fin/expenses/utils/amountFormatting'

interface ExpensePlanItemFormProps {
  form: any
  expenseGroups: ExpenseGroup[]
  expenseTypes: { [classId: string]: ExpenseType[] }
  customFields: { [expenseTypeId: string]: CustomField[] }
  costCenters: CostCenter[]
  currencies: Currency[]
  handleSubmit: () => Promise<void>
  handleCancel: () => void
  handleExpenseGroupChange: (value: string) => Promise<void>
  handleExpenseTypeChange: (value: string) => Promise<void>
  handleCurrencyChange: (currencyId: string) => Promise<void>
  loading: boolean
}

export const ExpensePlanItemForm: React.FC<ExpensePlanItemFormProps> = ({
  form,
  expenseGroups,
  expenseTypes,
  customFields,
  costCenters,
  currencies,
  handleSubmit,
  handleCancel,
  handleExpenseGroupChange,
  handleExpenseTypeChange,
  handleCurrencyChange,
  loading
}) => {
  const { isFormDisabled, expenseRuleError, isEditMode } = useExpensePlanItem()

  const [formIsValid, setFormIsValid] = useState(false)

  const handleAmountBlur = () => {
    const currentValue = form.getFieldValue('amount')

    if (currentValue === undefined || currentValue === null || String(currentValue).trim() === '') {
      return
    }

    const result = parseAndFormatAmount(String(currentValue))
    if (!result) {
      return
    }

    form.setFieldsValue({ amount: result.formattedValue })
  }

  return (
    <Form
      form={form}
      layout="vertical"
      data-testid="expense-plan-item-form"
      className="gba:flex gba:flex-col gba:flex-grow"
      onFieldsChange={() => {
        const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0)
        setFormIsValid(isFormValidValue)
      }}
      onValuesChange={() => {
        form.validateFields()
        const isFormValidValue = form.getFieldsError().every((fieldErr: any) => fieldErr.errors.length === 0)
        setFormIsValid(isFormValidValue)
      }}
      validateTrigger={['onChange', 'onBlur']}
      initialValues={{
        date: new Date(),
        reimbursable: true
      }}
    >
      <div className={`gba:mb-4`} data-testid="title-field-container">
        <div className={`gba:relative`}>
          <Form.Item
            name="title"
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.current_title_custom_rule',
                  'Please enter a title'
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <InputField
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_type_item.current_title_label',
                'Title'
              )}
              name="title"
              disabled={isFormDisabled}
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_type_item.current_title_placeholder',
                'Enter Title'
              )}
              onChange={field => form.setFieldsValue({ title: field.value })}
              required={true}
              data-testid="title-input"
            />
          </Form.Item>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="date-field-container">
        <div className={`gba:relative`}>
          <Form.Item
            shouldUpdate
            name="date"
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.current_date_custom_rule',
                  'Please select a date'
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <DateInputField
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_date_label',
                'Date'
              )}
              name="date"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_date_placeholder',
                'Select date'
              )}
              data-testid="date-input"
              onChange={field => {
                form.setFieldsValue({ date: field.value })
              }}
              language={getCurrentActiveUserLocale().split('-')[0] as 'en' | 'de' | 'ro' | undefined}
              required={true}
              format={getDateFormat('date.long')}
            />
          </Form.Item>
          {expenseRuleError && (
            <Alert
              message={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.missing_expense_rule_message',
                'No expense rule found for this date. Please contact your administrator.'
              )}
              type="error"
              style={{ marginTop: 8 }}
              showIcon
              data-testid="expense-rule-error-alert"
            />
          )}
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="expense-group-field-container">
        <div className={`gba:relative`}>
          <Form.Item
            name="expenseGroup"
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.current_expense_group_custom_rule',
                  'Please select an expense group'
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_group_label',
                'Expense Group'
              )}
              name="expenseGroup"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_group_placeholder',
                'Select Expense Group'
              )}
              data-testid="expense-group-select"
              data={
                expenseGroups
                  ? expenseGroups.map(group => ({
                      id: group.id,
                      name: getCatalogValue(group)
                    }))
                  : []
              }
              onChange={(value: any) => {
                form.setFieldsValue({ expenseGroup: value.value })
                handleExpenseGroupChange(value.value)
              }}
              required={true}
            />
          </Form.Item>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="expense-type-field-container">
        <div className={`gba:relative`}>
          <Form.Item
            name="expenseType"
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_custom_rule',
                  'Please select an expense type'
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_label',
                'Expense Type'
              )}
              name="expenseType"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_placeholder',
                'Select Expense Type'
              )}
              data-testid="expense-type-select"
              disabled={!form.getFieldValue('expenseGroup')}
              data={Object.values(expenseTypes)
                .flat()
                .map(type => ({
                  id: type.id,
                  name: type.name
                }))}
              onChange={(value: any) => {
                form.setFieldsValue({ expenseType: value.value })
                handleExpenseTypeChange(value.value)
              }}
              required={true}
            />
          </Form.Item>
        </div>
      </div>

      {/* Custom Fields */}
      {Object.values(customFields)
        .flat()
        .map(field => (
          <div key={field.id} className={`gba:mb-4`} data-testid={`custom-field-${field.id}-container`}>
            <div className={`gba:relative`}>
              <Form.Item
                name={field.infoValue}
                rules={
                  field.mandatory
                    ? [
                        {
                          required: true,
                          message: getTranslationFromI18nKeyAndLabel(
                            'lowcoder:create_expense_type_item.custom_field_required',
                            'This field is required'
                          )
                        }
                      ]
                    : []
                }
                style={{ marginBottom: 0 }}
              >
                <InputField
                  label={field.infoValue}
                  name={field.infoValue}
                  placeholder={getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_type_item.custom_field_placeholder',
                    'Enter value'
                  )}
                  data-testid={`custom-field-${field.id}-input`}
                  onChange={field => form.setFieldsValue({ [field.name]: field.value })}
                  required={field.mandatory}
                />
              </Form.Item>
            </div>
          </div>
        ))}

      <div className={`gba:mb-4`} data-testid="amount-currency-container">
        <div className="gba:flex gba:gap-4">
          <div className={`gba:w-1/2`} data-testid="amount-field-container">
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
            >
              <InputField
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_amount_label',
                  'Amount'
                )}
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder',
                  'Enter Amount'
                )}
                data-testid="amount-input"
                onChange={field => {
                  let value = String(field.value).replace(/[^0-9.,]/g, '')

                  // Limit to 2 decimal places (accept both . and , as decimal separator)
                  if (value.includes('.') || value.includes(',')) {
                    const sep = value.includes('.') ? '.' : ','
                    const parts = value.split(sep)
                    if (parts[1] && parts[1].length > 2) {
                      value = `${parts[0]}${sep}${parts[1].substring(0, 2)}`
                    }
                  }

                  form.setFieldsValue({ amount: value })
                }}
                onBlur={handleAmountBlur}
                required={true}
              />
            </Form.Item>
          </div>

          <div className={`gba:w-1/2`} data-testid="currency-field-container">
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
                allowClear
                label={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
                  'Currency'
                )}
                name="currency"
                placeholder={getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_item.change_expense_item_container.current_currency_placeholder',
                  'Select Currency'
                )}
                disabled={!!form.getFieldValue('fixedCurrency')}
                data-testid="currency-select"
                isDataSorted={false}
                data={currencies.map(currency => ({
                  id: currency.id,
                  name: currency.code
                }))}
                onChange={(value: any) => {
                  form.setFieldsValue({ currency: value.value })
                  if (value && value.value) {
                    handleCurrencyChange(value.value)
                  }
                }}
                required={true}
              />
            </Form.Item>
          </div>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="cost-center-field-container">
        <div className={`gba:relative`}>
          <Form.Item
            name="costCenter"
            rules={[
              {
                required: true,
                message: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_request.expense_request_container.current_cost_center_custom_rule',
                  'Please select a cost center'
                )
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
                'Cost Center'
              )}
              name="costCenter"
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder',
                'Select Cost Center'
              )}
              data-testid="cost-center-select"
              data={costCenters.map(center => ({
                id: center.id,
                name: center.name
              }))}
              onChange={(value: any) => form.setFieldsValue({ costCenter: value.value })}
              required={true}
            />
          </Form.Item>
        </div>
      </div>

      <div className={`gba:mb-4`} data-testid="reimbursable-switch-container">
        <div className={`gba:relative`}>
          <Form.Item name="reimbursable" style={{ marginBottom: 0 }}>
            <Switch
              label={getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_type_item.is_reimbursable_solo_switch',
                'is reimbursable'
              )}
              name="reimbursable"
              data-testid="reimbursable-switch"
              onChange={field => {
                form.setFieldsValue({ reimbursable: field.value })
              }}
            />
          </Form.Item>
        </div>
      </div>

      {/* Spacer to push content to the bottom */}
      <div className="gba:flex-grow" data-testid="expense-plan-item-spacer" />

      <Divider
        className="gba:mt-[30px] gba:mb-[30px] gba:border-border"
        horizontal
        size={1}
        data-testid="form-divider"
      />
      <div
        className="gba:flex gba:justify-between gba:py-4"
        style={{ width: '100%' }}
        data-testid="expense-plan-item-actions"
      >
        <Button
          variant="outline"
          onClick={handleCancel}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', height: '40px' }}
          data-testid="cancel-button"
        >
          {getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_request.initiate_cancel_button', 'Cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !formIsValid || !!expenseRuleError}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="submit-button"
        >
          {isEditMode
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_update',
                'Update'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:expense_calculation_rule_details.calculation_rule_tab_custom_fields.custom_fields_modal.btn_save',
                'Create'
              )}
        </Button>
      </div>
    </Form>
  )
}
