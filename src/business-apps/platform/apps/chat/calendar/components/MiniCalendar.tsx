import React from 'react'
import { useLocale, useTranslation } from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import translations from '../../_i18n'

interface MiniCalendarProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
}

interface MiniCalendarDay {
  date: Date
  isCurrentMonth: boolean
  isSelected: boolean
  isToday: boolean
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function isSameMonth(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth()
}

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getWeekdayLabels(locale: string, weekStartsOnMonday: boolean): string[] {
  const baseSunday = new Date(2024, 0, 7)

  return Array.from({ length: 7 }, (_, index) => {
    const dayOffset = weekStartsOnMonday ? index + 1 : index
    const day = new Date(baseSunday)
    day.setDate(baseSunday.getDate() + dayOffset)

    return new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(day)
  })
}

function getCalendarDays(displayMonth: Date, selectedDate: Date, weekStartsOnMonday: boolean): MiniCalendarDay[] {
  const firstDayOfMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1)
  const startDay = new Date(firstDayOfMonth)
  const dayOfWeek = firstDayOfMonth.getDay()
  const offset = weekStartsOnMonday ? (dayOfWeek + 6) % 7 : dayOfWeek
  startDay.setDate(firstDayOfMonth.getDate() - offset)

  const today = new Date()

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDay)
    date.setDate(startDay.getDate() + index)

    return {
      date,
      isCurrentMonth: isSameMonth(date, displayMonth),
      isSelected: isSameDay(date, selectedDate),
      isToday: isSameDay(date, today)
    }
  })
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onSelectDate }) => {
  const { locale } = useLocale()
  const { t } = useTranslation(translations)
  const baseLocale = React.useMemo(() => locale?.split('-')[0]?.toLowerCase() || 'en', [locale])
  const weekStartsOnMonday = React.useMemo(() => baseLocale === 'de' || baseLocale === 'ro', [baseLocale])
  const [displayMonth, setDisplayMonth] = React.useState(
    () => new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  )

  React.useEffect(() => {
    setDisplayMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [selectedDate])

  const weekdayLabels = React.useMemo(
    () => getWeekdayLabels(baseLocale, weekStartsOnMonday),
    [baseLocale, weekStartsOnMonday]
  )

  const days = React.useMemo(
    () => getCalendarDays(displayMonth, selectedDate, weekStartsOnMonday),
    [displayMonth, selectedDate, weekStartsOnMonday]
  )

  const monthLabel = React.useMemo(
    () =>
      new Intl.DateTimeFormat(baseLocale, {
        month: 'long',
        year: 'numeric'
      }).format(displayMonth),
    [baseLocale, displayMonth]
  )

  const goToPreviousMonth = React.useCallback(() => {
    setDisplayMonth(currentMonth => new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }, [])

  const goToNextMonth = React.useCallback(() => {
    setDisplayMonth(currentMonth => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }, [])

  return (
    <section className="gba:space-y-2">
      <div className="gba:flex gba:items-center gba:justify-between">
        <h4 className="gba:text-[11px] gba:font-semibold gba:text-foreground gba:capitalize">{monthLabel}</h4>
        <div className="gba:flex gba:items-center gba:gap-1">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full hover:gba:bg-muted"
            aria-label={t('calendar-mini-previousMonth')}
            data-testid="calendar-mini-prev-month"
          >
            <CaretLeftIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="gba:flex gba:h-6 gba:w-6 gba:items-center gba:justify-center gba:rounded-full hover:gba:bg-muted"
            aria-label={t('calendar-mini-nextMonth')}
            data-testid="calendar-mini-next-month"
          >
            <CaretRightIcon className="gba:h-3.5 gba:w-3.5" />
          </button>
        </div>
      </div>

      <div className="gba:grid gba:grid-cols-7 gba:gap-y-1 gba:text-center">
        {weekdayLabels.map((label, index) => (
          <div key={`${label}-${index}`} className="gba:text-[10px] gba:font-medium gba:text-muted-foreground">
            {label}
          </div>
        ))}

        {days.map(day => (
          <button
            key={toLocalDateKey(day.date)}
            type="button"
            onClick={() => onSelectDate(day.date)}
            className={`gba:mx-auto gba:flex gba:h-8 gba:w-8 gba:items-center gba:justify-center gba:rounded-full gba:text-xs gba:transition-colors ${
              day.isSelected
                ? 'gba:bg-primary gba:font-semibold gba:text-primary-foreground'
                : day.isToday
                  ? 'gba:bg-muted gba:text-foreground'
                  : day.isCurrentMonth
                    ? 'gba:text-foreground hover:gba:bg-muted/70'
                    : 'gba:text-muted-foreground hover:gba:bg-muted/50'
            }`}
            data-testid={`calendar-mini-day-${toLocalDateKey(day.date)}`}
          >
            {day.date.getDate()}
          </button>
        ))}
      </div>
    </section>
  )
}
