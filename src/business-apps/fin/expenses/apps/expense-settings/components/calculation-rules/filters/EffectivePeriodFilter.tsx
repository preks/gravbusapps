import React from 'react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import DateRangeFilter from '../shared/DateRangeFilter'

interface EffectivePeriodFilterProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  'data-testid'?: string
}

const EffectivePeriodFilter: React.FC<EffectivePeriodFilterProps> = ({
  from,
  to,
  onChange,
  'data-testid': dataTestId
}) => {
  const testIdPrefix = dataTestId || 'effective-period-filter'

  return (
    <DateRangeFilter
      from={from}
      to={to}
      onChange={onChange}
      testIdPrefix={testIdPrefix}
      emptyLabel={getTranslationFromI18nKeyAndLabel('common.selectRange', 'Select range')}
      clearLabel={getTranslationFromI18nKeyAndLabel('common.clear', 'Clear')}
    />
  )
}

export default EffectivePeriodFilter
