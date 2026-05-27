import React from 'react'
import { SelectField } from '@newwork/gravity-ui-catalog'
import { Form } from 'antd'
import { CostCenter } from '../../../types'
import { useExpenseItemTranslation } from '../../../useExpenseItemTranslation'

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
  const { t } = useExpenseItemTranslation()
  const matchedCenter = value ? costCenters.find(c => c.id === value) : undefined
  const resolvedValue = matchedCenter ? { id: matchedCenter.id, name: matchedCenter.name } : undefined

  return (
    <div className="gba:mb-4" data-testid={`cost-center-container-${index}`}>
      <div className="gba:relative">
        <Form.Item
          name={`costCenter-${index}`}
          rules={[
            {
              required: true,
              message: t('expense-item-cost-center-required')
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
            label={t('label-cost-center')}
            placeholder={t('expense-item-cost-center-placeholder')}
            value={resolvedValue}
            required={true}
          />
        </Form.Item>
      </div>
    </div>
  )
}
