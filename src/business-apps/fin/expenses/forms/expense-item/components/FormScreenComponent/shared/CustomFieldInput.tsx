import React from 'react'
import { InputField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { CustomField } from '../../../types'
import { useExpenseItemTranslation } from '../../../useExpenseItemTranslation'

interface CustomFieldInputProps {
  index: number
  value?: string
  expenseTypeId?: string
  customFields: { [expenseTypeId: string]: CustomField[] }
  isProcessingFiles: boolean
  form: any
  onChange: (value: string) => void
}

export const CustomFieldInput: React.FC<CustomFieldInputProps> = ({
  index,
  value,
  expenseTypeId,
  customFields,
  isProcessingFiles,
  form,
  onChange
}) => {
  const { t } = useExpenseItemTranslation()

  if (!expenseTypeId || !customFields[expenseTypeId] || customFields[expenseTypeId].length === 0) {
    return null
  }

  const customField = customFields[expenseTypeId][0]
  const customFieldLabel = customField?.infoValue || t('expense-item-custom-field-label')

  return (
    <div className="gba:mb-4" data-testid={`custom-field-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`customField-${index}`}
          rules={[
            customField?.mandatory
              ? {
                  required: true,
                  message: t('expense-item-custom-field-error')
                }
              : {}
          ]}
          style={{ marginBottom: 0 }}
        >
          <InputField
            name={`customField-${index}`}
            data-testid={`custom-field-input-${index}`}
            label={customFieldLabel}
            value={value}
            onChange={field => {
              form.setFieldsValue({ [`customField-${index}`]: field.value })
              onChange(field.value as string)
            }}
            placeholder={`${t('expense-item-enter')} ${customFieldLabel}`}
            required={customField?.mandatory || false}
            disabled={isProcessingFiles || !expenseTypeId}
          />
        </Form.Item>
      </div>
    </div>
  )
}
