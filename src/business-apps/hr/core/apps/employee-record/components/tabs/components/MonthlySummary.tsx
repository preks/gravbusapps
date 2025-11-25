'use client'

import React from 'react'
import { Button, Card, Alert } from '@newwork/nw-design-system'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { TimeEntriesTable } from './TimeEntriesTable'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface MonthlySummaryProps {
  employee: any
  employeeId: string
  accessToken: string
  isSelfView: boolean
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ employee, employeeId, accessToken, isSelfView }) => {
  const locale = getCurrentActiveUserLocale()
  const {
    currentMonth,
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    entries,
    pageSize,
    prevMonth,
    nextMonth,
    setPageSize,
    clockIn,
    clockOut,
    monthlyRequiredMinutes,
    monthlyRequiredUntilYesterdayMinutes,
    monthlyWorkedUntilYesterdayMinutes
  } = useTimeTrackingData({ employeeId, accessToken, workingHours: employee?.workingHours?.[0] })

  // deficits card removed per request
  const fmt = (m: number) => {
    const hours = Math.floor(Math.abs(m) / 60)
    const sign = m < 0 ? '-' : ''
    return `${sign}${hours}h`
  }

  return (
    <div data-testid="monthly-summary-container">
      <div className="gba:flex gba:items-start gba:justify-between" data-testid="time-tracking-header">
        <div>
          <div className="gba:text-lg gba:font-semibold gba:mb-2">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.title', 'Monthly summary')}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mt-2" data-testid="time-tracking-status-text">
            {isClockedIn
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:time_tracking.status.clocked_in_since',
                  `Currently clocked in since ${clockInSince ?? ''}`,
                  {
                    time: clockInSince ?? ''
                  }
                )
              : getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.status.not_clocked_in', 'Not clocked in')}
          </div>
        </div>
        <div className="gba:flex gba:gap-2 gba:items-center">
          <Button
            variant="default"
            disabled={!isSelfView || isClockedIn || isSubmitting}
            onClick={clockIn}
            data-testid="time-tracking-clock-in-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')}
          </Button>
          <Button
            variant="default"
            disabled={!isSelfView || !isClockedIn || isSubmitting}
            onClick={clockOut}
            data-testid="time-tracking-clock-out-button"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_out', 'Clock Out')}
          </Button>
          <AppAction
            variant="update-primary"
            data-testid="employee-update-employee-attendance-correction-request"
            contexts={[
              {
                context: FlowContextName.employeeAttendanceCorrectionRequest,
                contextData: { employeeId: employee?.id }
              }
            ]}
            prefixDataTestId="employee-attendance-correction-request"
            autoExecute={true}
            accessToken={accessToken}
          >
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.actions.request_correction',
              'Request Correction'
            )}
          </AppAction>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mt-4">
          {error}
        </Alert>
      )}

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
              valueIsString: true
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
              valueIsString: true
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
              valueIsString: true
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
              valueIsString: true
            }
          ]

          return <WidgetGroup widgets={widgets} data-testid="time-tracking-monthly-summary" />
        })()}
      </div>

      <Card className="gba:p-4 gba:mt-4">
        <div className="gba:flex gba:items-center gba:justify-start gba:mb-3">
          <div className="gba:flex gba:gap-2" data-testid="time-tracking-month-selector">
            <Button variant="outline" onClick={prevMonth} data-testid="time-tracking-month-selector-prev">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.prev', 'Prev')}
            </Button>
            <div className="gba:self-center">
              {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" onClick={nextMonth} data-testid="time-tracking-month-selector-next">
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

export default MonthlySummary
