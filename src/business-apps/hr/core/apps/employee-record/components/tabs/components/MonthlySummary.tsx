'use client'

import React from 'react'
import { Button, Card, Alert, Icon } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeTrackingData } from '../hooks/useTimeTrackingData'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { UserIcon, ClockIcon, TimerIcon, ListBulletsIcon } from '@phosphor-icons/react'
import { InterventionsTable } from './InterventionsTable'
import { LiveClock } from './LiveClock'
import { PencilIcon } from '@phosphor-icons/react'

interface MonthlySummaryProps {
  employee: any
  employeeId: string
  accessToken: string
  isSelfView: boolean
}

const MonthlySummary: React.FC<MonthlySummaryProps> = ({ employee, employeeId, accessToken, isSelfView }) => {
  const {
    isClockedIn,
    clockInSince,
    isSubmitting,
    error,
    clockIn,
    clockOut,
    todaysWorkedMinutes,
    todaysPlannedMinutes
  } = useTimeTrackingData({ employeeId, accessToken, workingHours: employee?.workingHours?.[0] })

  const formatHm = (minutes: number) => {
    const abs = Math.max(0, Math.floor(minutes))
    const h = Math.floor(abs / 60)
    const m = abs % 60
    return `${h}:${String(m).padStart(2, '0')}`
  }

  return (
    <div data-testid="monthly-summary-container">
      {/* Top grid: Time card, Actions, Right-side info */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-3 gba:gap-4" data-testid="timeclock-top-grid">
        {/* Left column: separate time/date and employee status panels */}
        <div className="gba:flex gba:flex-col gba:gap-4">
          {/* Current time/date */}
          <Card className="gba:p-4" data-testid="timeclock-now-card">
            <LiveClock className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-center" />
          </Card>
        </div>

        {/* Actions */}
        <Card className="gba:p-4" data-testid="timeclock-actions-card">
          <div className="gba:text-center gba:font-semibold gba:mb-3">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
          </div>
          <div className="gba:space-y-2">
            <Button
              className="gba:w-full"
              variant="default"
              disabled={!isSelfView || isClockedIn || isSubmitting}
              onClick={clockIn}
              data-testid="timeclock-clock-in-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_in', 'Clock In')}
            </Button>

            <Button className="gba:w-full" variant="outline" disabled data-testid="timeclock-start-break-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.start_break', 'Start Break')}
            </Button>

            <Button className="gba:w-full" variant="outline" disabled data-testid="timeclock-end-break-button">
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.end_break', 'End Break')}
            </Button>

            <Button
              className="gba:w-full"
              variant="default"
              disabled={!isSelfView || !isClockedIn || isSubmitting}
              onClick={clockOut}
              data-testid="timeclock-clock-out-button"
            >
              {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.actions.clock_out', 'Clock Out')}
            </Button>

            <AppAction
              variant="update-secondary"
              data-testid="timeclock-request-correction-button"
              className="gba:!w-full"
              contexts={[
                {
                  context: FlowContextName.employeeAttendanceCorrectionRequest,
                  contextData: { employeeId: employee?.id }
                }
              ]}
              prefixDataTestId="timeclock-request-correction"
              accessToken={accessToken}
            >
              <>
                <Icon icon={PencilIcon} />
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:time_tracking.actions.request_correction',
                  'Request Correction'
                )}
              </>
            </AppAction>

            <AppAction
              variant="update-secondary"
              data-testid="timeclock-request-absence-button"
              className="gba:!w-full"
              contexts={[
                {
                  context: FlowContextName.employeeAbsenceRecord,
                  contextData: {
                    employeeId: employee?.id
                  }
                }
              ]}
              prefixDataTestId="timeclock-request-absence"
              accessToken={accessToken}
            >
              <>
                <Icon icon={PencilIcon} />
                {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.request_absence', 'Request Absence')}
              </>
            </AppAction>
          </div>
        </Card>

        {/* Right column: Employee status */}
        <div className="gba:flex gba:flex-col gba:gap-4" data-testid="timeclock-right-column">
          <Card className="gba:p-4" data-testid="timeclock-employee-card">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-base gba:font-semibold">
              <Icon icon={UserIcon} />
              {employee?.displayName || getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')}
            </div>
            <div
              className="gba:mt-2 gba:flex gba:items-center gba:gap-2 gba:text-base"
              data-testid="timeclock-status-text"
            >
              <Icon icon={ClockIcon} />
              {isClockedIn ? (
                <div className="gba:flex gba:justify-between gba:w-full">
                  <span>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:time_tracking.status.clocked_in_since_label',
                      'Currently clocked in since'
                    )}
                  </span>
                  <span className="gba:font-semibold">{clockInSince}</span>
                </div>
              ) : (
                <span>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.status.not_clocked_in', 'Not clocked in')}
                </span>
              )}
            </div>
            <div
              className="gba:text-base gba:mt-2 gba:flex gba:items-center gba:gap-2"
              data-testid="timeclock-work-hours-today"
            >
              <Icon icon={TimerIcon} />
              <div className="gba:flex gba:justify-between gba:w-full">
                <span>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.work_hours_today', 'Work Hours Today')}
                </span>
                <span className="gba:font-semibold">{formatHm(todaysWorkedMinutes)}</span>
              </div>
            </div>
            <div
              className="gba:text-base gba:mt-2 gba:flex gba:items-center gba:gap-2"
              data-testid="timeclock-work-hours-assigned"
            >
              <Icon icon={ListBulletsIcon} />
              <div className="gba:flex gba:justify-between gba:w-full">
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:time_tracking.work_hours_assigned',
                    'Work Hours Assigned'
                  )}
                </span>
                <span className="gba:font-semibold">{formatHm(todaysPlannedMinutes)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mt-4">
          {error}
        </Alert>
      )}

      {/* Interventions table */}
      <InterventionsTable
        employeeId={employeeId}
        accessToken={accessToken}
        workingHours={employee?.workingHours?.[0]}
      />
    </div>
  )
}

export default MonthlySummary
