import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { SuccessTimeframe } from '../../utils/timeframe'

interface SuccessTimeframeSelectProps {
  value: SuccessTimeframe
  onChange: (value: SuccessTimeframe) => void
  options: Array<{ value: SuccessTimeframe; label: string }>
  'data-testid'?: string
}

export const SuccessTimeframeSelect: React.FC<SuccessTimeframeSelectProps> = ({
  value,
  onChange,
  options,
  'data-testid': testId = 'success-timeframe-select'
}) => {
  const selectedOption = options.find(option => option.value === value)

  return (
    <Select value={value} onValueChange={nextValue => onChange(nextValue as SuccessTimeframe)}>
      <SelectTrigger className="gba:w-full gba:min-w-48 gba:bg-card" data-testid={testId}>
        <SelectValue placeholder={selectedOption?.label}>{selectedOption?.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map(option => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
