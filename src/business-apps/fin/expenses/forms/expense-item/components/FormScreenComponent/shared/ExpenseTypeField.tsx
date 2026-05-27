import React from 'react'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseType } from '../../../types'
import { useExpenseItemTranslation } from '../../../useExpenseItemTranslation'

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
  const { t } = useExpenseItemTranslation()

  return (
    <div className="gba:mb-4" data-testid={`expense-type-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`expenseType-${index}`}
          rules={[
            {
              required: true,
              message: t('expense-item-expense-type-required')
            }
          ]}
          style={{ marginBottom: 0 }}
        >
          <SelectField
            allowClear
            label={t('label-type')}
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
            placeholder={t('expense-item-expense-type-placeholder')}
            value={value || undefined}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
