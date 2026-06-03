import React from 'react'
import { Switch } from '@newwork/gravity-ui-catalog'
import { useExpenseItemTranslation } from '../../../useExpenseItemTranslation'

interface ReimbursableFieldProps {
  index: number
  value: boolean
  isProcessingFiles: boolean
  onChange: (value: boolean) => void
}

export const ReimbursableField: React.FC<ReimbursableFieldProps> = ({ index, value, isProcessingFiles, onChange }) => {
  const { t } = useExpenseItemTranslation()
  return (
    <div className="gba:mb-4" data-testid={`reimbursable-container-${index}`}>
      <div style={{ marginBottom: '16px' }}>
        <Switch
          label={t('expense-item-reimbursable')}
          disabled={isProcessingFiles}
          name={'isReimbursable' + index}
          data-testid={`reimbursable-switch-${index}`}
          value={value}
          onChange={checked => onChange(checked.value as boolean)}
        />
      </div>
    </div>
  )
}
