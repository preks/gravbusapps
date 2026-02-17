import React from 'react'
import { Popover, PopoverContent, PopoverTrigger, Button, Calendar } from '@newwork/nw-design-system'
import { formatDateToISO } from '@/common/utils/windowUtils'
import { formatDate } from '../../../utils/dateUtils'

interface DateRangeFilterProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  testIdPrefix: string
  emptyLabel: string
  clearLabel: string
}

const fromString = (value: string | null): Date | undefined => {
  if (!value) return undefined
  const dateValue = new Date(value)
  return Number.isNaN(dateValue.getTime()) ? undefined : dateValue
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  from,
  to,
  onChange,
  testIdPrefix,
  emptyLabel,
  clearLabel
}) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:py-3" data-testid={testIdPrefix}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" data-testid={`${testIdPrefix}-trigger`} className="gba:whitespace-normal gba:p-5">
            {from || to ? `${formatDate(from || '')} -> ${formatDate(to || '')}` : emptyLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="gba:p-2">
          <Calendar
            mode="range"
            selected={{ from: fromString(from), to: fromString(to) }}
            onSelect={(range: any) => {
              const nextFrom = formatDateToISO(range?.from || null) as string | null
              const nextTo = formatDateToISO(range?.to || null) as string | null
              onChange(nextFrom, nextTo)
            }}
          />
        </PopoverContent>
      </Popover>
      {(from || to) && (
        <Button
          variant="outline"
          className="gba:align-self-center gba:w-fit"
          onClick={() => onChange(null, null)}
          data-testid={`${testIdPrefix}-clear`}
        >
          {clearLabel}
        </Button>
      )}
    </div>
  )
}

export default DateRangeFilter
