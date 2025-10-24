import React from 'react'
import { useTranslation } from 'react-i18next'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseType } from '../../../types'

interface ExpenseTypeFieldProps {
  index: number
  value?: string
  expenseGroupId?: string
  expenseTypes: { [classId: string]: ExpenseType[] }
  isProcessingFiles: boolean
  onChange: (value: string) => void
}

export const ExpenseTypeField: React.FC<ExpenseTypeFieldProps> = ({
  index,
  value,
  expenseGroupId,
  expenseTypes,
  isProcessingFiles,
  onChange
}) => {
  const { t } = useTranslation()

  return (
    <div className="gba:mb-4" data-testid={`expense-type-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`expenseType-${index}`}
          rules={[
            {
              required: true,
              message: t(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_custom_rule',
                'Please select an expense type'
              )
            }
          ]}
          style={{ marginBottom: 0 }}
        >
          <SelectField
            allowClear
            label={t(
              'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_label',
              'Expense Type'
            )}
            disabled={isProcessingFiles || !expenseGroupId}
            name="expenseType"
            data-testid={`expense-type-select-${index}`}
            data={
              expenseGroupId && expenseTypes[expenseGroupId]
                ? expenseTypes[expenseGroupId].map(type => ({
                    id: type.id,
                    name: type.name
                  }))
                : []
            }
            onChange={(val: any) => onChange(val.value)}
            placeholder={t(
              'lowcoder:create_expense_item.change_expense_item_container.current_expense_type_placeholder',
              'Select Expense Type'
            )}
            value={value || undefined}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
