'use client'

import React from 'react'
import { Card, Button, Alert } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeInterventions } from '../hooks/useTimeInterventions'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface InterventionsTableProps {
  employeeId: string
  accessToken: string
  workingHours?: {
    sundayHours?: number
    mondayHours?: number
    tuesdayHours?: number
    wednesdayHours?: number
    thursdayHours?: number
    fridayHours?: number
    saturdayHours?: number
  }
}

const formatHm = (minutes: number) => {
  const h = Math.floor(Math.max(0, minutes) / 60)
  const m = Math.max(0, minutes) % 60
  return `${h}:${String(m).padStart(2, '0')}`
}

export const InterventionsTable: React.FC<InterventionsTableProps> = ({ employeeId, accessToken, workingHours }) => {
  const locale = getCurrentActiveUserLocale()
  const { items, isLoading, error, currentMonth, nextMonth, prevMonth } = useTimeInterventions({
    employeeId,
    accessToken,
    workingHours
  })

  return (
    <Card className="gba:p-4 gba:mt-4" data-testid="time-interventions-card">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <div className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.title', 'Days needing intervention')}
        </div>
        <div className="gba:flex gba:gap-2">
          <Button variant="outline" onClick={prevMonth} data-testid="interventions-prev">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.prev', 'Prev')}
          </Button>
          <div className="gba:self-center">
            {currentMonth.toLocaleString(locale, { month: 'long', year: 'numeric' })}
          </div>
          <Button variant="outline" onClick={nextMonth} data-testid="interventions-next">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.common.next', 'Next')}
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-3">
          {error}
        </Alert>
      )}

      <div className="gba:w-full gba:overflow-x-auto" data-testid="time-interventions-table">
        <table className="gba:w-full gba:text-sm">
          <thead>
            <tr className="gba:text-muted-foreground">
              <th className="gba:text-left gba:py-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.date', 'Date')}
              </th>
              <th className="gba:text-left gba:py-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.planned', 'Planned')}
              </th>
              <th className="gba:text-left gba:py-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.worked', 'Worked')}
              </th>
              <th className="gba:text-left gba:py-2">
                {getTranslationFromI18nKeyAndLabel('lowcoder:common.reason', 'Reason')}
              </th>
              <th className="gba:text-left gba:py-2 gba:w-[60px]">
                {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.table.actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="gba:py-3" colSpan={4}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:common.loading', 'Loading...')}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td className="gba:py-3" colSpan={4}>
                  {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.empty', 'No issues found')}
                </td>
              </tr>
            ) : (
              items.map(item => (
                <tr key={item.date} className="gba:border-t gba:border-muted">
                  <td className="gba:py-2">{new Date(item.date).toLocaleDateString(locale)}</td>
                  <td className="gba:py-2">{formatHm(item.plannedMinutes)}</td>
                  <td className="gba:py-2">{formatHm(item.workedMinutes)}</td>
                  <td className="gba:py-2">
                    {item.reason === 'MISSING_HOURS' &&
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.interventions.missing_hours',
                        'Missing hours'
                      )}
                    {item.reason === 'NO_ATTENDANCE' &&
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.interventions.no_attendance',
                        'No attendance recorded'
                      )}
                    {item.reason === 'ABSENCE_WITH_ATTENDANCE' &&
                      getTranslationFromI18nKeyAndLabel(
                        'lowcoder:time_tracking.interventions.absence_with_attendance',
                        'Absence and attendance overlap'
                      )}
                  </td>
                  <td className="gba:py-2">
                    <div className="gba:flex gba:justify-start">
                      <AppActionButton
                        data-testid={`time-interventions-update-button-${item.date}`}
                        size="icon"
                        contextsArray={[FlowContextName.employeeAttendanceCorrectionRequest]}
                        externalContextData={{
                          employeeId,
                          attendanceDateISO: new Date(item.date).toISOString().slice(0, 10),
                          reason: item.reason
                        }}
                        prefixDataTestId="time-interventions-update"
                        accessToken={accessToken}
                        emptyStateBehavior="enable"
                        deferMainContextRequestsUntilClick
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default InterventionsTable
