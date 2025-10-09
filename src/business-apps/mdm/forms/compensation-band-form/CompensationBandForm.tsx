import React, { useEffect } from 'react'
import { Form, Input, Select, InputNumber, Button } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useTranslation } from 'react-i18next'

interface Currency {
  value: string
  label: string
}

export interface CompensationBandFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  initialValues?: any
  onSubmit?: (values: any) => Promise<void>
  currencies?: Currency[]
}

const defaultCurrencies = [
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' }
]

export const CompensationBandForm: React.FC<CompensationBandFormProps> = ({
  prefixDataTestId,
  initialValues,
  onSubmit,
  currencies = defaultCurrencies
}) => {
  const [form] = Form.useForm()
  const { t } = useTranslation('master-data')

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues)
    } else {
      form.resetFields()
    }
  }, [form, initialValues])

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (onSubmit) {
        await onSubmit(values)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const handleCancel = () => {
    form.resetFields()
  }
  return (
    <Form
      form={form}
      layout="vertical"
      data-testid={`${prefixDataTestId}-compensation-band-form`}
      className="gba:w-full"
    >
      <Form.Item
        label={t('forms.compensationBand.fields.name.label', { defaultValue: 'Name' })}
        name="name"
        rules={[
          {
            required: true,
            message: t('forms.compensationBand.fields.name.validation', {
              defaultValue: 'Please enter compensation band name'
            })
          }
        ]}
      >
        <Input
          placeholder={t('forms.compensationBand.fields.name.placeholder', {
            defaultValue: 'Enter compensation band name'
          })}
        />
      </Form.Item>

      <Form.Item
        label={t('forms.compensationBand.fields.code.label', { defaultValue: 'Code' })}
        name="code"
        rules={[
          {
            required: true,
            message: t('forms.compensationBand.fields.code.validation', {
              defaultValue: 'Please enter compensation band code'
            })
          }
        ]}
      >
        <Input
          placeholder={t('forms.compensationBand.fields.code.placeholder', {
            defaultValue: 'Enter compensation band code'
          })}
        />
      </Form.Item>

      <div className="gba:grid gba:grid-cols-3 gba:gap-4">
        <Form.Item
          label={t('forms.compensationBand.fields.minSalary.label', { defaultValue: 'Minimum Salary' })}
          name="minSalary"
          rules={[
            {
              required: true,
              message: t('forms.compensationBand.fields.minSalary.validation', {
                defaultValue: 'Please enter minimum salary'
              })
            }
          ]}
        >
          <InputNumber
            placeholder={t('forms.compensationBand.fields.minSalary.placeholder', {
              defaultValue: 'Enter minimum salary'
            })}
            min={0}
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item
          label={t('forms.compensationBand.fields.standardSalary.label', { defaultValue: 'Standard Salary' })}
          name="standardSalary"
          rules={[
            {
              required: true,
              message: t('forms.compensationBand.fields.standardSalary.validation', {
                defaultValue: 'Please enter standard salary'
              })
            }
          ]}
        >
          <InputNumber
            placeholder={t('forms.compensationBand.fields.standardSalary.placeholder', {
              defaultValue: 'Enter standard salary'
            })}
            min={0}
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>

        <Form.Item
          label={t('forms.compensationBand.fields.maxSalary.label', { defaultValue: 'Maximum Salary' })}
          name="maxSalary"
          rules={[
            {
              required: true,
              message: t('forms.compensationBand.fields.maxSalary.validation', {
                defaultValue: 'Please enter maximum salary'
              })
            }
          ]}
        >
          <InputNumber
            placeholder={t('forms.compensationBand.fields.maxSalary.placeholder', {
              defaultValue: 'Enter maximum salary'
            })}
            min={0}
            style={{ width: '100%' }}
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          />
        </Form.Item>
      </div>

      <Form.Item
        label={t('forms.compensationBand.fields.currency.label', { defaultValue: 'Currency' })}
        name="currency"
        rules={[
          {
            required: true,
            message: t('forms.compensationBand.fields.currency.validation', { defaultValue: 'Please select currency' })
          }
        ]}
        initialValue="EUR"
      >
        <Select
          placeholder={t('forms.compensationBand.fields.currency.placeholder', { defaultValue: 'Select currency' })}
        >
          {currencies.map(currency => (
            <Select.Option key={currency.value} value={currency.value}>
              {currency.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <div className="gba:flex gba:justify-end gba:gap-2 gba:mt-4">
        <Button onClick={handleCancel}>{t('forms.common.buttons.cancel', { defaultValue: 'Cancel' })}</Button>
        <Button type="primary" onClick={handleSave}>
          {initialValues
            ? t('forms.common.buttons.update', { defaultValue: 'Update' })
            : t('forms.common.buttons.create', { defaultValue: 'Create' })}
        </Button>
      </div>
    </Form>
  )
}

export default CompensationBandForm
