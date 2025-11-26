'use client'

import React from 'react'
import { Card, Alert, Badge, Icon } from '@newwork/nw-design-system'
import { getCurrentActiveUserLocale, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTimeInterventions } from '../hooks/useTimeInterventions'
import { AppActionButton } from '@/components/app-action-button/AppActionButton'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CalendarXIcon, WarningCircleIcon, ArrowsClockwiseIcon } from '@phosphor-icons/react'

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
  const { items, isLoading, error } = useTimeInterventions({
    employeeId,
    accessToken,
    workingHours
  })

  const getReason = (reason: string) => {
    if (reason === 'MISSING_HOURS')
      return getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.missing_hours', 'Missing hours')
    if (reason === 'NO_ATTENDANCE')
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:time_tracking.interventions.no_attendance',
        'No attendance recorded'
      )
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:time_tracking.interventions.absence_with_attendance',
      'Absence and attendance overlap'
    )
  }

  const getBadgeVariant = (reason: string): any => {
    switch (reason) {
      case 'MISSING_HOURS':
        return 'warning'
      case 'NO_ATTENDANCE':
        return 'info'
      case 'ABSENCE_WITH_ATTENDANCE':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getReasonIcon = (reason: string) => {
    switch (reason) {
      case 'MISSING_HOURS':
        return WarningCircleIcon
      case 'NO_ATTENDANCE':
        return CalendarXIcon
      case 'ABSENCE_WITH_ATTENDANCE':
        return ArrowsClockwiseIcon
      default:
        return WarningCircleIcon
    }
  }

  return (
    <Card className="gba:p-4 gba:mt-4" data-testid="time-interventions-card">
      <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
        <div className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.title', 'Days needing intervention')}
        </div>
        {/* Navigation removed as requested */}
      </div>

      {error && (
        <Alert variant="destructive" className="gba:w-full gba:whitespace-normal gba:!inline-block gba:mb-3">
          {error}
        </Alert>
      )}

      <div className="gba:w-full" data-testid="time-interventions-list">
        {isLoading ? (
          <div className="gba:py-3">{getTranslationFromI18nKeyAndLabel('lowcoder:common.loading', 'Loading...')}</div>
        ) : items.length === 0 ? (
          <div className="gba:py-3">
            {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.interventions.empty', 'No issues found')}
          </div>
        ) : (
          <div className="gba:grid gba:grid-cols-1 gba:sm:grid-cols-2 gba:lg:grid-cols-3 gba:gap-3">
            {items.map(item => {
              const IconCmp = getReasonIcon(item.reason)
              const dateText = new Date(item.date).toLocaleDateString(locale, {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric'
              })
              const deficit = Math.max(0, item.plannedMinutes - item.workedMinutes)
              return (
                <Card key={item.date} className="gba:p-3" data-testid={`time-interventions-item-${item.date}`}>
                  <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
                    <div className="gba:flex gba:items-center gba:gap-3">
                      <div className="gba:flex gba:h-9 gba:w-9 gba:items-center gba:justify-center gba:rounded-full gba:bg-muted gba:text-muted-foreground">
                        <Icon icon={IconCmp} />
                      </div>
                      <div className="gba:flex gba:flex-col">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div className="gba:font-medium">{dateText}</div>
                          <Badge
                            variant={getBadgeVariant(item.reason)}
                            data-testid={`time-interventions-reason-${item.date}`}
                          >
                            {getReason(item.reason)}
                          </Badge>
                        </div>
                        <div className="gba:text-sm gba:text-muted-foreground">
                          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.planned', 'Planned')}{' '}
                          {formatHm(item.plannedMinutes)} •{' '}
                          {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.worked', 'Worked')}{' '}
                          {formatHm(item.workedMinutes)}
                          {deficit > 0 ? ` • -${formatHm(deficit)}` : ''}
                        </div>
                      </div>
                    </div>
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
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

export default InterventionsTable
