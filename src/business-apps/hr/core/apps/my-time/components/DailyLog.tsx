'use client'

import React from 'react'
import { Button, Card, Alert, Icon } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../../employee-record/components/tabs/hooks/useTimeTrackingData'
import { TimeEntriesTable } from '../../employee-record/components/tabs/components/TimeEntriesTable'
import WidgetGroup, { WidgetItem } from '@/components/widget-group/WidgetGroup'
import { FolderIcon, CurrencyDollarIcon } from '@phosphor-icons/react'

interface DailyLogProps {
  employeeId: string
  accessToken: string
  employee: any
}

const DailyLog: React.FC<DailyLogProps> = ({ employeeId, employee, accessToken }) => {
  const locale = getCurrentActiveUserLocale()
  const {
    currentMonth,
    prevMonth,
    nextMonth,
    entries,
    pageSize,
    setPageSize,
    error,
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes,
    monthlyRequiredMinutes,
    dailyAverageWorkedMinutesUntilYesterday,
    overtimeMinutesUntilYesterday
  } = useTimeTrackingData({
    employeeId,
    accessToken,
    workingHours: employee?.workingHours?.[0]
  })

  const fmt = (m: number) => {
    const hours = Math.floor(Math.abs(m) / 60)
    const sign = m < 0 ? '-' : ''
    return `${sign}${hours}h`
  }
  const fmt1 = (m: number) => {
    const sign = m < 0 ? '-' : ''
    const hours = Math.abs(m) / 60
    const text = hours.toFixed(1)
    return `${sign}${text}h`
  }

  return (
    <div data-testid="time-tracking-history-container">
      <div className="gba:mt-6">
        {(() => {
          const missingMinutes = Math.max(0, monthlyRequiredUntilYesterdayMinutes - monthlyWorkedUntilYesterdayMinutes)
          const widgets: WidgetItem[] = [
            {
              key: 'required-month',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_month',
                'Required this month'
              ),
              value: fmt(monthlyRequiredMinutes),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_month_desc',
                'Total required hours'
              ),
              valueIsString: true,
              // icon + semantic color
              prefix: 'calendar',
              color: 'info'
            },
            {
              key: 'required-until-today',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_until_today',
                'Required until today'
              ),
              value: fmt(monthlyRequiredUntilYesterdayMinutes),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.required_until_today_desc',
                'Target up to yesterday'
              ),
              valueIsString: true,
              prefix: 'calendar',
              color: 'info'
            },
            {
              key: 'worked-until-today',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.worked_until_today',
                'Worked until today'
              ),
              value: fmt(monthlyWorkedUntilYesterdayMinutes),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.worked_until_today_desc',
                'Logged up to yesterday'
              ),
              valueIsString: true,
              prefix: 'time',
              color: 'success'
            },
            {
              key: 'missing-hours',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.missing_vs_required',
                'Missing vs required'
              ),
              value: fmt(missingMinutes),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.missing_vs_required_desc',
                'Hours needed to reach target'
              ),
              valueIsString: true,
              prefix: 'calendar',
              color: 'warning'
            }
          ]

          return (
            <WidgetGroup
              widgets={widgets}
              data-testid="time-tracking-monthly-summary"
              // Make cards wider (more long) by using 4 columns starting at md
              cardsClassName="gba:md:grid-cols-4 gba:lg:grid-cols-4"
            />
          )
        })()}

        {(() => {
          const secondaryWidgets: WidgetItem[] = [
            {
              key: 'daily-average',
              title: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.daily_average', 'Daily Average'),
              value: fmt1(dailyAverageWorkedMinutesUntilYesterday),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.daily_average_desc',
                'View My Projects'
              ),
              valueIsString: true,
              prefix: <Icon icon={FolderIcon} size="md" />,
              color: 'success'
            },
            {
              key: 'overtime',
              title: getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.overtime', 'Overtime'),
              value: fmt1(overtimeMinutesUntilYesterday),
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.summary.overtime_desc',
                'View Project Dashboard'
              ),
              valueIsString: true,
              prefix: <Icon icon={CurrencyDollarIcon} />,
              color: 'warning'
            }
          ]

          return (
            <WidgetGroup
              widgets={secondaryWidgets}
              data-testid="time-tracking-monthly-secondary"
              cardsClassName="gba:md:grid-cols-2 gba:lg:grid-cols-2"
            />
          )
        })()}
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-4">
          {error}
        </Alert>
      )}

      <Card className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-start gba:mb-3">
          <div className="gba:flex gba:gap-2" data-testid="history-month-selector">
            <Button variant="outline" onClick={prevMonth} data-testid="history-month-selector-prev">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.prev', 'Prev')}
            </Button>
            <div className="gba:self-center">
              {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" onClick={nextMonth} data-testid="history-month-selector-next">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.next', 'Next')}
            </Button>
          </div>
        </div>

        <TimeEntriesTable
          entries={entries}
          locale={locale}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          accessToken={accessToken}
          employeeId={employeeId}
        />
      </Card>
    </div>
  )
}

export default DailyLog
