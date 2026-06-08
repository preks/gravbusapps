import React, { useCallback } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import type { MarketingActivity } from '@/common/data/customer/queries/campaignDashboardQueries'
import dayjs from 'dayjs'

export interface CalendarDay {
  date: dayjs.Dayjs
  activities: MarketingActivity[]
  isCurrentMonth: boolean
}

interface MarketingActivitiesCalendarProps {
  currentMonth: dayjs.Dayjs
  calendarDays: CalendarDay[]
  onMonthChange: (month: dayjs.Dayjs) => void
  onDayClick: (day: CalendarDay) => void
  t: (key: string, args?: any) => string
}

const activityDotClasses: Record<MarketingActivity['type'], string> = {
  event: 'gba:bg-success',
  content: 'gba:bg-info'
}

const getActivityTypeCount = (day: CalendarDay, type: MarketingActivity['type']) =>
  day.activities.filter(activity => activity.type === type).length

export const MarketingActivitiesCalendar: React.FC<MarketingActivitiesCalendarProps> = ({
  currentMonth,
  calendarDays,
  onMonthChange,
  onDayClick,
  t
}) => {
  const weekDayHeaders = [
    t('dashboard-activities-weekday-sun'),
    t('dashboard-activities-weekday-mon'),
    t('dashboard-activities-weekday-tue'),
    t('dashboard-activities-weekday-wed'),
    t('dashboard-activities-weekday-thu'),
    t('dashboard-activities-weekday-fri'),
    t('dashboard-activities-weekday-sat')
  ]

  const handlePreviousMonth = useCallback(() => {
    onMonthChange(currentMonth.subtract(1, 'month'))
  }, [currentMonth, onMonthChange])

  const handleNextMonth = useCallback(() => {
    onMonthChange(currentMonth.add(1, 'month'))
  }, [currentMonth, onMonthChange])

  return (
    <div className="gba:space-y-4">
      <div className="gba:flex gba:items-center gba:justify-between">
        <Button variant="ghost" size="sm" onClick={handlePreviousMonth} data-testid="calendar-prev-month">
          {t('dashboard-activities-prevMonth')}
        </Button>
        <span className="gba:font-medium" data-testid="calendar-current-month">
          {currentMonth.format('MMMM YYYY')}
        </span>
        <Button variant="ghost" size="sm" onClick={handleNextMonth} data-testid="calendar-next-month">
          {t('dashboard-activities-nextMonth')}
        </Button>
      </div>

      <div className="gba:grid gba:grid-cols-7 gba:gap-px gba:bg-muted gba:rounded-lg gba:overflow-hidden">
        {weekDayHeaders.map(dayLabel => (
          <div key={dayLabel} className="gba:bg-card gba:p-2 gba:text-center gba:text-sm gba:font-medium">
            {dayLabel}
          </div>
        ))}
        {calendarDays.map(day => {
          const hasActivities = day.activities.length > 0

          return (
            <button
              key={day.date.format('YYYY-MM-DD')}
              type="button"
              onClick={() => onDayClick(day)}
              disabled={!hasActivities}
              className={`gba:bg-card gba:p-2 gba:min-h-20 gba:text-sm gba:text-left gba:border-0 ${
                hasActivities ? 'gba:cursor-pointer hover:gba:bg-accent' : 'gba:cursor-default'
              } ${day.isCurrentMonth ? '' : 'gba:opacity-40'} ${
                day.date.isSame(dayjs(), 'day') ? 'gba:ring-2 gba:ring-primary gba:ring-inset' : ''
              }`}
              data-testid={`calendar-day-${day.date.format('YYYY-MM-DD')}`}
            >
              <span className="gba:block gba:text-right gba:mb-2">{day.date.date()}</span>
              {hasActivities && (
                <div className="gba:space-y-2">
                  <Badge variant="secondary" data-testid={`calendar-day-count-${day.date.format('YYYY-MM-DD')}`}>
                    {t('dashboard-activities-count', { count: day.activities.length })}
                  </Badge>
                  <div className="gba:flex gba:flex-wrap gba:gap-1">
                    {Object.entries(activityDotClasses).map(([type, className]) => {
                      const count = getActivityTypeCount(day, type as MarketingActivity['type'])
                      return count > 0 ? (
                        <span key={type} className={`gba:h-2 gba:w-2 gba:rounded-full ${className}`} />
                      ) : null
                    })}
                  </div>
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default MarketingActivitiesCalendar
