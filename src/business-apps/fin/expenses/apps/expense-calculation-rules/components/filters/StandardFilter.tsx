import React from 'react'
import { Checkbox } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface StandardFilterProps {
  value: { true: boolean; false: boolean }
  onChange: (value: { true: boolean; false: boolean }) => void
  'data-testid'?: string
}

const StandardFilter: React.FC<StandardFilterProps> = ({ value, onChange, 'data-testid': dataTestId }) => {
  const handleChange = (key: 'true' | 'false') => (checked: boolean | 'indeterminate') => {
    const bool = checked === true
    const next = { ...value, [key]: bool } as { true: boolean; false: boolean }
    onChange(next)
  }

  return (
    <div className="gba:flex gba:flex-col gba:gap-3 gba:py-3" data-testid={dataTestId || 'standard-filter'}>
      <div className="gba:flex gba:items-center gba:gap-4">
        <Checkbox
          checked={value.true}
          onCheckedChange={handleChange('true')}
          data-testid={(dataTestId || 'standard-filter') + '-true'}
        />
        <span className="gba:text-sm">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.true_label',
            'True'
          )}
        </span>
      </div>
      <div className="gba:flex gba:items-center gba:gap-4">
        <Checkbox
          checked={value.false}
          onCheckedChange={handleChange('false')}
          data-testid={(dataTestId || 'standard-filter') + '-false'}
        />
        <span className="gba:text-sm">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_config_calculation_rule_list.expense_calculation_rule_filter.false_label',
            'False'
          )}
        </span>
      </div>
    </div>
  )
}

export default StandardFilter
