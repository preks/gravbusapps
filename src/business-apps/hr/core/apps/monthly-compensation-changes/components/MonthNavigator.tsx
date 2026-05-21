import { Button } from '@newwork/nw-design-system'
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from '@phosphor-icons/react'
import { addMonths, startOfMonth, subMonths } from 'date-fns'
import { formatMonthYear } from '../utils/formatUtils'

interface MonthNavigatorProps {
  readonly selectedDate: Date
  readonly onChange: (d: Date) => void
  readonly t: (key: string) => string
  readonly locale: string
}

export function MonthNavigator({ selectedDate, onChange, t, locale }: MonthNavigatorProps) {
  const now = new Date()
  const isCurrentMonth = selectedDate.getFullYear() === now.getFullYear() && selectedDate.getMonth() === now.getMonth()

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(subMonths(selectedDate, 1))}
        aria-label={t('month-nav-previous')}
      >
        <ArrowLeftIcon className="gba:size-4" />
      </Button>
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:rounded-md gba:border gba:border-border gba:bg-background gba:min-w-40 gba:justify-center">
        <CalendarIcon className="gba:size-4 gba:text-muted-foreground" />
        <span className="gba:text-sm gba:font-medium">{formatMonthYear(selectedDate, locale)}</span>
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(addMonths(selectedDate, 1))}
        aria-label={t('month-nav-next')}
        disabled={isCurrentMonth}
      >
        <ArrowRightIcon className="gba:size-4" />
      </Button>
      {!isCurrentMonth && (
        <Button variant="outline" size="sm" onClick={() => onChange(startOfMonth(new Date()))}>
          {t('month-nav-today')}
        </Button>
      )}
    </div>
  )
}
