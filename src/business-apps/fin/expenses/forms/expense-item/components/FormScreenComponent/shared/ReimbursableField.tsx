import React from 'react'
import { Switch } from '@newwork/gravity-ui-catalog'
import { getTranslationFromI18nKeyAndLabel } from '../../../../../../../../common/utils/windowUtils'

interface ReimbursableFieldProps {
  index: number
  value: boolean
  isProcessingFiles: boolean
  onChange: (value: boolean) => void
}

export const ReimbursableField: React.FC<ReimbursableFieldProps> = ({ index, value, isProcessingFiles, onChange }) => {
  return (
    <div className="gba:mb-4" data-testid={`reimbursable-container-${index}`}>
      <div style={{ marginBottom: '16px' }}>
        <Switch
          label={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.is_reimbursable_solo_switch',
            'is reimbursable'
          )}
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
