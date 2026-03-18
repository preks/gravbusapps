import React from 'react'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { CostCenter } from '../../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface CostCenterFieldProps {
  index: number
  value?: string
  costCenters: CostCenter[]
  isProcessingFiles: boolean
  onChange: (value: string) => void
}

export const CostCenterField: React.FC<CostCenterFieldProps> = ({
  index,
  value,
  costCenters,
  isProcessingFiles,
  onChange
}) => {
  const matchedCenter = value ? costCenters.find(c => c.id === value) : undefined
  const resolvedValue = matchedCenter
    ? { id: matchedCenter.id, name: matchedCenter.name }
    : undefined

  return (
    <div className="gba:mb-4" data-testid={`cost-center-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`costCenter-${index}`}
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
            key={`costCenter-${index}-${costCenters.length}`}
            allowClear
            name="costCenter"
            disabled={isProcessingFiles}
            data-testid={`cost-center-select-${index}`}
            data={costCenters.map(center => ({
              id: center.id,
              name: center.name
            }))}
            onChange={(val: any) => onChange(val.value as string)}
            label={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
              'Cost Center'
            )}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_request.expense_request_container.current_cost_center_placeholder',
              'Select Cost Center'
            )}
            value={resolvedValue}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
