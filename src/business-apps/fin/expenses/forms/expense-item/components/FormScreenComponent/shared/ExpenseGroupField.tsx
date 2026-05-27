import React from 'react'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { ExpenseGroup } from '../../../types'
import { getCatalogValue } from '../../../../../../../../common/utils/windowUtils'
import { useExpenseItemTranslation } from '../../../useExpenseItemTranslation'

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
  const { t } = useExpenseItemTranslation()
  return (
    <div className="gba:mb-4" data-testid={`expense-group-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`expenseGroup-${index}`}
          rules={[
            {
              required: true,
              message: t('expense-item-expense-group-required')
            }
          ]}
          style={{ marginBottom: 0 }}
        >
          <SelectField
            allowClear
            label={t('label-expense-group')}
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
            placeholder={t('expense-item-expense-group-placeholder')}
            value={value || undefined}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
