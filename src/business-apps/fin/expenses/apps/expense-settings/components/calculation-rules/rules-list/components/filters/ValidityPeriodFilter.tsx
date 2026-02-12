import React from 'react'
import { Popover, PopoverContent, PopoverTrigger, Button, Calendar } from '@newwork/nw-design-system'
import { formatDateToISO } from '@/common/utils/windowUtils'
import { formatDate } from '../../../../../utils/dateUtils'

interface ValidityPeriodFilterProps {
  from: string | null
  to: string | null
  onChange: (from: string | null, to: string | null) => void
  'data-testid'?: string
}

const fromString = (s: string | null): Date | undefined => {
  if (!s) return undefined
  const d = new Date(s)
  return isNaN(d.getTime()) ? undefined : d
}

const ValidityPeriodFilter: React.FC<ValidityPeriodFilterProps> = ({
  from,
  to,
  onChange,
  'data-testid': dataTestId
}) => {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="gba:flex gba:flex-col gba:gap-2 gba:py-3" data-testid={dataTestId || 'validity-period-filter'}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            data-testid={(dataTestId || 'validity-period-filter') + '-trigger'}
            className="gba:whitespace-normal gba:p-5"
          >
            {from || to ? `${formatDate(from || '')} → ${formatDate(to || '')}` : 'Select range'}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="gba:p-2">
          <Calendar
            mode="range"
            selected={{ from: fromString(from || null), to: fromString(to || null) }}
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
          data-testid={(dataTestId || 'validity-period-filter') + '-clear'}
        >
          Clear
        </Button>
      )}
    </div>
  )
}

export default ValidityPeriodFilter
