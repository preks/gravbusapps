import React from 'react'
import { InputField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { CustomField } from '../../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
  if (!expenseTypeId || !customFields[expenseTypeId] || customFields[expenseTypeId].length === 0) {
    return null
  }

  const customField = customFields[expenseTypeId][0]

  return (
    <div className="gba:mb-4" data-testid={`custom-field-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`customField-${index}`}
          rules={[
            customField?.mandatory
              ? {
                  required: true,
                  message: getTranslationFromI18nKeyAndLabel(
                    'lowcoder:create_expense_type_item.custom_field_default_error_message',
                    'Please enter a value for this field'
                  )
                }
              : {}
          ]}
          style={{ marginBottom: 0 }}
        >
          <InputField
            name={`customField-${index}`}
            data-testid={`custom-field-input-${index}`}
            label={
              customField?.infoValue ||
              getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_type_item.custom_field_default_label',
                'Custom Field'
              )
            }
            value={value}
            onChange={field => {
              form.setFieldsValue({ [`customField-${index}`]: field.value })
              onChange(field.value as string)
            }}
            placeholder={
              getTranslationFromI18nKeyAndLabel('lowcoder:create_expense_type_item.enter', 'Enter') +
              ' ' +
              (customField?.infoValue ||
                getTranslationFromI18nKeyAndLabel(
                  'lowcoder:create_expense_type_item.custom_field_default_label',
                  'Custom Field'
                ))
            }
            required={customField?.mandatory || false}
            disabled={isProcessingFiles || !expenseTypeId}
          />
        </Form.Item>
      </div>
    </div>
  )
}
