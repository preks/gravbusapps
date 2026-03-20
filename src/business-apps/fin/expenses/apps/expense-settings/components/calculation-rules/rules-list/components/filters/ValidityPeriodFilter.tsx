import React from 'react'
import DateRangeFilter from '../../../shared/DateRangeFilter'

interface ValidityPeriodFilterProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  'data-testid'?: string
}

const ValidityPeriodFilter: React.FC<ValidityPeriodFilterProps> = ({
  from,
  to,
  onChange,
  'data-testid': dataTestId
}) => {
  const testIdPrefix = dataTestId || 'validity-period-filter'

  return (
    <DateRangeFilter
      from={from}
      to={to}
      onChange={onChange}
      testIdPrefix={testIdPrefix}
      emptyLabel="Select range"
      clearLabel="Clear"
    />
  )
}

export default ValidityPeriodFilter
