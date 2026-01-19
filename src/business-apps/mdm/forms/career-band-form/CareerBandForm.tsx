import React, { useEffect } from 'react'
import { Form, Input, Select, InputNumber, Button } from 'antd'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { PayGrade } from '../../apps/compensation-data'
import { useTranslation } from 'react-i18next'

export interface CareerBandFormProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  initialValues?: any
  payGrades: PayGrade[]
  onSubmit?: (values: any) => Promise<void>
}

export const CareerBandForm: React.FC<CareerBandFormProps> = ({
  prefixDataTestId,
  initialValues,
  payGrades,
  onSubmit
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
  const formatCurrency = (amount: number, currency?: { id: string; value: string } | string) => {
    let currencyCode = typeof currency === 'string' ? currency : currency?.id || 'EUR'

    // Extract currency code from format like "Currency:v1:EUR" -> "EUR"
    if (currencyCode.includes(':')) {
      const parts = currencyCode.split(':')
      currencyCode = parts[parts.length - 1] // Get the last part
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2
    }).format(amount)
  }

  return (
    <Form form={form} layout="vertical" className="gba:w-full" data-testid={`${prefixDataTestId}-career-band-form`}>
      <Form.Item
        label={t('forms.careerBand.fields.name.label', { defaultValue: 'Name' })}
        name="name"
        rules={[
          {
            required: true,
            message: t('forms.careerBand.fields.name.validation', { defaultValue: 'Please enter career band name' })
          }
        ]}
      >
        <Input
          placeholder={t('forms.careerBand.fields.name.placeholder', { defaultValue: 'Enter career band name' })}
        />
      </Form.Item>

      <Form.Item
        label={t('forms.careerBand.fields.code.label', { defaultValue: 'Code' })}
        name="code"
        rules={[
          {
            required: true,
            message: t('forms.careerBand.fields.code.validation', { defaultValue: 'Please enter career band code' })
          }
        ]}
      >
        <Input
          placeholder={t('forms.careerBand.fields.code.placeholder', { defaultValue: 'Enter career band code' })}
        />
      </Form.Item>

      <Form.Item
        label={t('forms.careerBand.fields.payGradeId.label', { defaultValue: 'Pay Grade' })}
        name="payGradeId"
        rules={[
          {
            required: true,
            message: t('forms.careerBand.fields.payGradeId.validation', { defaultValue: 'Please select a pay grade' })
          }
        ]}
      >
        <Select placeholder={t('forms.careerBand.fields.payGradeId.placeholder', { defaultValue: 'Select pay grade' })}>
          {payGrades.map(pg => (
            <Select.Option key={pg.id} value={pg.id}>
              {pg.code} - {pg.name} ({formatCurrency(pg.minSalary, pg.currency)} -{' '}
              {formatCurrency(pg.maxSalary, pg.currency)})
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label={t('forms.careerBand.fields.level.label', { defaultValue: 'Level' })}
        name="level"
        rules={[
          {
            required: true,
            message: t('forms.careerBand.fields.level.validation', { defaultValue: 'Please enter career band level' })
          }
        ]}
      >
        <InputNumber
          placeholder={t('forms.careerBand.fields.level.placeholder', { defaultValue: 'Enter level (1-10)' })}
          min={1}
          max={10}
          style={{ width: '100%' }}
        />
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

export default CareerBandForm
