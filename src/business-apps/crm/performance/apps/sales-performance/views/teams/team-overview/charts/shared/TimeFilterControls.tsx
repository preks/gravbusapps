import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { CalendarIcon } from '@phosphor-icons/react'
import { TIME_FILTER_OPTIONS } from '../../../../../utils/timePeriods'
import type { TimeFilter } from '../../../../../types'

interface TimeFilterControlsProps {
  selectedTimeFilter: TimeFilter
  onTimeFilterChange: (timeFilter: TimeFilter) => void
  testIdPrefix: string
}

const COMPACT_TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  month: 'Month',
  quarter: 'Quarter',
  sixMonths: '6 Mo',
  year: 'Year',
  historical: 'Hist.'
}

export const TimeFilterControls: React.FC<TimeFilterControlsProps> = ({
  selectedTimeFilter,
  onTimeFilterChange,
  testIdPrefix
}) => (
  <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
    <CalendarIcon size={16} className="gba:shrink-0 gba:text-muted-foreground" />
    <div className="gba:flex gba:flex-nowrap gba:gap-1" data-testid={`${testIdPrefix}-time-filters`}>
      {TIME_FILTER_OPTIONS.map(option => (
        <Button
          key={option.key}
          variant={selectedTimeFilter === option.key ? 'default' : 'outline'}
          size="sm"
          className="gba:shrink-0 gba:px-2"
          onClick={() => onTimeFilterChange(option.key)}
          data-testid={`${testIdPrefix}-filter-${option.key}`}
        >
          {COMPACT_TIME_FILTER_LABELS[option.key]}
        </Button>
      ))}
    </div>
  </div>
)
