import React, { useState } from 'react'
import { Button, DateInputField, Divider, InputField, SelectField, Switch } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseGroup, ExpenseType, CostCenter, Currency, CustomField } from './types'
import { useExpensePlanItem } from './context/ExpensePlanItemContext'
import { Alert } from 'antd'
import { getCurrentActiveUserLocale, getDateFormat, getCatalogValue } from '@/common/utils/windowUtils'
import { parseAndFormatAmount, sanitizeDecimalAmountInput } from '@/business-apps/fin/expenses/utils/amountFormatting'
import { useExpensePlanItemTranslation } from './useExpensePlanItemTranslation'

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
  const { t } = useExpensePlanItemTranslation()
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
                message: t('current-title-custom-rule')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <InputField
              label={t('current-title-label')}
              name="title"
              disabled={isFormDisabled}
              placeholder={t('current-title-placeholder')}
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
                message: t('current-date-custom-rule')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <DateInputField
              label={t('current-date-label')}
              name="date"
              placeholder={t('current-date-placeholder')}
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
              message={expenseRuleError}
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
                message: t('current-expense-group-custom-rule')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={t('current-expense-group-label')}
              name="expenseGroup"
              placeholder={t('current-expense-group-placeholder')}
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
                message: t('current-expense-type-custom-rule')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={t('current-expense-type-label')}
              name="expenseType"
              placeholder={t('current-expense-type-placeholder')}
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
                          message: t('custom-field-default-error-message')
                        }
                      ]
                    : []
                }
                style={{ marginBottom: 0 }}
              >
                <InputField
                  label={field.infoValue}
                  name={field.infoValue}
                  placeholder={t('custom-field-placeholder')}
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
                  message: t('current-amount-custom-rule')
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <InputField
                label={t('current-amount-label')}
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder={t('current-amount-placeholder')}
                data-testid="amount-input"
                onChange={field => {
                  const value = sanitizeDecimalAmountInput(field.value)
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
                  message: t('current-currency-custom-rule')
                }
              ]}
              style={{ marginBottom: 0 }}
            >
              <SelectField
                allowClear
                label={t('current-currency-label')}
                name="currency"
                placeholder={t('current-currency-placeholder')}
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
                message: t('current-cost-center-custom-rule')
              }
            ]}
            style={{ marginBottom: 0 }}
          >
            <SelectField
              allowClear
              label={t('current-cost-center-label')}
              name="costCenter"
              placeholder={t('current-cost-center-placeholder')}
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
              label={t('is-reimbursable-solo-switch')}
              name="reimbursable"
              data-testid="reimbursable-switch"
              onChange={field => {
                form.setFieldsValue({ reimbursable: field.value })
              }}
            />
          </Form.Item>
        </div>
      </div>

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
          {t('cancel-button')}
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={loading || !formIsValid || !!expenseRuleError}
          className="gba:min-w-[100px] gba:border-2 gba:text-base gba:font-semibold gba:px-4"
          style={{ borderRadius: '22px', width: 'auto', height: '40px' }}
          data-testid="submit-button"
        >
          {isEditMode ? t('btn-update') : t('btn-save')}
        </Button>
      </div>
    </Form>
  )
}
