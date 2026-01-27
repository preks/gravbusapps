import React from 'react'
import dayjs from 'dayjs'
import { Button } from '@newwork/nw-design-system'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface CalendarHeaderProps {
  currentDate: dayjs.Dayjs
  setCurrentDate: (date: dayjs.Dayjs) => void
  showToday?: boolean
  showPrevNext?: boolean
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  setCurrentDate,
  showToday = true,
  showPrevNext = true
}) => {
  return (
    <div className="gba:calendar-header gba:flex gba:justify-between gba:items-center gba:p-4 gba:border-b gba:border-border">
      <div className="gba:calendar-month-year gba:font-medium gba:text-lg">
        {(() => {
          const locale = getCurrentActiveUserLocale()
          const dayjsWithLocale = currentDate.locale(locale)
          return dayjsWithLocale.format('MMMM YYYY')
        })()}
      </div>
      <div className="gba:calendar-nav gba:flex gba:gap-2">
        {showPrevNext && (
          <Button
            variant="secondary"
            className="gba:px-3 gba:py-1"
            data-testid="calendar-prev-month"
            onClick={() => setCurrentDate(dayjs(currentDate).subtract(1, 'month'))}
          >
            <LeftOutlined className="gba:mr-1" />
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.previous', 'Previous')}
          </Button>
        )}
        {showToday && (
          <Button
            variant="secondary"
            className="gba:px-3 gba:py-1"
            data-testid="calendar-today"
            onClick={() => setCurrentDate(dayjs())}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.today', 'Today')}
          </Button>
        )}
        {showPrevNext && (
          <Button
            variant="secondary"
            className="gba:px-3 gba:py-1"
            data-testid="calendar-next-month"
            onClick={() => setCurrentDate(dayjs(currentDate).add(1, 'month'))}
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.next', 'Next')}
            <RightOutlined className="gba:ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
