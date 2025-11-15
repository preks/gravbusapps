import React from 'react'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseGroup } from '../../../types'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface ExpenseGroupFieldProps {
  index: number
  value?: string
  expenseGroups: ExpenseGroup[]
  isProcessingFiles: boolean
  onChange: (value: string) => void
}

export const ExpenseGroupField: React.FC<ExpenseGroupFieldProps> = ({
  index,
  value,
  expenseGroups,
  isProcessingFiles,
  onChange
}) => {
  return (
    <div className="gba:mb-4" data-testid={`expense-group-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`expenseGroup-${index}`}
          rules={[
            {
              required: true,
              message: getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_item.change_expense_item_container.current_expense_group_custom_rule',
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
            disabled={isProcessingFiles}
            name="expenseGroup"
            data-testid={`expense-group-select-${index}`}
            data={
              expenseGroups
                ? expenseGroups.map(group => ({
                    id: group.id,
                    name: getCatalogValue(group)
                  }))
                : []
            }
            onChange={(val: any) => onChange(val.value)}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_item.change_expense_item_container.current_expense_group_placeholder',
              'Select Expense Group'
            )}
            value={value || undefined}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
