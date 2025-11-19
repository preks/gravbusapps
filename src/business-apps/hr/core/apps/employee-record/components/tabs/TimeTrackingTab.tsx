'use client'

import React from 'react'
import { Button, Card, Alert } from '@newwork/nw-design-system'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from './hooks/useTimeTrackingData'
import { TimeEntriesTable } from './components/TimeEntriesTable'
import AppActionMenu from '@/components/app-action-menu/AppActionMenu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { PiPencilSimple } from 'react-icons/pi'

interface TimeTrackingTabProps extends BusinessAppContextProps {
  employee: any
  employeeId: string
  isSelfView: boolean
}

const TimeTrackingTab: React.FC<TimeTrackingTabProps> = ({ employee, accessToken, employeeId, isSelfView }) => {
  // Request Correction uses a Flow via AppActionMenu

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
    <div className="gba:time-tracking-tab gba:space-y-6" data-testid="time-tracking-tab-container">
      <div className="gba:flex gba:items-start gba:justify-between" data-testid="time-tracking-header">
        <div>
          <div className="gba:font-bold gba:text-2xl" data-testid="time-tracking-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
          </div>
          <div className="gba:text-muted-foreground gba:text-lg">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:time_tracking.subtitle',
              'Manage attendance and monthly timesheet'
            )}
          </div>
          <div className="gba:text-sm gba:text-muted-foreground gba:mt-2" data-testid="time-tracking-status-text">
            {isClockedIn
              ? getTranslationFromI18nKeyAndLabel(
                  'lowcoder:time_tracking.status.clocked_in_since',
                  'Currently clocked in since {{time}}',
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
          <AppActionMenu
            data-testid="employee-update-employee-attendance-correction-request"
            contextsArray={[FlowContextName.employeeAttendanceCorrectionRequest]}
            externalContextData={{
              employeeId: employeeId
            }}
            prefixDataTestId="employee-attendance-correction-request"
            accessToken={accessToken}
            autoExecuteSingleAction={true}
            deferMainContextRequestsUntilClick={true}
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer">
              <PiPencilSimple />
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:time_tracking.actions.request_correction',
                'Request Correction'
              )}
            </div>
          </AppActionMenu>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block">
          {error}
        </Alert>
      )}
      {/* Monthly summary */}
      <div>
        <div className="gba:text-lg gba:font-semibold gba:mb-2">
          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.summary.title', 'Monthly summary')}
        </div>
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
      {/* deficits card removed */}

      <Card className="gba:p-4">
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

      {/* Request Correction handled by AppActionMenu flow */}
    </div>
  )
}

export default TimeTrackingTab
