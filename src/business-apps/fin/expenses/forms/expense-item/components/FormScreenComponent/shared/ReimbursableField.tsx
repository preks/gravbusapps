import React from 'react'
import { useTranslation } from 'react-i18next'
import { Switch } from '@newwork/gravity-ui-catalog'

interface ReimbursableFieldProps {
  index: number
  value: boolean
  isProcessingFiles: boolean
  onChange: (value: boolean) => void
}

export const ReimbursableField: React.FC<ReimbursableFieldProps> = ({ index, value, isProcessingFiles, onChange }) => {
  const { t } = useTranslation()

  return (
    <div className="gba:mb-4" data-testid={`reimbursable-container-${index}`}>
      <div style={{ marginBottom: '16px' }}>
        <Switch
          label={t('lowcoder:create_expense_type_item.is_reimbursable_solo_switch', 'is reimbursable')}
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
